import { Filename, npath, PortablePath, ppath, xfs } from "@yarnpkg/fslib"
import { Project } from "@yarnpkg/core"
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

const NAME = "file"
const ORDER = 10

/**
 * Whether this cache is disabled. Defaults to false.
 */
const CACHE_DISABLED_ENVIRONMENT_VARIABLE = "YSC_FILE_DISABLED"
const CACHE_DISABLED_CONFIG_FIELD = "cacheDisabled"
const CACHE_DISABLED_DEFAULT_VALUE = false

/**
 * Whether reading from this cache is disabled. Defaults to false.
 */
const CACHE_READ_DISABLED_ENVIRONMENT_VARIABLE = "YSC_FILE_READ_DISABLED"
const CACHE_READ_DISABLED_CONFIG_FIELD = "cacheReadDisabled"
const CACHE_READ_DISABLED_DEFAULT_VALUE = false

/**
 * Whether writing to this cache is disabled. Defaults to false.
 */
const CACHE_WRITE_DISABLED_ENVIRONMENT_VARIABLE = "YSC_FILE_WRITE_DISABLED"
const CACHE_WRITE_DISABLED_CONFIG_FIELD = "cacheWriteDisabled"
const CACHE_WRITE_DISABLED_DEFAULT_VALUE = false

/**
 * The maximum age of script execution results to store in the local cache in milliseconds.
 * Defaults to a value that is equivalent to 30 days.
 */
const MAX_AGE_ENVIRONMENT_VARIABLE = "YSC_FILE_MAX_AGE"
const MAX_AGE_CONFIG_FIELD = "maxAge"
const MAX_AGE_DEFAULT_VALUE = 2592000000 // 30 days in milliseconds

/**
 * The maximum amount of script execution results to store in the local cache. Defaults to 1000.
 */
const MAX_AMOUNT_ENVIRONMENT_VARIABLE = "YSC_FILE_MAX_AMOUNT"
const MAX_AMOUNT_CONFIG_FIELD = "maxAmount"
const MAX_AMOUNT_DEFAULT_VALUE = 1000

/**
 * The name of the folder to store the cache in.
 * The folder will be located in yarns global folder.
 */
const CACHE_FOLDER_NAME_ENVIRONMENT_VARIABLE = "YSC_FILE_CACHE_FOLDER_NAME"
const CACHE_FOLDER_NAME_CONFIG_FIELD = "cacheFolderName"
const CACHE_FOLDER_NAME_DEFAULT_VALUE = "yarn-scripts-cache"

/**
 * The location of the folder to store the cache in. If a relative path is
 * provided, it will be resolved against the current working directory. If
 * this option is provided, the cache folder name option is ignored.
 *
 * Examples:
 * - C:\path\to\cache (absolute path)
 * - path\to\cache\within\current\working\directory (relative path)
 */
const CACHE_FOLDER_LOCATION_ENVIRONMENT_VARIABLE =
    "YSC_FILE_CACHE_FOLDER_LOCATION"
const CACHE_FOLDER_LOCATION_CONFIG_FIELD = "cacheFolderLocation"

export class FileCache implements Cache {
    cwd: PortablePath
    project: Project
    config: Config
    name: string
    order: number

    constructor(cwd: PortablePath, project: Project, config: Config) {
        this.name = NAME
        this.order = ORDER
        this.cwd = cwd
        this.project = project
        this.config = config
    }

    async saveCacheEntry(cacheEntry: CacheEntry) {
        if (this.getCacheDisabled() || this.getCacheWriteDisabled()) {
            return
        }

        const cacheDir = this.buildCacheDir()
        await xfs.mkdirPromise(cacheDir, { recursive: true })
        const file = this.buildCacheFile(cacheDir, cacheEntry.key)
        const fileContent = JSON.stringify(cacheEntry)
        await xfs.writeFilePromise(file, fileContent)

        await this.cleanup()
    }

    async loadCacheEntry(
        cacheEntryKey: CacheEntryKey,
    ): Promise<CacheEntry | undefined> {
        if (this.getCacheDisabled() || this.getCacheReadDisabled()) {
            return undefined
        }

        const cacheDir = this.buildCacheDir()
        if (!(await xfs.existsPromise(cacheDir))) {
            return undefined
        }

        let cacheFile = this.buildCacheFile(cacheDir, cacheEntryKey)
        if (await xfs.existsPromise(cacheFile)) {
            const content = await xfs.readFilePromise(cacheFile, "utf8")
            const cacheEntry = JSON.parse(content) as CacheEntry
            if (isSameKey(cacheEntryKey, cacheEntry.key)) {
                // Double-check the cache key
                return cacheEntry
            }
        }
        return undefined
    }

    private async cleanup() {
        const maxAge = this.getMaxAge()
        const maxAmount = this.getMaxAmount()
        const deleteBefore = Date.now() - maxAge
        const cacheDir = this.buildCacheDir()
        const files = (await xfs.readdirPromise(cacheDir)).map((file) =>
            ppath.join(cacheDir, file),
        )
        const filesWithCreationDate = files.map(buildFileWithAge)
        filesWithCreationDate.sort((a, b) => b.creationDate - a.creationDate)

        let amountFiles = 0
        for (const fileWithCreationDate of filesWithCreationDate) {
            if (fileWithCreationDate.creationDate < deleteBefore) {
                await xfs.unlinkPromise(fileWithCreationDate.file)
            } else {
                amountFiles += 1
            }
            if (amountFiles > maxAmount) {
                await xfs.unlinkPromise(fileWithCreationDate.file)
            }
        }
    }

    private buildCacheFile(
        cacheDir: PortablePath,
        cacheEntryKey: CacheEntryKey,
    ): PortablePath {
        const hash = crypto.createHash("sha512")
        hash.update(JSON.stringify(cacheEntryKey))
        return ppath.join(cacheDir, `${hash.digest("base64url")}.json`)
    }

    private buildCacheDir(): PortablePath {
        const path = this.getCacheFolderLocation()
        if (path) {
            const portablePath = npath.toPortablePath(path)
            return npath.isAbsolute(path)
                ? portablePath
                : ppath.join(this.cwd, portablePath)
        }
        const globalFolder = this.project.configuration.get("globalFolder")
        return ppath.join(globalFolder, this.getCacheFolderName() as Filename)
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

    private getMaxAge() {
        return readIntConfigValue(
            this.config,
            NAME,
            MAX_AGE_ENVIRONMENT_VARIABLE,
            MAX_AGE_CONFIG_FIELD,
            MAX_AGE_DEFAULT_VALUE,
        )
    }

    private getMaxAmount() {
        return readIntConfigValue(
            this.config,
            NAME,
            MAX_AMOUNT_ENVIRONMENT_VARIABLE,
            MAX_AMOUNT_CONFIG_FIELD,
            MAX_AMOUNT_DEFAULT_VALUE,
        )
    }

    private getCacheFolderName() {
        return readStringConfigValue(
            this.config,
            NAME,
            CACHE_FOLDER_NAME_ENVIRONMENT_VARIABLE,
            CACHE_FOLDER_NAME_CONFIG_FIELD,
            CACHE_FOLDER_NAME_DEFAULT_VALUE,
        )
    }

    private getCacheFolderLocation() {
        return readStringConfigValue(
            this.config,
            NAME,
            CACHE_FOLDER_LOCATION_ENVIRONMENT_VARIABLE,
            CACHE_FOLDER_LOCATION_CONFIG_FIELD,
            undefined,
        )
    }
}

function isSameKey(key1: CacheEntryKey, key2: CacheEntryKey): boolean {
    return JSON.stringify(key1) === JSON.stringify(key2)
}

function buildFileWithAge(file: PortablePath): FileWithCreationDate {
    const stat = xfs.statSync(file)
    return {
        file,
        creationDate: stat.mtime.getTime(),
    }
}

type FileWithCreationDate = {
    file: PortablePath
    creationDate: number
}
