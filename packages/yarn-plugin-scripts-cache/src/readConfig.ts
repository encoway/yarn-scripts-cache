import { MessageName, StreamReport } from "@yarnpkg/core"
import { PortablePath, ppath, xfs } from "@yarnpkg/fslib"
import JSON5 from "json5"

import { Config } from "@rgischk/yarn-scripts-cache-api"

const CONFIG_FILE_NAME_JSON = ".yarn-scripts-cache-rc.json"
const CONFIG_FILE_NAME_JSON5 = ".yarn-scripts-cache-rc.json5"

/**
 * Reads the yarn-scripts-cache config file from the workspace at the given
 * location.
 *
 * @param cwd The location of the workspace to read the config file for
 * @param streamReport The report object to write error messages
 */
export async function readConfig(
    cwd: PortablePath,
    streamReport: StreamReport,
): Promise<Config | undefined> {
    const configFile = await findConfigFile(cwd, streamReport)

    if (configFile) {
        const configContent = await xfs.readFilePromise(
            configFile.path,
            "utf-8",
        )
        try {
            const config = JSON5.parse(configContent.toString())
            if (isValidConfig(config, configFile, streamReport)) {
                return config
            }
        } catch (error) {
            streamReport.reportErrorOnce(
                MessageName.EXCEPTION,
                `${configFile.name} is not valid:`,
            )
            streamReport.reportExceptionOnce(error as Error)
        }
    }
}

type ConfigFile = {
    path: PortablePath
    name: string
}

async function findConfigFile(
    cwd: PortablePath,
    streamReport: StreamReport,
): Promise<ConfigFile | undefined> {
    const configFileJson = ppath.join(cwd, CONFIG_FILE_NAME_JSON)
    const configFileJson5 = ppath.join(cwd, CONFIG_FILE_NAME_JSON5)
    const configFileJsonExists = await xfs.existsPromise(configFileJson)
    const configFileJson5Exists = await xfs.existsPromise(configFileJson5)

    if (configFileJsonExists && configFileJson5Exists) {
        streamReport.reportErrorOnce(
            MessageName.EXCEPTION,
            `Found redundant configuration files, please choose either json or json5 extension!`,
        )
        return undefined
    }

    if (configFileJsonExists || configFileJson5Exists) {
        return {
            path: configFileJsonExists ? configFileJson : configFileJson5,
            name: configFileJsonExists
                ? CONFIG_FILE_NAME_JSON
                : CONFIG_FILE_NAME_JSON5,
        }
    }

    return undefined
}

function isValidConfig(
    config: any,
    configFile: ConfigFile,
    streamReport: StreamReport,
): config is Config {
    if (typeof config !== "object") {
        streamReport.reportError(
            MessageName.UNNAMED,
            `${configFile.name} is not valid: config is not an object!`,
        )
        return false
    }

    if (!Array.isArray(config.scriptsToCache)) {
        streamReport.reportError(
            MessageName.UNNAMED,
            `${configFile.name} is not valid: config.scriptsToCache is not an array!`,
        )
        return false
    }
    if (
        config.scriptsToCache.find((item: any) => typeof item !== "object") !==
        undefined
    ) {
        streamReport.reportError(
            MessageName.UNNAMED,
            `${configFile.name} is not valid: config.scriptsToCache should only contain objects!`,
        )
        return false
    }
    if (
        config.scriptsToCache.find(
            (item: any) =>
                !isValidScriptToCache(item, configFile, streamReport),
        ) !== undefined
    ) {
        return false
    }

    if (
        config.cacheDisabled !== undefined &&
        typeof config.cacheDisabled !== "boolean"
    ) {
        streamReport.reportError(
            MessageName.UNNAMED,
            `${configFile.name} is not valid: config.cacheDisabled should be a boolean!`,
        )
        return false
    }

    if (config.cacheConfigs) {
        if (typeof config.cacheConfigs !== "object") {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.cacheConfigs should be an object!`,
            )
            return false
        }
    }

    return true
}

function isValidScriptToCache(
    scriptToCache: any,
    configFile: ConfigFile,
    streamReport: StreamReport,
): boolean {
    if (typeof scriptToCache.scriptName !== "string") {
        streamReport.reportError(
            MessageName.UNNAMED,
            `${configFile.name} is not valid: config.scriptsToCache.scriptName is no string!`,
        )
        return false
    }

    if (
        scriptToCache.inputIncludes !== undefined &&
        typeof scriptToCache.inputIncludes !== "string"
    ) {
        if (!Array.isArray(scriptToCache.inputIncludes)) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.inputIncludes for ${scriptToCache.scriptName} is not an array!`,
            )
            return false
        }
        if (
            scriptToCache.inputIncludes.find(
                (item: any) => typeof item !== "string",
            ) !== undefined
        ) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.inputIncludes for ${scriptToCache.scriptName} should only contain strings!`,
            )
            return false
        }
    }

    if (
        scriptToCache.inputExcludes !== undefined &&
        typeof scriptToCache.inputExcludes !== "string"
    ) {
        if (!Array.isArray(scriptToCache.inputExcludes)) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.inputExcludes for ${scriptToCache.scriptName} is not an array!`,
            )
            return false
        }
        if (
            scriptToCache.inputExcludes.find(
                (item: any) => typeof item !== "string",
            ) !== undefined
        ) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.inputExcludes for ${scriptToCache.scriptName} should only contain strings!`,
            )
            return false
        }
    }

    if (
        scriptToCache.outputIncludes !== undefined &&
        typeof scriptToCache.outputIncludes !== "string"
    ) {
        if (!Array.isArray(scriptToCache.outputIncludes)) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.outputIncludes for ${scriptToCache.scriptName} is not an array!`,
            )
            return false
        }
        if (
            scriptToCache.outputIncludes.find(
                (item: any) => typeof item !== "string",
            ) !== undefined
        ) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.outputIncludes for ${scriptToCache.scriptName} should only contain strings!`,
            )
            return false
        }
    }

    if (
        scriptToCache.outputExcludes !== undefined &&
        typeof scriptToCache.outputExcludes !== "string"
    ) {
        if (!Array.isArray(scriptToCache.outputExcludes)) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.outputExcludes for ${scriptToCache.scriptName} is not an array!`,
            )
            return false
        }
        if (
            scriptToCache.outputExcludes.find(
                (item: any) => typeof item !== "string",
            ) !== undefined
        ) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.outputExcludes for ${scriptToCache.scriptName} should only contain strings!`,
            )
            return false
        }
    }

    if (
        scriptToCache.environmentVariableIncludes !== undefined &&
        typeof scriptToCache.environmentVariableIncludes !== "string"
    ) {
        if (!Array.isArray(scriptToCache.environmentVariableIncludes)) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.environmentVariableIncludes for ${scriptToCache.scriptName} is not an array!`,
            )
            return false
        }
        if (
            scriptToCache.environmentVariableIncludes.find(
                (item: any) => typeof item !== "string",
            ) !== undefined
        ) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.environmentVariableIncludes for ${scriptToCache.scriptName} should only contain strings!`,
            )
            return false
        }
    }

    if (
        scriptToCache.clearBeforeRestore !== undefined &&
        typeof scriptToCache.clearBeforeRestore !== "string"
    ) {
        if (!Array.isArray(scriptToCache.clearBeforeRestore)) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.clearBeforeRestore for ${scriptToCache.scriptName} is not an array!`,
            )
            return false
        }
        if (
            scriptToCache.clearBeforeRestore.find(
                (item: any) => typeof item !== "string",
            ) !== undefined
        ) {
            streamReport.reportError(
                MessageName.UNNAMED,
                `${configFile.name} is not valid: config.scriptsToCache.clearBeforeRestore for ${scriptToCache.scriptName} should only contain strings!`,
            )
            return false
        }
    }

    return true
}
