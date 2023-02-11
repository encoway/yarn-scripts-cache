
/**
 * A cache stores and restores script results. Multiple caches can be used to store the same result. When restoring a
 * result, the first cache that was able to provide the result will be used.
 */
export interface Cache {

    /**
     * The name of this cache implementation.
     */
    name: string

    /**
     * The order number of this cache. A lower order number means that this cache is used earlier. Only the first cache
     * result that is found will be used. Fast caches should have a low order number, slow caches should have a higher
     * order number.
     */
    order: number

    /**
     * Saves the given cache entry in this cache instance
     *
     * @param cacheEntry The cache entry to save
     */
    saveCacheEntry(cacheEntry: CacheEntry): Promise<void>

    /**
     * Loads a cache entry from this cache instance. If no cache entry exists for the given key, undefined is returned.
     *
     * @param cacheEntryKey The key to search by
     */
    loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined>
}

/**
 * An entry in the cache. Consists of a key that uniquely identifies this entry, and a value that contains the actual
 * script execution results.
 */
export type CacheEntry = {
    key: CacheEntryKey
    value: CacheEntryValue
}

/**
 * Uniquely identifies a cache entry. When executing a script, the key is generated based on all relevant input
 * parameters for that script. If the script is executed again, the scripts result will be the same if the generated
 * cache entry keys are the same.
 */
export type CacheEntryKey = {
    script: string,
    args: string[],
    environmentVariables: RegexEnvVars
    lockFileChecksum: string | null
    topLevelWorkspaceLocator: string
    workspaceLocator: string
    globFileHashes: GlobFileHashes
    dependencyWorkspacesGlobFileHashes: WorkspaceGlobFileHashes
}

/**
 * Regex instances that are used to match environment variables that are relevant parameters to generate a unique cache
 * entry key.
 */
export type RegexEnvVars = {
    [regex: string]: EnvVars
}
/**
 * Environment variable key-value-pairs (name of the variable and its value).
 */
export type EnvVars = {
    [envVar: string]: string
}
/**
 * Glob instances that are used to match files.
 */
export type GlobFileHashes = {
    [glob: string]: FileHashes
}
/**
 * Files and their hash values.
 */
export type FileHashes = {
    [file: string]: string
}
/**
 * Glob instances that match workspaces. Values are the files within that workspace that are relevant as the input for
 * the current workspace.
 */
export type WorkspaceGlobFileHashes = {
    [workspaceLocator: string]: ScriptFileHashes
}
/**
 * File hashes for script names.
 */
export type ScriptFileHashes = {
    [scriptName: string]: GlobFileHashes
}

/**
 * The value of a cache entry. It contains all the cached information. This consists mostly of the generated script
 * result files. Additionally, some meta information is stored.
 */
export type CacheEntryValue = {
    globFileContents: GlobFileContents
    createdAt: number
    createdBy: string
}

/**
 * Glob instances that match files and their contents.
 */
export type GlobFileContents = {
    [glob: string]: FileContents
}
/**
 * File names and their content.
 */
export type FileContents = {
    [file: string]: string
}
