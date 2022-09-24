import {Config} from "./config";

export const BASE_ENV_VAR_NAME = "SCRIPT_RESULTS_CACHE"
export const LOCAL_CACHE_ENV_VAR_NAME = BASE_ENV_VAR_NAME + "_LOCAL"
export const REMOTE_CACHE_ENV_VAR_NAME = BASE_ENV_VAR_NAME + "_REMOTE"

export const DISABLED_ENV_VAR_VALUE = "disabled"
export const UPDATE_CACHE_ONLY_ENV_VAR_VALUE = "update-cache-only"
export const UPDATE_SCRIPT_EXECUTION_RESULT_ONLY_ENV_VAR_VALUE = "update-script-execution-result-only"

export function isCacheDisabled(config: Config) {
    const cacheUsage = process.env[BASE_ENV_VAR_NAME] || config.cacheUsage
    return cacheUsage === DISABLED_ENV_VAR_VALUE
}

export function shouldUpdateCache(config: Config) {
    const cacheUsage = process.env[BASE_ENV_VAR_NAME] || config.cacheUsage
    return cacheUsage !== DISABLED_ENV_VAR_VALUE && cacheUsage !== UPDATE_SCRIPT_EXECUTION_RESULT_ONLY_ENV_VAR_VALUE
}

export function shouldUpdateScriptExecutionResult(config: Config) {
    const cacheUsage = process.env[BASE_ENV_VAR_NAME] || config.cacheUsage
    return cacheUsage !== DISABLED_ENV_VAR_VALUE && cacheUsage !== UPDATE_CACHE_ONLY_ENV_VAR_VALUE
}

export function shouldUpdateLocalCache(config: Config) {
    const cacheUsage = process.env[LOCAL_CACHE_ENV_VAR_NAME] || config.localCacheUsage
    return cacheUsage !== DISABLED_ENV_VAR_VALUE && cacheUsage !== UPDATE_SCRIPT_EXECUTION_RESULT_ONLY_ENV_VAR_VALUE
}

export function shouldUpdateScriptExecutionResultFromLocalCache(config: Config) {
    const cacheUsage = process.env[LOCAL_CACHE_ENV_VAR_NAME] || config.localCacheUsage
    return cacheUsage !== DISABLED_ENV_VAR_VALUE && cacheUsage !== UPDATE_CACHE_ONLY_ENV_VAR_VALUE
}

export function shouldUpdateRemoteCache(config: Config) {
    const cacheUsage = process.env[REMOTE_CACHE_ENV_VAR_NAME] || config.remoteCacheUsage
    return cacheUsage !== DISABLED_ENV_VAR_VALUE && cacheUsage !== UPDATE_SCRIPT_EXECUTION_RESULT_ONLY_ENV_VAR_VALUE
}

export function shouldUpdateScriptExecutionResultFromRemoteCache(config: Config) {
    const cacheUsage = process.env[REMOTE_CACHE_ENV_VAR_NAME] || config.remoteCacheUsage
    return cacheUsage !== DISABLED_ENV_VAR_VALUE && cacheUsage !== UPDATE_CACHE_ONLY_ENV_VAR_VALUE
}
