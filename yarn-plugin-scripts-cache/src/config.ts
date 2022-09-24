import {MessageName, StreamReport} from "@yarnpkg/core";
import {PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib";

export const CONFIG_FILE_NAME = ".yarn-scripts-cache-rc.json"

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
}

export type CacheUsage = "enabled" /* default */ | "disabled" | "update-cache-only" | "update-script-execution-result-only"

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

function isValidConfig(config: any, streamReport: StreamReport): config is Config {
    if (typeof config !== "object") {
        streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config is not an object!`)
        return false
    }

    if (!Array.isArray(config.scriptsToCache)) {
        streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache is not an array!`)
        return false
    }
    if (config.scriptsToCache.find((item: any) => typeof item !== "object") !== undefined) {
        streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache should only contain objects!`)
        return false
    }
    if (config.scriptsToCache.find((item: any) => !isValidScriptToCache(item, streamReport)) !== undefined) {
        return false
    }

    if (config.remoteCache) {
        if (typeof config.remoteCache !== "string") {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.remoteCache should be a string!`)
            return false
        }
        if (!isValidUrl(config.remoteCache)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.remoteCache should be a valid URLs!`)
            return false
        }
    }

    if (config.cacheUsage) {
        if (!isValidCacheUsage(config.cacheUsage)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.cacheUsage is not a valid value!`)
            return false
        }
    }
    if (config.localCacheUsage) {
        if (!isValidCacheUsage(config.localCacheUsage)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.localCacheUsage is not a valid value!`)
            return false
        }
    }
    if (config.remoteCacheUsage) {
        if (!isValidCacheUsage(config.remoteCacheUsage)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.remoteCacheUsage is not a valid value!`)
            return false
        }
    }

    return true
}

function isValidCacheUsage(cacheUsage: string) {
    return cacheUsage === "enabled" || cacheUsage === "disabled" || cacheUsage === "update-cache-only" || cacheUsage === "update-script-execution-result-only"
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch (error) {
        return false
    }
}

function isValidScriptToCache(scriptToCache: any, streamReport: StreamReport): boolean {
    if (typeof scriptToCache.scriptName !== "string") {
        streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.scriptName is no string!`)
        return false
    }

    if (scriptToCache.inputIncludes !== undefined && typeof scriptToCache.inputIncludes !== "string") {
        if (!Array.isArray(scriptToCache.inputIncludes)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.inputIncludes for ${scriptToCache.scriptName} is not an array!`)
            return false
        }
        if (scriptToCache.inputIncludes.find((item: any) => typeof item !== "string") !== undefined) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.inputIncludes for ${scriptToCache.scriptName} should only contain strings!`)
            return false
        }
    }

    if (scriptToCache.inputExcludes !== undefined && typeof scriptToCache.inputExcludes !== "string") {
        if (!Array.isArray(scriptToCache.inputExcludes)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.inputExcludes for ${scriptToCache.scriptName} is not an array!`)
            return false
        }
        if (scriptToCache.inputExcludes.find((item: any) => typeof item !== "string") !== undefined) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.inputExcludes for ${scriptToCache.scriptName} should only contain strings!`)
            return false
        }
    }

    if (scriptToCache.outputIncludes !== undefined && typeof scriptToCache.outputIncludes !== "string") {
        if (!Array.isArray(scriptToCache.outputIncludes)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.outputIncludes for ${scriptToCache.scriptName} is not an array!`)
            return false
        }
        if (scriptToCache.outputIncludes.find((item: any) => typeof item !== "string") !== undefined) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.outputIncludes for ${scriptToCache.scriptName} should only contain strings!`)
            return false
        }
    }

    if (scriptToCache.outputExcludes !== undefined && typeof scriptToCache.outputExcludes !== "string") {
        if (!Array.isArray(scriptToCache.outputExcludes)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.outputExcludes for ${scriptToCache.scriptName} is not an array!`)
            return false
        }
        if (scriptToCache.outputExcludes.find((item: any) => typeof item !== "string") !== undefined) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.outputExcludes for ${scriptToCache.scriptName} should only contain strings!`)
            return false
        }
    }

    if (scriptToCache.environmentVariableIncludes !== undefined && typeof scriptToCache.environmentVariableIncludes !== "string") {
        if (!Array.isArray(scriptToCache.environmentVariableIncludes)) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.environmentVariableIncludes for ${scriptToCache.scriptName} is not an array!`)
            return false
        }
        if (scriptToCache.environmentVariableIncludes.find((item: any) => typeof item !== "string") !== undefined) {
            streamReport.reportError(MessageName.UNNAMED, `${CONFIG_FILE_NAME} is not valid: config.scriptsToCache.environmentVariableIncludes for ${scriptToCache.scriptName} should only contain strings!`)
            return false
        }
    }

    return true
}

export async function readConfig(cwd: PortablePath, streamReport: StreamReport): Promise<Config | undefined> {
    const configFile = ppath.join(cwd, toFilename(CONFIG_FILE_NAME))
    if (await xfs.existsPromise(configFile)) {
        const configContent = await xfs.readFilePromise(configFile, "utf-8")
        try {
            const config = JSON.parse(configContent)
            if (isValidConfig(config, streamReport)) {
                return config
            }
        } catch (error) {
            streamReport.reportErrorOnce(MessageName.EXCEPTION, `${CONFIG_FILE_NAME} is not valid:`)
            streamReport.reportExceptionOnce(error as Error)
        }
    }
}