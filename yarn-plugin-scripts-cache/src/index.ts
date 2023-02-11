import {Configuration, MessageName, Plugin, StreamReport} from "@yarnpkg/core"

import {WrapScriptExecution, WrapScriptExecutionExtra} from "@rgischk/yarn-scripts-cache-api"

import {readConfig} from "./readConfig"
import {buildCaches} from "./buildCaches"
import {updateScriptExecutionResultFromCache, updateCacheFromScriptExecutionResult} from "./scriptResult"
import {isCacheDisabled, shouldUpdateCache, shouldUpdateScriptExecutionResult} from "./environment-util"

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

    return async () => {
        if (shouldUpdateScriptExecutionResult(config)) {
            const result = await updateScriptExecutionResultFromCache(project, locator, extra, scriptToCache, report, caches)
            if (result) {
                const [cacheEntry, cache] = result
                const createdAt = new Date(cacheEntry.value.createdAt).toUTCString()
                const createdBy = cacheEntry.value.createdBy
                report.reportInfo(MessageName.UNNAMED,
                    `Script execution result was restored from ${cache.name} cache! Created ${createdAt} by ${createdBy}`)
                return Promise.resolve(0)
            }
        }

        const result = await executor()

        if (result === 0 && shouldUpdateCache(config)) {
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
