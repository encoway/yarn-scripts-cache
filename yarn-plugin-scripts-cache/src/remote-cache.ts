import {Cache, CacheEntry, CacheEntryKey} from "./cache";
import * as URL from "url";
import {shouldUpdateRemoteCache, shouldUpdateScriptExecutionResultFromRemoteCache} from "./environment-util";
import {Config} from "./config";

export class RemoteCache implements Cache {
    url: URL
    config: Config

    constructor(url: URL, config: Config) {
        this.url = url
        this.config = config
    }

    async saveCacheEntry(cacheEntry: CacheEntry) {
        if (!shouldUpdateRemoteCache(this.config)) {
            return
        }

        // TODO: Implement
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        if (!shouldUpdateScriptExecutionResultFromRemoteCache(this.config)) {
            return undefined
        }

        // TODO: Implement
        return undefined
    }
}
