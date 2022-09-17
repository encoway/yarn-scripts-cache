import {Locator, Plugin, Project} from '@yarnpkg/core';
import {Filename, PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib";
import crypto from "crypto"

export type Config = {
    basePath: string
    inputIncludes: string[]
    inputExcludes: string[]
    outputIncludes: string[]
    outputExcludes: string[]
}

export type CacheEntry = {
    key: CacheEntryKey
    value: CacheEntryValue
}

export type CacheEntryKey = {
    // packageHashes: string[]
    fileHashes: FileHashes
}

export type FileHashes = {
    /* file -> hash */
    [file: string]: string
}

export type CacheEntryValue = {
    fileContents: FileContent
}

export type FileContent = {
    /* file -> content */
    [file: string]: string
}

export async function cachePush(cwd: PortablePath, project: Project) {
    const key = await buildCacheEntryKey(cwd, project)
    const value = await createCacheContent(cwd)
    const cacheEntry: CacheEntry = {
        key,
        value
    }
    await saveCacheEntry(cwd, cacheEntry)
}

export async function cachePop(cwd: PortablePath, project: Project): Promise<boolean> {
    const key = await buildCacheEntryKey(cwd, project)
    const cacheEntry = await loadCacheEntry(cwd, key)
    if (cacheEntry) {
        await restoreCacheValue(cwd, cacheEntry.value)
        return true
    } else {
        return false
    }
}

async function buildCacheEntryKey(cwd: PortablePath, project: Project): Promise<CacheEntryKey> {
    const srcDir = ppath.join(cwd, toFilename("src"))
    const files = await readdirRecursivePromise(srcDir)
    const fileHashes: FileHashes = {}
    for (const file of files) {
        const stat = await xfs.statPromise(file)
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

async function saveCacheEntry(cwd: PortablePath, cacheEntry: CacheEntry) {
    const filename = Date.now().toString() + ".json"
    const filecontent = JSON.stringify(cacheEntry)
    const cacheDir = ppath.join(cwd, toFilename("my-cache"))
    const file = ppath.join(cacheDir, toFilename(filename))
    await xfs.writeFilePromise(file, filecontent)
}

async function loadCacheEntry(cwd: PortablePath, cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
    const cacheDir = ppath.join(cwd, toFilename("my-cache"))
    const files = await readdirRecursivePromise(cacheDir)
    for (const file of files) {
        const content = await xfs.readFilePromise(file, "utf8")
        const cacheEntry = JSON.parse(content) as CacheEntry
        if (isSameKey(cacheEntryKey, cacheEntry.key)) {
            return cacheEntry
        }
    }
    return undefined
}

function isSameKey(key1: CacheEntryKey, key2: CacheEntryKey): boolean {
    return JSON.stringify(key1) === JSON.stringify(key2)
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
