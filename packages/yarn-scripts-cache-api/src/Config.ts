/**
 * The configuration of the yarn-scripts-cache.
 */
export type Config = {
    /**
     * Defines which scripts should be cached.
     */
    scriptsToCache: ScriptToCache[]

    /**
     * Whether the cache should be disabled. Can be overwritten with the environment variable
     * YSC_DISABLED.
     */
    cacheDisabled?: boolean

    /**
     * Whether reading from the cache should be disabled. Can be overwritten with the environment variable
     * YSC_READ_DISABLED.
     */
    cacheReadDisabled?: boolean

    /**
     * Whether writing to the cache should be disabled. Can be overwritten with the environment variable
     * YSC_WRITE_DISABLED.
     */
    cacheWriteDisabled?: boolean

    /**
     * Configuration options for cache implementations.
     */
    cacheConfigs?: {
        [cacheName: string]: any
    }
}

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
    /**
     * One or multiple directory paths to recursively clear before restoring a cache result. Ensures that no previously existing files remain in the
     * directory a cache result is being restored in.
     */
    clearBeforeRestore?: string[] | string
    /**
     * Configures whether workspaces the current workspace is depending on are considered when caching.
     */
    workspaceDependencyConfig?: WorkspaceDependencyConfig
}

/**
 * Configures whether workspaces the current workspace is depending on are considered when caching.
 */
export type WorkspaceDependencyConfig = "ignore-all-workspace-dependencies" | {
    [workspace: string]: SingleWorkspaceDependencyConfig
}

/**
 * Configures whether a specific workspace the current workspace is depending on is considered when caching.
 */
export type SingleWorkspaceDependencyConfig = "ignore-this-workspace-dependency" | {
    /**
     * Script names of the dependent workspace to exclude.
     */
    excludedScripts?: string[] | string
    /**
     * Script names of the dependent workspace to include.
     */
    includedScripts?: string[] | string
}

export function readIntConfigValue<T>(config: Config, pluginName: string, environmentVariableName: string, configFieldName: string, defaultValue: T): number | T {
    const maxAgeEnvironmentValue = process.env[environmentVariableName]
    if (maxAgeEnvironmentValue && !isNaN(parseInt(maxAgeEnvironmentValue))) {
        return parseInt(maxAgeEnvironmentValue)
    }
    if (config.cacheConfigs && config.cacheConfigs[pluginName] && typeof config.cacheConfigs[pluginName][configFieldName] === "number") {
        return config.cacheConfigs[pluginName][configFieldName]
    }
    return defaultValue
}

export function readStringConfigValue<T>(config: Config, pluginName: string, environmentVariableName: string, configFieldName: string, defaultValue: T): string | T {
    const maxAgeEnvironmentValue = process.env[environmentVariableName]
    if (maxAgeEnvironmentValue) {
        return maxAgeEnvironmentValue
    }
    if (config.cacheConfigs && config.cacheConfigs[pluginName] && typeof config.cacheConfigs[pluginName][configFieldName] === "string") {
        return config.cacheConfigs[pluginName][configFieldName]
    }
    return defaultValue
}

export function readBooleanConfigValue(config: Config, pluginName: string, environmentVariableName: string, configFieldName: string, defaultValue: boolean): boolean {
    const maxAgeEnvironmentValue = process.env[environmentVariableName]
    if (maxAgeEnvironmentValue) {
        return maxAgeEnvironmentValue === "true"
    }
    if (config.cacheConfigs && config.cacheConfigs[pluginName] && typeof config.cacheConfigs[pluginName][configFieldName] === "boolean") {
        return config.cacheConfigs[pluginName][configFieldName]
    }
    return defaultValue
}
