import {Config} from "@rgischk/yarn-scripts-cache-api"

export const YARN_SCRIPTS_CACHE_DISABLED = "YARN_SCRIPTS_CACHE_DISABLED"

export function isCacheDisabled(config: Config) {
    const environmentVariableValue = process.env[YARN_SCRIPTS_CACHE_DISABLED]
    if (typeof environmentVariableValue === "string") {
        return environmentVariableValue === "true"
    }
    return config.cacheDisabled || false
}
