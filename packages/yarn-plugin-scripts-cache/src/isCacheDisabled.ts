import {Config} from "@rgischk/yarn-scripts-cache-api"

export const YSC_DISABLED = "YSC_DISABLED"

export function isCacheDisabled(config: Config) {
    const environmentVariableValue = process.env[YSC_DISABLED]
    if (typeof environmentVariableValue === "string") {
        return environmentVariableValue === "true"
    }
    return config.cacheDisabled || false
}
