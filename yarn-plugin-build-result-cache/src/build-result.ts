import {Locator, MessageName, Project, StreamReport} from '@yarnpkg/core';
import {npath, PortablePath, ppath, xfs} from "@yarnpkg/fslib";
import crypto from "crypto"
import {
    Cache,
    CacheEntry,
    CacheEntryKey,
    CacheEntryValue,
    FileContents,
    FileHashes,
    GlobFileContents,
    GlobFileHashes, ScriptFileHashes, WorkspaceGlobFileHashes
} from "./cache";
import {WrapScriptExecutionExtra} from "./index";
import {CONFIG_FILE_NAME, readConfig, ScriptToCache} from "./config";
import {glob} from "glob";

export async function updateCacheFromBuildResult(project: Project, locator: Locator, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache, streamReport: StreamReport, caches: Cache[]) {
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

export async function updateBuildResultFromCache(project: Project, locator: Locator, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache, streamReport: StreamReport, caches: Cache[]): Promise<boolean> {
    const key = await buildCacheEntryKey(project, locator, extra, scriptToCache, streamReport)
    if (!key) {
        return false
    }
    for (const cache of caches) {
        const cacheEntry = await cache.loadCacheEntry(key)
        if (cacheEntry) {
            await restoreCacheValue(extra.cwd, cacheEntry.value)
            return true
        }
    }
    return false
}

async function buildCacheEntryKey(project: Project, locator: Locator, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache, streamReport: StreamReport): Promise<CacheEntryKey | undefined> {
    const script = extra.script
    const args = extra.args
    const lockFileChecksum = project.lockFileChecksum
    const topLevelWorkspaceLocator = locatorToString(project.topLevelWorkspace.locator)
    const workspaceLocator = locatorToString(locator)
    const globFileHashes = await buildGlobFileHashes(extra.cwd, scriptToCache.inputIncludes, scriptToCache.inputExcludes)
    const dependencyWorkspacesGlobFileHashes = await buildDependencyWorkspacesGlobFileHashes(project, locator, streamReport)

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
        dependencyWorkspacesGlobFileHashes
    }
}

async function buildDependencyWorkspacesGlobFileHashes(project: Project, locator: Locator, streamReport: StreamReport): Promise<WorkspaceGlobFileHashes | undefined> {
    const dependencyWorkspacesGlobFileHashes: WorkspaceGlobFileHashes = {}
    const currentWorkspace = project.getWorkspaceByLocator(locator)
    for (const dependencyWorkspace of currentWorkspace.getRecursiveWorkspaceDependencies()) {
        const locatorString = locatorToString(dependencyWorkspace.locator)
        const config = await readConfig(dependencyWorkspace.cwd, streamReport)
        if (!config) {
            streamReport.reportError(MessageName.UNNAMED, `Did not find a valid ${CONFIG_FILE_NAME} in workspace ${locatorString}. All workspaces you depend on also need to be cachable!`)
            return undefined
        }
        const scriptFileHashes: ScriptFileHashes = {}
        for (const scriptToCache of config.scriptsToCache) {
            scriptFileHashes[scriptToCache.scriptName] = await buildGlobFileHashes(dependencyWorkspace.cwd, scriptToCache.outputIncludes, scriptToCache.outputExcludes)
        }

        dependencyWorkspacesGlobFileHashes[locatorString] = scriptFileHashes
    }
    return dependencyWorkspacesGlobFileHashes
}

async function buildGlobFileHashes(path: PortablePath, includes?: string | string[], excludes?: string | string[]): Promise<GlobFileHashes> {
    const globFileHashes: GlobFileHashes = {}
    for (const inputInclude of toStringArray(includes)) {
        const nativeCwd = npath.fromPortablePath(path)
        const nativeRelativeFiles = glob.sync(inputInclude, {cwd: nativeCwd, ignore: toStringArray(excludes)})
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
        const fileContents: FileContents = {}
        for (const nativeRelativeFile of nativeRelativeFiles) {
            const relativeFile = npath.toPortablePath(nativeRelativeFile)
            const file = ppath.resolve(cwd, relativeFile)
            const stat = await xfs.statPromise(file)
            if (stat.isFile()) {
                fileContents[relativeFile] = await xfs.readFilePromise(file, "base64")
            }
        }
        globFileContents[outputInclude] = fileContents
    }

    return {
        globFileContents
    }
}

async function restoreCacheValue(cwd: PortablePath, value: CacheEntryValue) {
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

function toStringArray(globs?: string[] | string): string[] {
    if (globs === undefined) {
        return []
    } if (typeof globs === "string") {
        return [globs]
    } else {
        return globs
    }
}
