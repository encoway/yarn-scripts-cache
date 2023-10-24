import {MessageName, StreamReport} from "@yarnpkg/core"
import fetch, {Headers, Response} from "node-fetch"
import crypto from "crypto"

import {
    Cache,
    CacheEntry,
    CacheEntryKey,
    Config,
    readBooleanConfigValue,
    readIntConfigValue,
    readStringConfigValue
} from "@rgischk/yarn-scripts-cache-api"

const NAME = "nexus"
const ORDER = 100

/**
 * Whether this cache is disabled. Defaults to false.
 */
const CACHE_DISABLED_ENVIRONMENT_VARIABLE = "YSC_NEXUS_DISABLED"
const CACHE_DISABLED_CONFIG_FIELD = "cacheDisabled"
const CACHE_DISABLED_DEFAULT_VALUE = false

/**
 * Whether reading from this cache is disabled. Defaults to false.
 */
const CACHE_READ_DISABLED_ENVIRONMENT_VARIABLE = "YSC_NEXUS_READ_DISABLED"
const CACHE_READ_DISABLED_CONFIG_FIELD = "cacheReadDisabled"
const CACHE_READ_DISABLED_DEFAULT_VALUE = false

/**
 * Whether writing to this cache is disabled. Defaults to false.
 */
const CACHE_WRITE_DISABLED_ENVIRONMENT_VARIABLE = "YSC_NEXUS_WRITE_DISABLED"
const CACHE_WRITE_DISABLED_CONFIG_FIELD = "cacheWriteDisabled"
const CACHE_WRITE_DISABLED_DEFAULT_VALUE = false

/**
 * The host of the nexus instance to use as a cache. Note: If the host is not configured, this cache will be disabled.
 * Example: http://localhost:8081
 */
const HOST_ENVIRONMENT_VARIABLE = "YSC_NEXUS_HOST"
const HOST_CONFIG_FIELD = "host"

/**
 * The name of the nexus repository to store the cache entries in. The repository should be of type "raw (hosted)".
 * Defaults to yarn-scripts-cache.
 */
const REPOSITORY_ENVIRONMENT_VARIABLE = "YSC_NEXUS_REPOSITORY"
const REPOSITORY_CONFIG_FIELD = "repository"
const REPOSITORY_DEFAULT_VALUE = "yarn-scripts-cache"

/**
 * The nexus username used to authenticate when uploading cache entries. Make sure this user is allowed to upload
 * components to the configured repository. Note: If the username is not configured, the cache will not be updated.
 */
const USERNAME_ENVIRONMENT_VARIABLE = "YSC_NEXUS_USERNAME"
const USERNAME_CONFIG_FIELD = "username"

/**
 * The password for the nexus username used to authenticate when uploading cache entries. It is not recommended to store
 * the password in the config file, as the file is not encrypted. Note: If the password is not configured, the cache
 * will not be updated.
 */
const PASSWORD_ENVIRONMENT_VARIABLE = "YSC_NEXUS_PASSWORD"
const PASSWORD_CONFIG_FIELD = "password"

/**
 * The maximum amount of attempts when performing a network request to the nexus instance. Defaults to 3.
 */
const MAX_RETRIES_ENVIRONMENT_VARIABLE = "YSC_NEXUS_MAX_RETRIES"
const MAX_RETRIES_CONFIG_FIELD = "maxRetries"
const MAX_RETRIES_DEFAULT_VALUE = 3

/**
 * Whether verbose output should be generated. This is useful for analysing errors. Defaults to false.
 */
const VERBOSE_ENVIRONMENT_VARIABLE = "YSC_NEXUS_VERBOSE"
const VERBOSE_RETRIES_CONFIG_FIELD = "verbose"
const VERBOSE_RETRIES_DEFAULT_VALUE = false

export class NexusCache implements Cache {
    name: string
    order: number
    config: Config
    report: StreamReport

    constructor(config: Config, report: StreamReport) {
        this.name = NAME
        this.order = ORDER
        this.config = config
        this.report = report
    }

    async saveCacheEntry(cacheEntry: CacheEntry) {
        if (this.getCacheDisabled() || this.getCacheWriteDisabled()) {
            return
        }

        const host = this.getHost()
        const repository = this.getRepository()
        const username = this.getUsername()
        const password = this.getPassword()
        const maxRetries = this.getMaxRetries()
        const verbose = this.getVerbose()

        if (!host || !username || !password) {
            return
        }

        const filename = buildFilename(cacheEntry.key)
        const url = buildUrl(host, repository, filename)
        const uploader = () => uploadJsonAsset(url, username, password, cacheEntry, verbose, this.report)
        await retry(uploader, maxRetries, r => r === "FAILED", verbose, this.report)
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        if (this.getCacheDisabled() || this.getCacheReadDisabled()) {
            return undefined
        }

        const host = this.getHost()
        const repository = this.getRepository()
        const maxRetries = this.getMaxRetries()
        const verbose = this.getVerbose()

        if (!host) {
            if (verbose) {
                this.report.reportWarning(MessageName.UNNAMED, "Nexus cache is disabled because no host was configured!")
            }
            return
        }

        const filename = buildFilename(cacheEntryKey)
        const url = buildUrl(host, repository, filename)
        const downloader = () => downloadJsonAsset<CacheEntry>(url, verbose, this.report)
        const cacheEntry = await retry(downloader, maxRetries, r => r === "FAILED", verbose, this.report)

        if (cacheEntry === "CACHE_MISS" || cacheEntry === "FAILED") {
            return undefined
        }

        if (!cacheEntry.hasOwnProperty("key") || JSON.stringify(cacheEntry.key) !== JSON.stringify(cacheEntryKey)) {
            if (verbose) {
                this.report.reportError(MessageName.UNNAMED, `Remote cache returned invalid cache entry. Key: ${JSON.stringify(cacheEntryKey)} entry: ${JSON.stringify(cacheEntry)}`)
            }
            return undefined
        }

        return cacheEntry
    }

    private getCacheDisabled() {
        return readBooleanConfigValue(this.config, NAME, CACHE_DISABLED_ENVIRONMENT_VARIABLE, CACHE_DISABLED_CONFIG_FIELD, CACHE_DISABLED_DEFAULT_VALUE)
    }

    private getCacheReadDisabled() {
        return readBooleanConfigValue(this.config, NAME, CACHE_READ_DISABLED_ENVIRONMENT_VARIABLE, CACHE_READ_DISABLED_CONFIG_FIELD, CACHE_READ_DISABLED_DEFAULT_VALUE)
    }

    private getCacheWriteDisabled() {
        return readBooleanConfigValue(this.config, NAME, CACHE_WRITE_DISABLED_ENVIRONMENT_VARIABLE, CACHE_WRITE_DISABLED_CONFIG_FIELD, CACHE_WRITE_DISABLED_DEFAULT_VALUE)
    }

    private getHost() {
        return readStringConfigValue(this.config, NAME, HOST_ENVIRONMENT_VARIABLE, HOST_CONFIG_FIELD, undefined)
    }

    private getRepository() {
        return readStringConfigValue(this.config, NAME, REPOSITORY_ENVIRONMENT_VARIABLE, REPOSITORY_CONFIG_FIELD, REPOSITORY_DEFAULT_VALUE)
    }

    private getUsername() {
        return readStringConfigValue(this.config, NAME, USERNAME_ENVIRONMENT_VARIABLE, USERNAME_CONFIG_FIELD, undefined)
    }

    private getPassword() {
        return readStringConfigValue(this.config, NAME, PASSWORD_ENVIRONMENT_VARIABLE, PASSWORD_CONFIG_FIELD, undefined)
    }

    private getMaxRetries() {
        return readIntConfigValue(this.config, NAME, MAX_RETRIES_ENVIRONMENT_VARIABLE, MAX_RETRIES_CONFIG_FIELD, MAX_RETRIES_DEFAULT_VALUE)
    }

    private getVerbose() {
        return readBooleanConfigValue(this.config, NAME, VERBOSE_ENVIRONMENT_VARIABLE, VERBOSE_RETRIES_CONFIG_FIELD, VERBOSE_RETRIES_DEFAULT_VALUE)
    }
}

function buildUrl(host: string, repository: string, filename: string): string {
    return `${host}/content/sites/${repository}/${filename}`
}

function buildFilename(cacheEntryKey: CacheEntryKey): string {
    const hash = crypto.createHash("sha512")
    hash.update(JSON.stringify(cacheEntryKey))
    return `YSC_${hash.digest("base64url")}`
}

function buildHeaders(username: string, password: string): Headers {
    const headers = new Headers()
    headers.append("Authorization", `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`)
    return headers
}

async function retry<T>(work: () => Promise<T>, retries: number, retryFilter: (result: T) => boolean, verbose: boolean, report: StreamReport): Promise<T> {
    let result: T
    for (let i = 0; i < retries; i++) {
        if (i > 0 && verbose) {
            report.reportInfo(MessageName.UNNAMED, `Attempt ${i} failed, retrying...`)
        }
        result = await work()
        if (!retryFilter(result)) {
            return result
        }
    }

    if (verbose) {
        report.reportWarning(MessageName.UNNAMED, `All ${retries} retry attempts failed.`)
    }

    return result!
}

async function exists(url: string, username: string, password: string, verbose: boolean, report: StreamReport): Promise<boolean> {
    try {
        const response = await fetch(url, {
            method: "HEAD",
            headers: buildHeaders(username, password)
        })
        if (verbose) {
            report.reportInfo(MessageName.UNNAMED,
                `HEAD request was performed. URL: ${url} status: ${response.status}`)
        }
        return response.status === 200
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(MessageName.UNNAMED,
                `Error while checking existence of asset. URL: ${url}`)
            report.reportExceptionOnce(error as Error)
        }
        return false
    }
}

async function tryReadText(response: Response): Promise<string | undefined> {
    try {
        return await response.text()
    } catch (error) {
        // ignored
        return undefined
    }
}

async function uploadJsonAsset(url: string, username: string, password: string, json: unknown, verbose: boolean, report: StreamReport): Promise<"SUCCESS" | "NO_REDEPLOY" | "FAILED"> {
    if (await exists(url, username, password, verbose, report)) {
        if (verbose) {
            report.reportInfo(MessageName.UNNAMED,
                `Cache entry was created by another client while this one was executing the script. No update necessary. URL: ${url}`)
        }
        return "NO_REDEPLOY"
    }

    let response
    try {
        response = await fetch(url, {
            method: "PUT",
            headers: buildHeaders(username, password),
            body: JSON.stringify(json)
        })
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(MessageName.UNNAMED,
                `Error while uploading asset. URL: ${url}`)
            report.reportExceptionOnce(error as Error)
        }
        return "FAILED"
    }

    const text = await tryReadText(response)

    if (response.status !== 201 /* Created */) {
        if (verbose) {
            report.reportErrorOnce(MessageName.UNNAMED,
                `Failed to upload asset, non-201-Created-status received. URL: ${url} status: ${response.status} text: ${text}`)
        }
        return "FAILED"
    }

    if (verbose) {
        report.reportInfo(MessageName.UNNAMED,
            `Uploaded successfully. URL: ${url}`)
    }

    // Touch the new entry. This enables the LRU eviction script to simply sort by last_downloaded, otherwise
    // a special handling would be needed for artifacts that have never been downloaded so far.
    await exists(url, username, password, verbose, report)

    return "SUCCESS"
}

async function downloadJsonAsset<T>(url: string, verbose: boolean, report: StreamReport): Promise<T | "CACHE_MISS" | "FAILED"> {
    let response
    try {
        response = await fetch(url)
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(MessageName.UNNAMED,
                `Error while downloading asset. URL: ${url}`)
            report.reportExceptionOnce(error as Error)
        }
        return "FAILED"
    }

    if (response.status === 404) {
        if (verbose) {
            report.reportInfo(MessageName.UNNAMED,
                `Cache entry does not exist (cache miss). URL: ${url}`)
        }
        return "CACHE_MISS"
    }

    if (!response.ok) {
        if (verbose) {
            report.reportInfo(MessageName.UNNAMED,
                `Failed to download asset, non-200-ok-status received. URL: ${url} status: ${response.status}`)
        }
        return "FAILED"
    }

    let json
    try {
        json = await response.json() as T
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(MessageName.UNNAMED,
                `Error while parsing asset. URL: ${url}`)
            report.reportExceptionOnce(error as Error)
        }
        return "FAILED"
    }

    if (verbose) {
        report.reportInfo(MessageName.UNNAMED,
            `Downloaded successfully. URL: ${url}`)
    }
    return json
}
