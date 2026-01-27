import { MessageName, StreamReport } from "@yarnpkg/core"
import fetch, { Headers, Response } from "node-fetch"
import crypto from "crypto"

import {
    Cache,
    CacheEntry,
    CacheEntryKey,
    Config,
    readBooleanConfigValue,
    readIntConfigValue,
    readStringConfigValue,
} from "@rgischk/yarn-scripts-cache-api"

const NAME = "remote"
const ORDER = 100

/**
 * Whether this cache is disabled. Defaults to false.
 */
const CACHE_DISABLED_ENVIRONMENT_VARIABLE = "YSC_REMOTE_DISABLED"
const CACHE_DISABLED_CONFIG_FIELD = "cacheDisabled"
const CACHE_DISABLED_DEFAULT_VALUE = false

/**
 * Whether reading from this cache is disabled. Defaults to false.
 */
const CACHE_READ_DISABLED_ENVIRONMENT_VARIABLE = "YSC_REMOTE_READ_DISABLED"
const CACHE_READ_DISABLED_CONFIG_FIELD = "cacheReadDisabled"
const CACHE_READ_DISABLED_DEFAULT_VALUE = false

/**
 * Whether writing to this cache is disabled. Defaults to false.
 */
const CACHE_WRITE_DISABLED_ENVIRONMENT_VARIABLE = "YSC_REMOTE_WRITE_DISABLED"
const CACHE_WRITE_DISABLED_CONFIG_FIELD = "cacheWriteDisabled"
const CACHE_WRITE_DISABLED_DEFAULT_VALUE = false

/**
 * The URL of the remote server to use as a cache. It should point to a repository that supports HTTP PUT/GET/HEAD requests,
 * e.g. a Nexus 2 server with a "site (hosted)" repository or a JFrog Artifactory instance with a "generic" repository.
 * Note: If the URL is not configured, this cache will be disabled.
 * Example: http://localhost:8081/content/sites/artifacts-cache
 */
const URL_ENVIRONMENT_VARIABLE = "YSC_REMOTE_URL"
const URL_CONFIG_FIELD = "url"

/**
 * The remote username used to authenticate when uploading cache entries. Make sure this user is allowed to upload
 * components to the configured repository. Note: If the username is not configured, the cache will not be updated.
 */
const USERNAME_ENVIRONMENT_VARIABLE = "YSC_REMOTE_USERNAME"
const USERNAME_CONFIG_FIELD = "username"

/**
 * The password or access token for the remote username used to authenticate when uploading cache entries. It is not recommended to store
 * the password in the config file, as the file is not encrypted. Note: If the password is not configured, the cache
 * will not be updated.
 */
const PASSWORD_ENVIRONMENT_VARIABLE = "YSC_REMOTE_PASSWORD"
const PASSWORD_CONFIG_FIELD = "password"

/**
 * The maximum amount of attempts when performing a network request to the remote server instance. Defaults to 3.
 */
const MAX_RETRIES_ENVIRONMENT_VARIABLE = "YSC_REMOTE_MAX_RETRIES"
const MAX_RETRIES_CONFIG_FIELD = "maxRetries"
const MAX_RETRIES_DEFAULT_VALUE = 3

/**
 * Whether verbose output should be generated. This is useful for analysing errors. Defaults to false.
 */
const VERBOSE_ENVIRONMENT_VARIABLE = "YSC_REMOTE_VERBOSE"
const VERBOSE_RETRIES_CONFIG_FIELD = "verbose"
const VERBOSE_RETRIES_DEFAULT_VALUE = false

export class RemoteCache implements Cache {
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

        const remoteUrl = this.getUrl()
        const username = this.getUsername()
        const password = this.getPassword()
        const maxRetries = this.getMaxRetries()
        const verbose = this.getVerbose()

        if (!remoteUrl || !username || !password) {
            return
        }

        const filename = buildFilename(cacheEntry.key)
        const url = buildUrl(remoteUrl, filename)
        const uploader = () =>
            uploadJsonAsset(
                url,
                username,
                password,
                cacheEntry,
                verbose,
                this.report,
            )
        await retry(
            uploader,
            maxRetries,
            (r) => r === "FAILED",
            verbose,
            this.report,
        )
    }

    async loadCacheEntry(
        cacheEntryKey: CacheEntryKey,
    ): Promise<CacheEntry | undefined> {
        if (this.getCacheDisabled() || this.getCacheReadDisabled()) {
            return undefined
        }

        const remoteUrl = this.getUrl()
        const username = this.getUsername()
        const password = this.getPassword()
        const maxRetries = this.getMaxRetries()
        const verbose = this.getVerbose()

        if (!remoteUrl) {
            if (verbose) {
                this.report.reportWarning(
                    MessageName.UNNAMED,
                    "Remote cache is disabled because no remote URL was configured!",
                )
            }
            return
        }

        const filename = buildFilename(cacheEntryKey)
        const url = buildUrl(remoteUrl, filename)
        const downloader = () =>
            downloadJsonAsset<CacheEntry>(url, username, password, verbose, this.report)
        const cacheEntry = await retry(
            downloader,
            maxRetries,
            (r) => r === "FAILED",
            verbose,
            this.report,
        )

        if (cacheEntry === "CACHE_MISS" || cacheEntry === "FAILED") {
            return undefined
        }

        if (
            !cacheEntry.hasOwnProperty("key") ||
            JSON.stringify(cacheEntry.key) !== JSON.stringify(cacheEntryKey)
        ) {
            if (verbose) {
                this.report.reportError(
                    MessageName.UNNAMED,
                    `Remote cache returned invalid cache entry. Key: ${JSON.stringify(cacheEntryKey)} entry: ${JSON.stringify(cacheEntry)}`,
                )
            }
            return undefined
        }

        return cacheEntry
    }

    private getCacheDisabled() {
        return readBooleanConfigValue(
            this.config,
            NAME,
            CACHE_DISABLED_ENVIRONMENT_VARIABLE,
            CACHE_DISABLED_CONFIG_FIELD,
            CACHE_DISABLED_DEFAULT_VALUE,
        )
    }

    private getCacheReadDisabled() {
        return readBooleanConfigValue(
            this.config,
            NAME,
            CACHE_READ_DISABLED_ENVIRONMENT_VARIABLE,
            CACHE_READ_DISABLED_CONFIG_FIELD,
            CACHE_READ_DISABLED_DEFAULT_VALUE,
        )
    }

    private getCacheWriteDisabled() {
        return readBooleanConfigValue(
            this.config,
            NAME,
            CACHE_WRITE_DISABLED_ENVIRONMENT_VARIABLE,
            CACHE_WRITE_DISABLED_CONFIG_FIELD,
            CACHE_WRITE_DISABLED_DEFAULT_VALUE,
        )
    }

    private getUrl() {
        return readStringConfigValue(
            this.config,
            NAME,
            URL_ENVIRONMENT_VARIABLE,
            URL_CONFIG_FIELD,
            undefined,
        )
    }

    private getUsername() {
        return readStringConfigValue(
            this.config,
            NAME,
            USERNAME_ENVIRONMENT_VARIABLE,
            USERNAME_CONFIG_FIELD,
            undefined,
        )
    }

    private getPassword() {
        return readStringConfigValue(
            this.config,
            NAME,
            PASSWORD_ENVIRONMENT_VARIABLE,
            PASSWORD_CONFIG_FIELD,
            undefined,
        )
    }

    private getMaxRetries() {
        return readIntConfigValue(
            this.config,
            NAME,
            MAX_RETRIES_ENVIRONMENT_VARIABLE,
            MAX_RETRIES_CONFIG_FIELD,
            MAX_RETRIES_DEFAULT_VALUE,
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

function buildUrl(remoteUrl: string, filename: string): string {
    return `${remoteUrl}/${filename}`
}

function buildFilename(cacheEntryKey: CacheEntryKey): string {
    const hash = crypto.createHash("sha512")
    hash.update(JSON.stringify(cacheEntryKey))
    return `YSC_${hash.digest("base64url")}`
}

function buildHeaders(username: string | undefined, password: string | undefined): Headers {
    const headers = new Headers()
    if (username && password) {
        headers.append(
            "Authorization",
            `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        )
    }
    return headers
}

async function retry<T>(
    work: () => Promise<T>,
    retries: number,
    retryFilter: (result: T) => boolean,
    verbose: boolean,
    report: StreamReport,
): Promise<T> {
    let result: T
    for (let i = 0; i < retries; i++) {
        if (i > 0 && verbose) {
            report.reportInfo(
                MessageName.UNNAMED,
                `Attempt ${i} failed, retrying...`,
            )
        }
        result = await work()
        if (!retryFilter(result)) {
            return result
        }
    }

    if (verbose) {
        report.reportWarning(
            MessageName.UNNAMED,
            `All ${retries} retry attempts failed.`,
        )
    }

    return result!
}

async function exists(
    url: string,
    username: string,
    password: string,
    verbose: boolean,
    report: StreamReport,
): Promise<boolean> {
    try {
        const response = await fetch(url, {
            method: "HEAD",
            headers: buildHeaders(username, password),
        })
        if (verbose) {
            report.reportInfo(
                MessageName.UNNAMED,
                `HEAD request was performed. URL: ${url} status: ${response.status}`,
            )
        }
        return response.status === 200
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(
                MessageName.UNNAMED,
                `Error while checking existence of asset. URL: ${url}`,
            )
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

async function uploadJsonAsset(
    url: string,
    username: string,
    password: string,
    json: unknown,
    verbose: boolean,
    report: StreamReport,
): Promise<"SUCCESS" | "NO_REDEPLOY" | "FAILED"> {
    if (await exists(url, username, password, verbose, report)) {
        if (verbose) {
            report.reportInfo(
                MessageName.UNNAMED,
                `Cache entry was created by another client while this one was executing the script. No update necessary. URL: ${url}`,
            )
        }
        return "NO_REDEPLOY"
    }

    let response
    try {
        response = await fetch(url, {
            method: "PUT",
            headers: buildHeaders(username, password),
            body: JSON.stringify(json),
        })
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(
                MessageName.UNNAMED,
                `Error while uploading asset. URL: ${url}`,
            )
            report.reportExceptionOnce(error as Error)
        }
        return "FAILED"
    }

    const text = await tryReadText(response)

    if (response.status !== 201 /* Created */) {
        if (verbose) {
            report.reportErrorOnce(
                MessageName.UNNAMED,
                `Failed to upload asset, non-201-Created-status received. URL: ${url} status: ${response.status} text: ${text}`,
            )
        }
        return "FAILED"
    }

    if (verbose) {
        report.reportInfo(
            MessageName.UNNAMED,
            `Uploaded successfully. URL: ${url}`,
        )
    }

    // Touch the new entry. This enables the LRU eviction script to simply sort by last_downloaded, otherwise
    // a special handling would be needed for artifacts that have never been downloaded so far.
    await exists(url, username, password, verbose, report)

    return "SUCCESS"
}

async function downloadJsonAsset<T>(
    url: string,
    username: string | undefined,
    password: string | undefined,
    verbose: boolean,
    report: StreamReport,
): Promise<T | "CACHE_MISS" | "FAILED"> {
    let response
    try {
        response = await fetch(url, {
            method: "GET",
            headers: buildHeaders(username, password),
        })
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(
                MessageName.UNNAMED,
                `Error while downloading asset. URL: ${url}`,
            )
            report.reportExceptionOnce(error as Error)
        }
        return "FAILED"
    }

    if (response.status === 404) {
        if (verbose) {
            report.reportInfo(
                MessageName.UNNAMED,
                `Cache entry does not exist (cache miss). URL: ${url}`,
            )
        }
        return "CACHE_MISS"
    }

    if (!response.ok) {
        if (verbose) {
            report.reportInfo(
                MessageName.UNNAMED,
                `Failed to download asset, non-200-ok-status received. URL: ${url} status: ${response.status}`,
            )
        }
        return "FAILED"
    }

    let json
    try {
        json = (await response.json()) as T
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(
                MessageName.UNNAMED,
                `Error while parsing asset. URL: ${url}`,
            )
            report.reportExceptionOnce(error as Error)
        }
        return "FAILED"
    }

    if (verbose) {
        report.reportInfo(
            MessageName.UNNAMED,
            `Downloaded successfully. URL: ${url}`,
        )
    }
    return json
}
