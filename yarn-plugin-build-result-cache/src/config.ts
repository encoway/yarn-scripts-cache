import {MessageName, StreamReport} from "@yarnpkg/core";
import {PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib";

export type Config = {
    scriptsToCache: string[]
    remoteCaches?: string[]
}

function isValidConfig(config: any, streamReport: StreamReport): config is Config {
    if (typeof config !== "object") {
        streamReport.reportError(MessageName.UNNAMED, "build-result-cache-rc.json is not valid: config is not an object!")
        return false
    }

    if (!Array.isArray(config.scriptsToCache)) {
        streamReport.reportError(MessageName.UNNAMED, "build-result-cache-rc.json is not valid: config.scriptsToCache is not an array!")
        return false
    }
    if (config.scriptsToCache.find((item: any) => typeof item !== "string") !== undefined) {
        streamReport.reportError(MessageName.UNNAMED, "build-result-cache-rc.json is not valid: config.scriptsToCache should only contain strings!")
        return false
    }

    if (config.remoteCaches) {
        if (!Array.isArray(config.remoteCaches)) {
            streamReport.reportError(MessageName.UNNAMED, "build-result-cache-rc.json is not valid: config.remoteCaches is not an array!")
            return false
        }
        if (config.remoteCaches.find((item: any) => typeof item !== "string") !== undefined) {
            streamReport.reportError(MessageName.UNNAMED, "build-result-cache-rc.json is not valid: config.remoteCaches should only contain strings!")
            return false
        }
        if (config.remoteCaches.find((item: string) => !isValidUrl(item)) !== undefined) {
            streamReport.reportError(MessageName.UNNAMED, "build-result-cache-rc.json is not valid: config.remoteCaches should only contain valid URLs!")
            return false
        }
    }

    return true
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch (error) {
        return false
    }
}

export async function readConfig(cwd: PortablePath, streamReport: StreamReport): Promise<Config | undefined> {
    const configFile = ppath.join(cwd, toFilename("build-result-cache-rc.json"))
    if (await xfs.existsPromise(configFile)) {
        const configContent = await xfs.readFilePromise(configFile, "utf-8")
        try {
            const config = JSON.parse(configContent)
            if (isValidConfig(config, streamReport)) {
                return config
            }
        } catch (error) {
            streamReport.reportErrorOnce(MessageName.EXCEPTION, "build-result-cache-rc.json is not valid:")
            streamReport.reportExceptionOnce(error as Error)
        }
    }
}
