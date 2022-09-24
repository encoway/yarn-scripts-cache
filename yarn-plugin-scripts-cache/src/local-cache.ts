import {Cache, CacheEntry, CacheEntryKey} from "./cache";
import {PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib";
import {shouldUpdateLocalCache, shouldUpdateScriptExecutionResultFromLocalCache} from "./environment-util";
import {Config} from "./config";

const CACHE_FOLDER_NAME = ".yarn-scripts-cache" // TODO: Allow to configure the location of this folder

export class LocalCache implements Cache {
    cwd: PortablePath
    config: Config

    constructor(cwd: PortablePath, config: Config) {
        this.cwd = cwd
        this.config = config
    }

    async saveCacheEntry(cacheEntry: CacheEntry) {
        if (!shouldUpdateLocalCache(this.config)) {
            return
        }

        const filename = Date.now().toString() + ".json" // TODO: Use better file name
        const fileContent = JSON.stringify(cacheEntry)
        const cacheDir = ppath.join(this.cwd, toFilename(CACHE_FOLDER_NAME))
        await xfs.mkdirPromise(cacheDir, {recursive: true})
        const file = ppath.join(cacheDir, toFilename(filename))
        await xfs.writeFilePromise(file, fileContent)
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        if (!shouldUpdateScriptExecutionResultFromLocalCache(this.config)) {
            return undefined
        }

        const cacheDir = ppath.join(this.cwd, toFilename(CACHE_FOLDER_NAME))
        if (! await xfs.existsPromise(cacheDir)) {
            return undefined
        }
        // TODO: Implement cleanup using maxAge and maxAmount config flags

        // TODO: Implement faster lookup, e.g. by using a hash of the key as the filename, which could then
        //  instantaneously be looked up, instead of walking through the directory.
        const files = await xfs.readdirPromise(cacheDir)
        for (const file of files) {
            const fullFile = ppath.join(cacheDir, file)
            const content = await xfs.readFilePromise(fullFile, "utf8")
            const cacheEntry = JSON.parse(content) as CacheEntry
            if (isSameKey(cacheEntryKey, cacheEntry.key)) {
                return cacheEntry
            }
        }
        return undefined
    }
}

function isSameKey(key1: CacheEntryKey, key2: CacheEntryKey): boolean {
    return JSON.stringify(key1) === JSON.stringify(key2)
}
