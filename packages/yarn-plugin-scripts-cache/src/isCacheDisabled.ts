import { Config } from "@rgischk/yarn-scripts-cache-api"

export const DISABLED_ENVIRONMENT_VARIABLE_NAME = "YSC_DISABLED"
export const READ_DISABLED_ENVIRONMENT_VARIABLE_NAME = "YSC_READ_DISABLED"
export const WRITE_DISABLED_ENVIRONMENT_VARIABLE_NAME = "YSC_WRITE_DISABLED"

export function isCacheDisabled(config: Config) {
    return isDisabled(
        config,
        DISABLED_ENVIRONMENT_VARIABLE_NAME,
        "cacheDisabled",
    )
}

export function isCacheReadDisabled(config: Config) {
    return isDisabled(
        config,
        READ_DISABLED_ENVIRONMENT_VARIABLE_NAME,
        "cacheReadDisabled",
    )
}

export function isCacheWriteDisabled(config: Config) {
    return isDisabled(
        config,
        WRITE_DISABLED_ENVIRONMENT_VARIABLE_NAME,
        "cacheWriteDisabled",
    )
}

function isDisabled(
    config: Config,
    environmentVariableName: string,
    configFieldName: keyof Pick<
        Config,
        "cacheDisabled" | "cacheReadDisabled" | "cacheWriteDisabled"
    >,
) {
    const environmentVariableValue = process.env[environmentVariableName]
    if (typeof environmentVariableValue === "string") {
        return environmentVariableValue === "true"
    }
    return config[configFieldName] || false
}
