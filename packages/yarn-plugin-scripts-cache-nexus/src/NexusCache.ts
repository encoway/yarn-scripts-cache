import fetch, {Blob, FormData, Headers, Response} from "node-fetch"
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
import {MessageName, StreamReport} from "@yarnpkg/core";

const NAME = "nexus"
const ORDER = 100

const DOWNLOAD_PATH = "/repository"
const UPLOAD_PATH = "/service/rest/v1/components"
const UPLOAD_URL_PARAM_REPOSITORY = "repository"
const UPLOAD_FORM_PARAM_GROUP = "raw.directory"
const UPLOAD_FORM_PARAM_FILENAME = "raw.asset1.filename"
const UPLOAD_FORM_PARAM_FILE = "raw.asset1"
const NO_REDEPLOY_MESSAGE = "Repository does not allow updating assets"

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
        const host = this.readHost()
        const repository = this.readRepository()
        const username = this.readUsername()
        const password = this.readPassword()
        const maxRetries = this.readMaxRetries()
        const verbose = this.readVerbose()

        if (!host || !username || !password) {
            return
        }

        const filename = buildFilename(cacheEntry.key)
        const uploader = () => uploadJsonAsset(host, repository, cacheEntry.key.workspaceLocator, filename, username, password, cacheEntry, verbose, this.report)
        await retry(uploader, maxRetries, r => r === "FAILED", verbose, this.report)
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        const host = this.readHost()
        const repository = this.readRepository()
        const maxRetries = this.readMaxRetries()
        const verbose = this.readVerbose()

        if (!host) {
            if (verbose) {
                this.report.reportWarning(MessageName.UNNAMED, "Nexus cache is disabled because no host was configured!")
            }
            return
        }

        const filename = buildFilename(cacheEntryKey)
        const downloader = () => downloadJsonAsset<CacheEntry>(host, repository, cacheEntryKey.workspaceLocator, filename, verbose, this.report)
        const cacheEntry = await retry(downloader, maxRetries, r => r === "FAILED", verbose, this.report)

        if (cacheEntry === "CACHE_MISS") {
            // console.debug("Cache miss", cacheEntryKey)
            return undefined
        }

        if (cacheEntry === "FAILED") {
            console.warn("Failed to load cache entry.", cacheEntryKey)
            return undefined
        }

        if (!cacheEntry.hasOwnProperty("key") || JSON.stringify(cacheEntry.key) !== JSON.stringify(cacheEntryKey)) {
            console.error("Remote cache returned invalid cache entry.", {cacheEntryKey, cacheEntry})
            return undefined
        }

        return cacheEntry
    }

    private readHost() {
        return readStringConfigValue(this.config, NAME, HOST_ENVIRONMENT_VARIABLE, HOST_CONFIG_FIELD, undefined)
    }

    private readRepository() {
        return readStringConfigValue(this.config, NAME, REPOSITORY_ENVIRONMENT_VARIABLE, REPOSITORY_CONFIG_FIELD, REPOSITORY_DEFAULT_VALUE)
    }

    private readUsername() {
        return readStringConfigValue(this.config, NAME, USERNAME_ENVIRONMENT_VARIABLE, USERNAME_CONFIG_FIELD, undefined)
    }

    private readPassword() {
        return readStringConfigValue(this.config, NAME, PASSWORD_ENVIRONMENT_VARIABLE, PASSWORD_CONFIG_FIELD, undefined)
    }

    private readMaxRetries() {
        return readIntConfigValue(this.config, NAME, MAX_RETRIES_ENVIRONMENT_VARIABLE, MAX_RETRIES_CONFIG_FIELD, MAX_RETRIES_DEFAULT_VALUE)
    }

    private readVerbose() {
        return readBooleanConfigValue(this.config, NAME, VERBOSE_ENVIRONMENT_VARIABLE, VERBOSE_RETRIES_CONFIG_FIELD, VERBOSE_RETRIES_DEFAULT_VALUE)
    }
}

function buildFilename(cacheEntryKey: CacheEntryKey): string {
    const hash = crypto.createHash("sha512")
    hash.update(JSON.stringify(cacheEntryKey))
    return `${hash.digest("base64url")}.json`
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

async function uploadJsonAsset(host: string, repository: string, group: string, filename: string, username: string, password: string, json: unknown, verbose: boolean, report: StreamReport): Promise<"SUCCESS" | "NO_REDEPLOY" | "FAILED"> {
    group = ensurePathStartsWithSlash(group)
    const url = `${host}${UPLOAD_PATH}?${UPLOAD_URL_PARAM_REPOSITORY}=${repository}`

    const headers = new Headers()
    headers.append("Accept", "application/json")
    headers.append("Authorization", `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`)

    const body = new FormData()
    body.append(UPLOAD_FORM_PARAM_GROUP, group)
    body.append(UPLOAD_FORM_PARAM_FILENAME, filename)
    body.append(UPLOAD_FORM_PARAM_FILE, new Blob([JSON.stringify(json)]))

    let response
    try {
        response = await fetch(url, {
            method: "POST",
            headers,
            body,
            redirect: "follow"
        })
    } catch (error) {
        if (verbose) {
            report.reportErrorOnce(MessageName.UNNAMED,
                `Error while uploading asset. URL: ${url} group: ${group} filename: ${filename}`)
            report.reportExceptionOnce(error as Error)
        }
        return "FAILED"
    }

    const text = await tryReadText(response)

    if (response.status === 400 && text?.includes(NO_REDEPLOY_MESSAGE)) {
        if (verbose) {
            report.reportInfo(MessageName.UNNAMED,
                `Cache entry was created by another client while this one was executing the script. No update necessary. URL: ${url} group: ${group} filename: ${filename}`)
        }
        return "NO_REDEPLOY"
    }

    if (!response.ok) {
        if (verbose) {
            report.reportErrorOnce(MessageName.UNNAMED,
                `Failed to upload asset, non-200-ok-status received. URL: ${url} group: ${group} filename: ${filename} status: ${response.status} text: ${text}`)
        }
        return "FAILED"
    }

    if (verbose) {
        report.reportInfo(MessageName.UNNAMED,
            `Uploaded successfully. URL: ${url} group: ${group} filename: ${filename}`)
    }
    return "SUCCESS"
}

async function tryReadText(response: Response): Promise<string | undefined> {
    try {
        return await response.text()
    } catch (error) {
        // ignored
        return undefined
    }
}

async function downloadJsonAsset<T>(host: string, repository: string, group: string, filename: string, verbose: boolean, report: StreamReport): Promise<T | "CACHE_MISS" | "FAILED"> {
    group = ensurePathStartsWithSlash(group)
    const url = `${host}${DOWNLOAD_PATH}/${repository}/${group}/${filename}`

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

function ensurePathStartsWithSlash(path: string): string {
    if (!path.startsWith("/")) {
        return "/" + path
    } else {
        return path
    }
}
