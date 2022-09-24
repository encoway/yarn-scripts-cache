import {Cache, CacheEntry, CacheEntryKey} from "./cache";
import {PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib";
import {shouldUpdateLocalCache, shouldUpdateScriptExecutionResultFromLocalCache} from "./environment-util";
import {Config} from "./config";
import crypto from "crypto";

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

        const fileContent = JSON.stringify(cacheEntry)
        const cacheDir = this.buildCacheDir()
        await xfs.mkdirPromise(cacheDir, {recursive: true})
        const file = this.buildCacheFile(cacheDir, cacheEntry.key)
        await xfs.writeFilePromise(file, fileContent)
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        if (!shouldUpdateScriptExecutionResultFromLocalCache(this.config)) {
            return undefined
        }

        const cacheDir = this.buildCacheDir()
        if (! await xfs.existsPromise(cacheDir)) {
            return undefined
        }
        // TODO: Implement cleanup using maxAge and maxAmount config flags

        let cacheFile = this.buildCacheFile(cacheDir, cacheEntryKey);
        if (await xfs.existsPromise(cacheFile)) {
            const content = await xfs.readFilePromise(cacheFile, "utf8")
            const cacheEntry = JSON.parse(content) as CacheEntry
            if (isSameKey(cacheEntryKey, cacheEntry.key)) { // Double-check the cache key
                return cacheEntry
            }
        }
        return undefined
    }

    buildCacheFile(cacheDir: PortablePath, cacheEntryKey: CacheEntryKey): PortablePath {
        const hash = crypto.createHash("sha512")
        hash.update(JSON.stringify(cacheEntryKey))
        return ppath.join(cacheDir, toFilename(`${hash.digest("base64url")}.json`))
    }

    buildCacheDir(): PortablePath {
        return ppath.join(this.cwd, toFilename(CACHE_FOLDER_NAME))
    }
}

function isSameKey(key1: CacheEntryKey, key2: CacheEntryKey): boolean {
    return JSON.stringify(key1) === JSON.stringify(key2)
}
