import {Project} from '@yarnpkg/core';
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
    GlobFileHashes
} from "./cache";
import {WrapScriptExecutionExtra} from "./index";
import {ScriptToCache} from "./config";
import {glob} from "glob";

export async function updateCacheFromBuildResult(project: Project, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache, caches: Cache[]) {
    const key = await buildCacheEntryKey(project, extra, scriptToCache)
    const value = await createCacheContent(extra.cwd, scriptToCache)
    const cacheEntry: CacheEntry = {
        key,
        value
    }
    for (const cache of caches) {
        await cache.saveCacheEntry(cacheEntry)
    }
}

export async function updateBuildResultFromCache(project: Project, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache, caches: Cache[]): Promise<boolean> {
    const key = await buildCacheEntryKey(project, extra, scriptToCache)
    for (const cache of caches) {
        const cacheEntry = await cache.loadCacheEntry(key)
        if (cacheEntry) {
            await restoreCacheValue(extra.cwd, cacheEntry.value)
            return true
        }
    }
    return false
}

async function buildCacheEntryKey(project: Project, extra: WrapScriptExecutionExtra, scriptToCache: ScriptToCache): Promise<CacheEntryKey> {
    const script = extra.script
    const args = extra.args
    const lockFileChecksum = project.lockFileChecksum
    const topLevelWorkspaceLocatorHash = project.topLevelWorkspace.locator.locatorHash
    const workspaceLocatorHash = project.tryWorkspaceByCwd(extra.cwd)?.locator.locatorHash

    const globFileHashes: GlobFileHashes = {}
    for (const inputInclude of toStringArray(scriptToCache.inputIncludes)) {
        const nativeCwd = npath.fromPortablePath(extra.cwd)
        const nativeRelativeFiles = glob.sync(inputInclude, {cwd: nativeCwd, ignore: toStringArray(scriptToCache.inputExcludes)})
        const fileHashes: FileHashes = {}
        for (const nativeRelativeFile of nativeRelativeFiles) {
            const relativeFile = npath.toPortablePath(nativeRelativeFile)
            const file = ppath.resolve(extra.cwd, relativeFile)
            const stat = await xfs.statPromise(file)
            if (stat.isFile()) {
                fileHashes[relativeFile] = await hashFileContents(file)
            }
        }
        globFileHashes[inputInclude] = fileHashes
    }

    return {
        script,
        args,
        lockFileChecksum,
        topLevelWorkspaceLocatorHash,
        workspaceLocatorHash,
        globFileHashes
    }
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

function toStringArray(globs?: string[] | string): string[] {
    if (globs === undefined) {
        return []
    } if (typeof globs === "string") {
        return [globs]
    } else {
        return globs
    }
}
