import {Locator, MessageName, Project, StreamReport} from "@yarnpkg/core"
import {npath, PortablePath, ppath, xfs} from "@yarnpkg/fslib"
import crypto from "crypto"
import {glob} from "glob"
import os from "os"

import {
    Cache,
    CacheEntry,
    CacheEntryKey,
    CacheEntryValue, EnvVars,
    FileContents,
    FileHashes,
    GlobFileContents,
    GlobFileHashes,
    RegexEnvVars,
    ScriptFileHashes,
    ScriptToCache,
    SingleWorkspaceDependencyConfig,
    WorkspaceDependencyConfig,
    WorkspaceGlobFileHashes,
    WrapScriptExecutionExtra
} from "@rgischk/yarn-scripts-cache-api"

import { readConfig, } from "./readConfig"

export async function updateCacheFromScriptExecutionResult(project: Project, locator: Locator, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache, streamReport: StreamReport, caches: Cache[]) {
    const key = await buildCacheEntryKey(project, locator, extra, scriptToCache, streamReport)
    if (!key) {
        return
    }
    const value = await createCacheContent(extra.cwd, scriptToCache)
    const cacheEntry: CacheEntry = {
        key,
        value
    }
    for (const cache of caches) {
        await cache.saveCacheEntry(cacheEntry)
    }
}

export async function updateScriptExecutionResultFromCache(project: Project, locator: Locator, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache, streamReport: StreamReport, caches: Cache[]): Promise<[CacheEntry, Cache] | undefined> {
    const key = await buildCacheEntryKey(project, locator, extra, scriptToCache, streamReport)
    if (!key) {
        return undefined
    }
    for (const cache of caches) {
        const cacheEntry = await cache.loadCacheEntry(key)
        if (cacheEntry) {
            await restoreCacheValue(extra.cwd, scriptToCache, cacheEntry.value)
            await updateLowerOrderCaches(cacheEntry, cache, caches)
            return [cacheEntry, cache]
        }
    }
    return undefined
}

async function updateLowerOrderCaches(cacheEntry: CacheEntry, cacheLoadedFrom: Cache, caches: Cache[]) {
    for (const cache of caches) {
        if (cache.order < cacheLoadedFrom.order) {
            await cache.saveCacheEntry(cacheEntry)
        }
    }
}

async function buildCacheEntryKey(project: Project, locator: Locator, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache, streamReport: StreamReport): Promise<CacheEntryKey | undefined> {
    const script = extra.script
    const args = extra.args
    const lockFileChecksum = project.lockFileChecksum
    const topLevelWorkspaceLocator = locatorToString(project.topLevelWorkspace.anchoredLocator)
    const workspaceLocator = locatorToString(locator)
    const globFileHashes = await buildGlobFileHashes(extra.cwd, scriptToCache.inputIncludes, scriptToCache.inputExcludes)
    const dependencyWorkspacesGlobFileHashes = await buildDependencyWorkspacesGlobFileHashes(project, locator, scriptToCache.workspaceDependencyConfig, streamReport)
    const environmentVariables = buildEnvironmentVariables(extra, scriptToCache)

    if (!dependencyWorkspacesGlobFileHashes) {
        return undefined
    }

    return {
        script,
        args,
        lockFileChecksum,
        topLevelWorkspaceLocator,
        workspaceLocator,
        globFileHashes,
        dependencyWorkspacesGlobFileHashes,
        environmentVariables
    }
}

function buildEnvironmentVariables(extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache): RegexEnvVars {
    const regexEnvVars: RegexEnvVars = {}
    for (const envVarRegex of toStringArray(scriptToCache.environmentVariableIncludes)) {
        const envVars: EnvVars = {}
        const regex = new RegExp(envVarRegex)
        for (const [name, value] of Object.entries(extra.env)) {
            if (regex.test(name)) {
                envVars[name] = value
            }
        }
        regexEnvVars[envVarRegex] = envVars
    }
    return regexEnvVars
}

async function buildDependencyWorkspacesGlobFileHashes(project: Project, locator: Locator, workspaceDependencyConfig: WorkspaceDependencyConfig | undefined, streamReport: StreamReport): Promise<WorkspaceGlobFileHashes | undefined> {
    const dependencyWorkspacesGlobFileHashes: WorkspaceGlobFileHashes = {}
    if (workspaceDependencyConfig === "ignore-all-workspace-dependencies") {
        return dependencyWorkspacesGlobFileHashes
    }
    const currentWorkspace = project.getWorkspaceByLocator(locator)
    for (const dependencyWorkspace of currentWorkspace.getRecursiveWorkspaceDependencies()) {
        const locatorString = locatorToString(dependencyWorkspace.anchoredLocator)
        const singleWorkspaceDependencyConfig = findWorkspaceDependencyConfig(locatorString, workspaceDependencyConfig)
        if (singleWorkspaceDependencyConfig === "ignore-this-workspace-dependency") {
            continue
        }
        const config = await readConfig(dependencyWorkspace.cwd, streamReport)
        if (!config) {
            streamReport.reportError(MessageName.UNNAMED, `Did not find a valid yarn-scripts-cache configuration file in workspace ${locatorString}. All workspaces you depend on also need to be cachable!`)
            return undefined
        }
        const scriptFileHashes: ScriptFileHashes = {}
        for (const scriptToCache of config.scriptsToCache) {
            if (isRelevantWorkspaceDependencyScript(scriptToCache.scriptName, singleWorkspaceDependencyConfig)) {
                scriptFileHashes[scriptToCache.scriptName] = await buildGlobFileHashes(dependencyWorkspace.cwd, scriptToCache.outputIncludes, scriptToCache.outputExcludes)
            }
        }

        dependencyWorkspacesGlobFileHashes[locatorString] = scriptFileHashes
    }
    return dependencyWorkspacesGlobFileHashes
}

function findWorkspaceDependencyConfig(workspaceLocatorString: string, workspaceDependencyConfig: WorkspaceDependencyConfig | undefined): SingleWorkspaceDependencyConfig | undefined {
    if (!workspaceDependencyConfig) {
        return undefined
    }
    for (const [key, value] of Object.entries(workspaceDependencyConfig)) {
        if (workspaceLocatorString.startsWith(key)) {
            return value
        }
    }
    return undefined
}

function isRelevantWorkspaceDependencyScript(scriptName: string, singleWorkspaceDependencyConfig: Exclude<SingleWorkspaceDependencyConfig, "ignore-this-workspace-dependency"> | undefined): boolean {
    if (!singleWorkspaceDependencyConfig) {
        return true
    }

    if (singleWorkspaceDependencyConfig.includedScripts !== undefined) {
        const includedScripts = toStringArray(singleWorkspaceDependencyConfig.includedScripts)
        if (!includedScripts.includes(scriptName)) {
            return false
        }
    }

    const excludedScripts = toStringArray(singleWorkspaceDependencyConfig.excludedScripts)
    return !excludedScripts.includes(scriptName);
}

async function buildGlobFileHashes(path: PortablePath, includes?: string | string[], excludes?: string | string[]): Promise<GlobFileHashes> {
    const globFileHashes: GlobFileHashes = {}
    for (const inputInclude of toStringArray(includes)) {
        const nativeCwd = npath.fromPortablePath(path)
        const nativeRelativeFiles = glob.sync(inputInclude, {cwd: nativeCwd, ignore: toStringArray(excludes)})
        // Make sure order is normalized across different operating systems:
        nativeRelativeFiles.sort()
        const fileHashes: FileHashes = {}
        for (const nativeRelativeFile of nativeRelativeFiles) {
            const relativeFile = npath.toPortablePath(nativeRelativeFile)
            const file = ppath.resolve(path, relativeFile)
            const stat = await xfs.statPromise(file)
            if (stat.isFile()) {
                fileHashes[relativeFile] = await hashFileContents(file)
            }
        }
        globFileHashes[inputInclude] = fileHashes
    }
    return globFileHashes
}

async function hashFileContents(file: PortablePath): Promise<string> {
    const hash = crypto.createHash("sha512")
    const content = await xfs.readFilePromise(file, "base64")
    hash.update(content)
    return hash.digest("base64")
}

async function createCacheContent(cwd: PortablePath, scriptToCache: ScriptToCache): Promise<CacheEntryValue> {
    const globFileContents: GlobFileContents = {}
    for (const outputInclude of toStringArray(scriptToCache.outputIncludes)) {
        const nativeCwd = npath.fromPortablePath(cwd)
        const nativeRelativeFiles = glob.sync(outputInclude, {cwd: nativeCwd, ignore: toStringArray(scriptToCache.outputExcludes)})
        // Make sure order is normalized across different operating systems:
        nativeRelativeFiles.sort()
        const fileContents: FileContents = {}
        for (const nativeRelativeFile of nativeRelativeFiles) {
            const relativeFile = npath.toPortablePath(nativeRelativeFile)
            const file = ppath.resolve(cwd, relativeFile)
            const stat = await xfs.statPromise(file)
            if (stat.isFile()) {
                const fileContent = await xfs.readFilePromise(file, "base64")
                fileContents[relativeFile] = fileContent.toString()
            }
        }
        globFileContents[outputInclude] = fileContents
    }

    const createdAt = Date.now()
    const createdBy = os.hostname()

    return {
        globFileContents,
        createdAt,
        createdBy
    }
}

async function restoreCacheValue(cwd: PortablePath, scriptToCache: ScriptToCache, value: CacheEntryValue) {
    for (const clearBeforeRestore of toStringArray(scriptToCache.clearBeforeRestore)) {
        const dir = ppath.join(cwd, clearBeforeRestore as PortablePath)
        await xfs.removePromise(dir, {recursive: true})
    }
    for (const fileContents of Object.values(value.globFileContents)) {
        for (const [relativeFile, content] of Object.entries(fileContents)) {
            const file = ppath.join(cwd, relativeFile as PortablePath)
            const dir = ppath.dirname(file)
            await xfs.mkdirPromise(dir, {recursive: true})
            await xfs.writeFilePromise(file, content, {encoding: "base64"})
        }
    }
}

function locatorToString(locator: Locator): string {
    if (locator.scope) {
        return `${locator.scope}/${locator.name}@${locator.reference}`
    }
    return `${locator.name}@${locator.reference}`
}

function toStringArray(entries?: string[] | string): string[] {
    if (entries === undefined) {
        return []
    } if (typeof entries === "string") {
        return [entries]
    } else {
        return entries
    }
}
