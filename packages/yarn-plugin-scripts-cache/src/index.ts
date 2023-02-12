import {Configuration, MessageName, Plugin, StreamReport} from "@yarnpkg/core"

import {WrapScriptExecution, WrapScriptExecutionExtra} from "@rgischk/yarn-scripts-cache-api"

import {readConfig} from "./readConfig"
import {buildCaches} from "./buildCaches"
import {updateScriptExecutionResultFromCache, updateCacheFromScriptExecutionResult} from "./scriptResult"
import {isCacheDisabled} from "./isCacheDisabled"

async function buildReport(extra: WrapScriptExecutionExtra): Promise<StreamReport> {
    const configuration = Configuration.create(extra.cwd);
    return StreamReport.start({
        configuration,
        includeFooter: false,
        stdout: extra.stdout,
    }, async () => {
        /* no-op */
    })
}

const wrapScriptExecution: WrapScriptExecution = async (
    executor,
    project,
    locator,
    scriptName,
    extra
) => {
    const report = await buildReport(extra)
    const config = await readConfig(extra.cwd, report)
    if (!config) {
        return executor
    }

    if (isCacheDisabled(config)) {
        return executor
    }

    const scriptToCache = config.scriptsToCache.find(s => s.scriptName === scriptName)
    if (!scriptToCache) {
        return executor
    }

    const caches = await buildCaches(config, {project, locator, scriptName, extra})
    if (caches.length === 0) {
        report.reportError(MessageName.UNNAMED,
            "Script was configured to be cached but no cache implementation was found! Please make sure to add cache implementations via their own plugin.")
    }

    return async () => {
        const cacheResult = await updateScriptExecutionResultFromCache(project, locator, extra, scriptToCache, report, caches)
        if (cacheResult) {
            const [cacheEntry, cache] = cacheResult
            const createdAt = new Date(cacheEntry.value.createdAt).toUTCString()
            const createdBy = cacheEntry.value.createdBy
            report.reportInfo(MessageName.UNNAMED,
                `Script execution result was restored from ${cache.name} cache! Created ${createdAt} by ${createdBy}`)
            return Promise.resolve(0)
        }

        const result = await executor()

        if (result === 0) {
            await report.startTimerPromise("Updating script execution result cache", async () => {
                await updateCacheFromScriptExecutionResult(project, locator, extra, scriptToCache, report, caches)
            })
        }
        return result
    }
}

const plugin: Plugin = {
    hooks: {
        wrapScriptExecution
    }
}

export default plugin
