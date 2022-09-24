import {Cache, CacheEntry, CacheEntryKey} from "./cache";
import * as URL from "url";

export class RemoteCache implements Cache {
    url: URL

    constructor(url: URL) {
        this.url = url
    }

    async saveCacheEntry(cacheEntry: CacheEntry) {
        // TODO: Implement
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        // TODO: Implement
        return undefined
    }
}
