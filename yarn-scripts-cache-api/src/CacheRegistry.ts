import {Cache} from "./Cache"

/**
 * A registry containing all available caches. Cache implementations can register themselves to make them available.
 */
export type CacheRegistry = Cache[]
