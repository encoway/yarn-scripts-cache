import {
    Configuration,
    MessageName,
    Plugin,
    StreamReport,
    formatUtils,
} from "@yarnpkg/core"

import {
    CacheEntryKey,
    WrapScriptExecution,
    WrapScriptExecutionExtra,
} from "@rgischk/yarn-scripts-cache-api"

import { readConfig } from "./readConfig"
import { buildRegistries } from "./buildRegistries"
import {
    updateScriptExecutionResultFromCache,
    updateCacheFromScriptExecutionResult,
} from "./scriptResult"
import {
    isCacheDisabled,
    isCacheReadDisabled,
    isCacheWriteDisabled,
} from "./isCacheDisabled"
import os from "os"

async function buildReport(
    extra: WrapScriptExecutionExtra,
): Promise<[StreamReport, Configuration]> {
    const configuration = Configuration.create(extra.cwd)
    return StreamReport.start(
        {
            configuration,
            includeFooter: false,
            stdout: extra.stdout,
        },
        async () => {
            /* no-op */
        },
    ).then((report) => [report, configuration])
}

const wrapScriptExecution: WrapScriptExecution = async (
    executor,
    project,
    locator,
    scriptName,
    extra,
) => {
    const [report, reportConfiguration] = await buildReport(extra)
    const config = await readConfig(extra.cwd, report)
    if (!config) {
        return executor
    }

    if (isCacheDisabled(config)) {
        return executor
    }

    const scriptToCache = config.scriptsToCache.find(
        (s) => s.scriptName === scriptName,
    )
    if (!scriptToCache) {
        return executor
    }

    const registries = await buildRegistries(config, {
        project,
        locator,
        scriptName,
        extra,
    })
    if (registries.cacheRegistry.length === 0) {
        report.reportError(
            MessageName.UNNAMED,
            "Script was configured to be cached but no cache implementation was found! Please make sure to add cache implementations via their own plugin.",
        )
    }

    return async () => {
        let originalCacheKey: CacheEntryKey | undefined = undefined
        if (!isCacheReadDisabled(config)) {
            const cacheResult = await updateScriptExecutionResultFromCache(
                project,
                locator,
                extra,
                scriptToCache,
                report,
                registries.cacheRegistry,
            )
            if (cacheResult.type === "SUCCESS") {
                const usedAt = Date.now()
                const usedBy = os.hostname()

                for (const statisticsService of registries.statisticsServiceRegistry) {
                    await statisticsService.recordCacheHit(
                        cacheResult.cacheEntry,
                        cacheResult.cache,
                        usedAt,
                        usedBy,
                    )
                }

                const createdAt = new Date(
                    cacheResult.cacheEntry.value.createdAt,
                ).toUTCString()
                const createdBy = cacheResult.cacheEntry.value.createdBy
                report.reportInfo(
                    MessageName.UNNAMED,
                    `Script execution result was restored from ${cacheResult.cache.name} cache! Created ${createdAt} by ${createdBy}`,
                )
                return Promise.resolve(0)
            } else if (cacheResult.type === "CACHE_MISS") {
                originalCacheKey = cacheResult.key
            }
        }

        const executionStartTime = Date.now()

        const result = await executor()

        const executionEndTime = Date.now()
        const scriptExecutionTime = executionEndTime - executionStartTime

        if (result === 0 && !isCacheWriteDisabled(config)) {
            await reportDuration(
                report,
                reportConfiguration,
                "Updating script execution result cache",
                async () => {
                    await updateCacheFromScriptExecutionResult(
                        project,
                        locator,
                        extra,
                        scriptToCache,
                        originalCacheKey,
                        scriptExecutionTime,
                        report,
                        registries.cacheRegistry,
                    )
                },
            )
        }
        return result
    }
}

/**
 * Similar to report.startTimerPromise(...), but it does not use invisible
 * escape characters to create expandable sections in the Gitlab log. This
 * feature seems to be broken, is annoying and results in information not
 * being properly formatted and sometimes overlooked.
 */
async function reportDuration(
    report: StreamReport,
    reportConfiguration: Configuration,
    what: string,
    callback: () => Promise<void>,
): Promise<void> {
    const start = new Date().getMilliseconds()
    report.reportInfo(null, `┌ ${what}`)
    await callback()
    const end = new Date().getMilliseconds()
    const duration = end - start
    if (duration > 200) {
        report.reportInfo(
            null,
            `└ Completed in ${formatUtils.pretty(reportConfiguration, duration, formatUtils.Type.DURATION)}`,
        )
    } else {
        report.reportInfo(null, "└ Completed")
    }
}

const plugin: Plugin = {
    hooks: {
        wrapScriptExecution,
    },
}

export default plugin
