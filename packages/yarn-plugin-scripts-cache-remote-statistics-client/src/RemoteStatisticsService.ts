import { MessageName, StreamReport } from "@yarnpkg/core"
import fetch, { Headers } from "node-fetch"

import {
    Cache,
    CacheEntry,
    Config,
    readBooleanConfigValue,
    readStringConfigValue,
    StatisticsService,
} from "@rgischk/yarn-scripts-cache-api"

const NAME = "remoteStatistics"

/**
 * Whether this cache is disabled. Defaults to false.
 */
const DISABLED_ENVIRONMENT_VARIABLE = "YSC_REMOTE_STATISTICS_DISABLED"
const DISABLED_CONFIG_FIELD = "statisticsDisabled"
const DISABLED_DEFAULT_VALUE = false

/**
 * The host of the remote statistics service to use. Note: If the host is not configured, this statistics service will be disabled.
 * Example: http://localhost:3000
 */
const HOST_ENVIRONMENT_VARIABLE = "YSC_REMOTE_STATISTICS_HOST"
const HOST_CONFIG_FIELD = "host"

/**
 * Whether verbose output should be generated. This is useful for analysing errors. Defaults to false.
 */
const VERBOSE_ENVIRONMENT_VARIABLE = "YSC_REMOTE_STATISTICS_VERBOSE"
const VERBOSE_RETRIES_CONFIG_FIELD = "verbose"
const VERBOSE_RETRIES_DEFAULT_VALUE = false

export class RemoteStatisticsService implements StatisticsService {
    config: Config
    streamReport: StreamReport

    constructor(config: Config, streamReport: StreamReport) {
        this.config = config
        this.streamReport = streamReport
    }

    async recordCacheHit(
        cacheEntry: CacheEntry,
        cache: Cache,
        usedAt: number,
        usedBy: string,
    ): Promise<void> {
        const statisticsEntry: StatisticsEntry = {
            topLevelWorkspaceLocator: cacheEntry.key.topLevelWorkspaceLocator,
            workspaceLocator: cacheEntry.key.workspaceLocator,
            script: cacheEntry.key.script,
            scriptName: cacheEntry.stats?.scriptName ?? "unknown",
            createdAt: cacheEntry.value.createdAt,
            createdBy: cacheEntry.value.createdBy,
            scriptExecutionTime: cacheEntry.stats?.scriptExecutionTime ?? 0,
            usedAt,
            usedBy,
            cacheName: cache.name,
        }
        const disabled = this.getDisabled()
        const host = this.getHost()

        if (disabled || !host) {
            return
        }

        const verbose = this.getVerbose()
        const url = `${host}/api/recordCacheHit`
        const headers = new Headers({ ["content-type"]: "application/json" })

        if (verbose) {
            this.streamReport.reportInfo(
                MessageName.UNNAMED,
                `Recording cache hit: ${JSON.stringify(statisticsEntry)}`,
            )
        }

        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify(statisticsEntry),
            })

            if (verbose) {
                if (response.ok) {
                    this.streamReport.reportInfo(
                        MessageName.UNNAMED,
                        "Recorded cache hit successfully!",
                    )
                } else {
                    this.streamReport.reportErrorOnce(
                        MessageName.UNNAMED,
                        `Error while recording cache hit: Status ${response.status} - ${response.statusText} Body: ${await response.text()}`,
                    )
                }
            }
        } catch (error) {
            if (verbose) {
                this.streamReport.reportErrorOnce(
                    MessageName.UNNAMED,
                    `Error while recording cache hit. URL: ${url}`,
                )
                this.streamReport.reportExceptionOnce(error as Error)
            }
        }
    }

    private getDisabled() {
        return readBooleanConfigValue(
            this.config,
            NAME,
            DISABLED_ENVIRONMENT_VARIABLE,
            DISABLED_CONFIG_FIELD,
            DISABLED_DEFAULT_VALUE,
        )
    }

    private getHost() {
        return readStringConfigValue(
            this.config,
            NAME,
            HOST_ENVIRONMENT_VARIABLE,
            HOST_CONFIG_FIELD,
            undefined,
        )
    }

    private getVerbose() {
        return readBooleanConfigValue(
            this.config,
            NAME,
            VERBOSE_ENVIRONMENT_VARIABLE,
            VERBOSE_RETRIES_CONFIG_FIELD,
            VERBOSE_RETRIES_DEFAULT_VALUE,
        )
    }
}

type StatisticsEntry = {
    topLevelWorkspaceLocator: string
    workspaceLocator: string
    script: string
    scriptName: string
    createdAt: number
    createdBy: string
    scriptExecutionTime: number
    usedAt: number
    usedBy: string
    cacheName: string
}
