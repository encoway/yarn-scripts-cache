/**
 * The configuration of the yarn-scripts-cache.
 */
export type Config = {
    /**
     * Defines which scripts should be cached.
     */
    scriptsToCache: ScriptToCache[]

    /**
     * Defines remote cache instances.
     */
    remoteCache?: string

    /**
     * Configure how to use the cache. Can be overwritten with the environment variable SCRIPT_RESULTS_CACHE.
     */
    cacheUsage?: CacheUsage
    /**
     * Configure how to use the local cache. Can be overwritten with the environment variable SCRIPT_RESULTS_CACHE_LOCAL.
     * Does not overwrite the more general cacheUsage field.
     */
    localCacheUsage?: CacheUsage
    /**
     * Configure how to use the remote cache. Can be overwritten with the environment variable SCRIPT_RESULTS_CACHE_REMOTE.
     * Does not overwrite the more general cacheUsage field.
     */
    remoteCacheUsage?: CacheUsage

    /**
     * The maximum age of script execution results to store in the local cache in milliseconds.
     * Defaults to a value that is equivalent to 30 days.
     */
    localCacheMaxAge?: number
    /**
     * The maximum amount of script execution results to store in the local cache. Defaults to 1000.
     */
    localCacheMaxAmount?: number
}

export type CacheUsage = "enabled" /* default */ | "disabled" | "update-cache-only" | "update-script-execution-result-only"

/**
 * Defines the name of a script that should be cached and the files that are relevant for that script.
 */
export type ScriptToCache = {
    /**
     * The name of the script to cache, as defined in the package.jsons "scripts"-field.
     */
    scriptName: string
    /**
     * One or multiple globs defining which files should be included in the 'input' files used to check whether two runs are the same.
     * The globs are matched against paths relative to the current working directory.
     */
    inputIncludes?: string[] | string
    /**
     * One or multiple globs defining exceptions from the previous option.
     * The globs are matched against paths relative to the current working directory.
     */
    inputExcludes?: string[] | string
    /**
     * One or multiple globs defining which files should be copied into the cache to be restored on consecutive script executions.
     * The globs are matched against paths relative to the current working directory.
     */
    outputIncludes?: string[] | string
    /**
     * One or multiple globs defining exceptions from the previous option.
     * The globs are matched against paths relative to the current working directory.
     */
    outputExcludes?: string[] | string
    /**
     * One or multiple regular expressions to match against environment variable names that should be checked for changes on consecutive script executions.
     */
    environmentVariableIncludes?: string[] | string
}
