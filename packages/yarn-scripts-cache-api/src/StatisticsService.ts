import { CacheEntry, Cache } from "./Cache"

/**
 * A service to collect statistics about cache usage.
 */
export interface StatisticsService {
    /**
     * Records a cache hit event.
     *
     * @param cacheEntry The cache entry that was hit.
     * @param cache The cache where the entry was found.
     * @param usedAt The timestamp when the cache entry was used.
     * @param usedBy The hostname of the machine that used the cache entry.
     */
    recordCacheHit(
        cacheEntry: CacheEntry,
        cache: Cache,
        usedAt: number,
        usedBy: string,
    ): Promise<void>
}
