
export interface Cache {
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

export type CacheEntry = {
    key: CacheEntryKey
    value: CacheEntryValue
}
export type CacheEntryKey = {
    // TODO: Add environment variables, but only those that are whitelisted via the config file
    script: string,
    args: string[],
    lockFileChecksum: string | null
    topLevelWorkspaceLocator: string
    workspaceLocator?: string
    globFileHashes: GlobFileHashes
    dependencyWorkspacesGlobFileHashes: WorkspaceGlobFileHashes
}
export type GlobFileHashes = {
    [glob: string]: FileHashes
}
export type FileHashes = {
    [file: string]: string
}
export type CacheEntryValue = {
    globFileContents: GlobFileContents
}
export type GlobFileContents = {
    [glob: string]: FileContents
}
export type FileContents = {
    [file: string]: string
}
export type WorkspaceGlobFileHashes = {
    [workspaceLocator: string]: ScriptFileHashes
}
export type ScriptFileHashes = {
    [scriptName: string]: GlobFileHashes
}
