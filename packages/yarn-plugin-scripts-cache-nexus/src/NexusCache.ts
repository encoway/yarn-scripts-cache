import fetch, {Blob, FormData, Headers, Response} from "node-fetch"
import crypto from "crypto"

import {Cache, CacheEntry, CacheEntryKey} from "@rgischk/yarn-scripts-cache-api"

// TODO: Replace with configuration via environment variables
const HOST = "http://localhost:8081"
const REPOSITORY = "yarn-scripts-cache"
const USER = "upload-user"
const PASSWORD = "password123"
const MAX_RETRIES = 3

const DOWNLOAD_PATH = "/repository"
const UPLOAD_PATH = "/service/rest/v1/components"
const UPLOAD_URL_PARAM_REPOSITORY = "repository"
const UPLOAD_FORM_PARAM_GROUP = "raw.directory"
const UPLOAD_FORM_PARAM_FILENAME = "raw.asset1.filename"
const UPLOAD_FORM_PARAM_FILE = "raw.asset1"

const NO_REDEPLOY_MESSAGE = "Repository does not allow updating assets"

const NAME = "nexus"
const ORDER = 100

// TODO: Replace console outputs with yarns reporting feature

export class NexusCache implements Cache {
    name: string
    order: number

    constructor() {
        this.name = NAME
        this.order = ORDER
    }


    async saveCacheEntry(cacheEntry: CacheEntry) {
        // if (!shouldUpdateRemoteCache(this.config)) {
        //     return
        // }

        const filename = buildFilename(cacheEntry.key)
        const uploader = () => uploadJsonAsset(HOST, REPOSITORY, cacheEntry.key.workspaceLocator, filename, USER, PASSWORD, cacheEntry)
        const result = await retry(uploader, MAX_RETRIES, r => r === "FAILED")

        switch (result) {
            case "FAILED":
                console.warn("Failed to update cache!")
                break
            case "NO_REDEPLOY":
                console.info("Cache already up-to-date.")
                break
            case "SUCCESS":
                console.debug("Successfully updated cache.")
                break
        }
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        // if (!shouldUpdateScriptExecutionResultFromRemoteCache(this.config)) {
        //     return undefined
        // }

        const filename = buildFilename(cacheEntryKey)
        const downloader = () => downloadJsonAsset<CacheEntry>(HOST, REPOSITORY, cacheEntryKey.workspaceLocator, filename)
        const cacheEntry = await retry(downloader, MAX_RETRIES, r => r === "FAILED")

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
}

function buildFilename(cacheEntryKey: CacheEntryKey): string {
    const hash = crypto.createHash("sha512")
    hash.update(JSON.stringify(cacheEntryKey))
    return `${hash.digest("base64url")}.json`
}

async function retry<T>(work: () => Promise<T>, retries: number, retryFilter: (result: T) => boolean): Promise<T> {
    let result: T
    for (let i = 0; i < retries; i++) {
        if (i > 0) {
            console.log(`Attempt ${i} failed, retrying...`)
        }
        result = await work()
        if (!retryFilter(result)) {
            return result
        }
    }
    console.log(`All ${retries} retry attempts failed.`)
    return result!
}

async function uploadJsonAsset(host: string, repository: string, group: string, filename: string, username: string, password: string, json: unknown): Promise<"SUCCESS" | "NO_REDEPLOY" | "FAILED"> {
    group = ensurePathStartsWithSlash(group)
    const url = `${HOST}${UPLOAD_PATH}?${UPLOAD_URL_PARAM_REPOSITORY}=${repository}`

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
        console.warn("Error while uploading asset", {url, group, filename, error})
        return "FAILED"
    }

    const text = await tryReadText(response)

    if (response.status === 400 && text?.includes(NO_REDEPLOY_MESSAGE)) {
        return "NO_REDEPLOY"
    }

    if (!response.ok) {
        console.warn("Failed to upload asset, non-200-ok-status received.", {
            url,
            group,
            filename,
            status: response.status,
            text
        })
        return "FAILED"
    }

    console.debug("Uploaded successfully", {url, group, filename, json})
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

async function downloadJsonAsset<T>(host: string, repository: string, group: string, filename: string): Promise<T | "CACHE_MISS" | "FAILED"> {
    group = ensurePathStartsWithSlash(group)
    const url = `${host}${DOWNLOAD_PATH}/${repository}/${group}/${filename}`

    let response
    try {
        response = await fetch(url)
    } catch (error) {
        console.warn("Error while downloading asset.", {url, error})
        return "FAILED"
    }

    if (response.status === 404) {
        return "CACHE_MISS"
    }

    if (!response.ok) {
        console.warn("Failed to download asset, non-200-ok-status received.", {url, status: response.status})
        return "FAILED"
    }

    try {
        return await response.json() as T
    } catch (error) {
        console.warn("Error while parsing asset", error)
        return "FAILED"
    }
}

function ensurePathStartsWithSlash(path: string): string {
    if (!path.startsWith("/")) {
        return "/" + path
    } else {
        return path
    }
}
