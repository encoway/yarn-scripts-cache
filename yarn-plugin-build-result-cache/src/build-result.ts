import {Project} from '@yarnpkg/core';
import {PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib";
import crypto from "crypto"
import {Cache, CacheEntry, CacheEntryKey, CacheEntryValue, FileContent, FileHashes} from "./cache";

export async function updateCacheFromBuildResult(cwd: PortablePath, project: Project, caches: Cache[]) {
    const key = await buildCacheEntryKey(cwd, project)
    const value = await createCacheContent(cwd)
    const cacheEntry: CacheEntry = {
        key,
        value
    }
    for (const cache of caches) {
        await cache.saveCacheEntry(cacheEntry)
    }
}

export async function updateBuildResultFromCache(cwd: PortablePath, project: Project, caches: Cache[]): Promise<boolean> {
    const key = await buildCacheEntryKey(cwd, project)
    for (const cache of caches) {
        const cacheEntry = await cache.loadCacheEntry(key)
        if (cacheEntry) {
            await restoreCacheValue(cwd, cacheEntry.value)
            return true
        }
    }
    return false
}

async function buildCacheEntryKey(cwd: PortablePath, project: Project): Promise<CacheEntryKey> {
    const srcDir = ppath.join(cwd, toFilename("src"))
    const files = await readdirRecursivePromise(srcDir)
    const fileHashes: FileHashes = {}
    for (const file of files) {
        const relativeFile = ppath.relative(srcDir, file)
        fileHashes[relativeFile] = await hashFileContents(file)
    }
    return {
        fileHashes
    }
}

async function hashFileContents(file: PortablePath): Promise<string> {
    const hash = crypto.createHash("md5")
    const content = await xfs.readFilePromise(file)
    hash.update(content)
    return hash.digest("base64")
}

async function createCacheContent(cwd: PortablePath): Promise<CacheEntryValue> {
    const binDir = ppath.join(cwd, toFilename("bin"))
    const files = await readdirRecursivePromise(binDir)
    const fileContents: FileContent = {}
    for (const file of files) {
        const relativeFile = ppath.relative(binDir, file)
        fileContents[relativeFile] = await xfs.readFilePromise(file, "utf8")
    }
    return {
        fileContents
    }
}

async function restoreCacheValue(cwd: PortablePath, value: CacheEntryValue) {
    const binFile = ppath.join(cwd, toFilename("bin"))
    for (const [relativeFile, content] of Object.entries(value.fileContents)) {
        const file = ppath.join(binFile, relativeFile as PortablePath)
        const dir = ppath.dirname(file)
        await xfs.mkdirPromise(dir, {recursive: true})
        await xfs.writeFilePromise(file, content)
    }
}

async function readdirRecursivePromise(dir: PortablePath): Promise<PortablePath[]> {
    const results: PortablePath[] = []
    const files = await xfs.readdirPromise(dir)
    for (const file of files) {
        const fullFile = ppath.join(dir, file)
        const stat = await xfs.statPromise(fullFile)
        if (stat.isFile()) {
            results.push(fullFile)
        } else if (stat.isDirectory()) {
            results.push(...await readdirRecursivePromise(fullFile))
        }
    }
    return results
}
