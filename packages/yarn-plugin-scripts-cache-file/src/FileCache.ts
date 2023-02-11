import {
    Cache,
    CacheEntry,
    CacheEntryKey,
    Config,
    readIntConfigValue,
    readStringConfigValue
} from "@rgischk/yarn-scripts-cache-api"
import {PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib"
import crypto from "crypto"

const NAME = "file"
const ORDER = 10

/**
 * The maximum age of script execution results to store in the local cache in milliseconds.
 * Defaults to a value that is equivalent to 30 days.
 */
const MAX_AGE_ENVIRONMENT_VARIABLE = "YARN_SCRIPTS_CACHE_FILE_MAX_AGE"
const MAX_AGE_CONFIG_FIELD = "maxAge"
const MAX_AGE_DEFAULT_VALUE = 2592000000 // 30 days in milliseconds

/**
 * The maximum amount of script execution results to store in the local cache. Defaults to 1000.
 */
const MAX_AMOUNT_ENVIRONMENT_VARIABLE = "YARN_SCRIPTS_CACHE_FILE_MAX_AMOUNT"
const MAX_AMOUNT_CONFIG_FIELD = "maxAmount"
const MAX_AMOUNT_DEFAULT_VALUE = 1000

/**
 * The name of the folder to store the cache in.
 */
const CACHE_FOLDER_NAME_ENVIRONMENT_VARIABLE = "YARN_SCRIPTS_CACHE_FILE_CACHE_FOLDER_NAME"
const CACHE_FOLDER_NAME_CONFIG_FIELD = "cacheFolderName"
const CACHE_FOLDER_NAME_DEFAULT_VALUE = ".yarn-scripts-cache"

export class FileCache implements Cache {
    cwd: PortablePath
    config: Config
    name: string
    order: number

    constructor(cwd: PortablePath, config: Config) {
        this.name = NAME
        this.order = ORDER
        this.cwd = cwd
        this.config = config
    }


    async saveCacheEntry(cacheEntry: CacheEntry) {
        const cacheDir = this.buildCacheDir()
        await xfs.mkdirPromise(cacheDir, {recursive: true})
        const file = this.buildCacheFile(cacheDir, cacheEntry.key)
        const fileContent = JSON.stringify(cacheEntry)
        await xfs.writeFilePromise(file, fileContent)

        await this.cleanup()
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        const cacheDir = this.buildCacheDir()
        if (! await xfs.existsPromise(cacheDir)) {
            return undefined
        }

        let cacheFile = this.buildCacheFile(cacheDir, cacheEntryKey);
        if (await xfs.existsPromise(cacheFile)) {
            const content = await xfs.readFilePromise(cacheFile, "utf8")
            const cacheEntry = JSON.parse(content) as CacheEntry
            if (isSameKey(cacheEntryKey, cacheEntry.key)) { // Double-check the cache key
                return cacheEntry
            }
        }
        return undefined
    }

    private async cleanup() {
        const maxAge = this.readMaxAge()
        const maxAmount = this.readMaxAmount()
        const deleteBefore = Date.now() - maxAge
        const cacheDir = this.buildCacheDir()
        const files = (await xfs.readdirPromise(cacheDir)).map(file => ppath.join(cacheDir, file))
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

    private buildCacheFile(cacheDir: PortablePath, cacheEntryKey: CacheEntryKey): PortablePath {
        const hash = crypto.createHash("sha512")
        hash.update(JSON.stringify(cacheEntryKey))
        return ppath.join(cacheDir, toFilename(`${hash.digest("base64url")}.json`))
    }

    private buildCacheDir(): PortablePath {
        return ppath.join(this.cwd, toFilename(this.readCacheFolderName()))
    }

    private readMaxAge() {
        return readIntConfigValue(this.config, NAME, MAX_AGE_ENVIRONMENT_VARIABLE, MAX_AGE_CONFIG_FIELD, MAX_AGE_DEFAULT_VALUE)
    }

    private readMaxAmount() {
        return readIntConfigValue(this.config, NAME, MAX_AMOUNT_ENVIRONMENT_VARIABLE, MAX_AMOUNT_CONFIG_FIELD, MAX_AMOUNT_DEFAULT_VALUE)
    }

    private readCacheFolderName() {
        return readStringConfigValue(this.config, NAME, CACHE_FOLDER_NAME_ENVIRONMENT_VARIABLE, CACHE_FOLDER_NAME_CONFIG_FIELD, CACHE_FOLDER_NAME_DEFAULT_VALUE)
    }

}

function isSameKey(key1: CacheEntryKey, key2: CacheEntryKey): boolean {
    return JSON.stringify(key1) === JSON.stringify(key2)
}

function buildFileWithAge(file: PortablePath): FileWithCreationDate {
    const stat = xfs.statSync(file)
    return {
        file,
        creationDate: stat.mtime.getTime()
    }
}

type FileWithCreationDate = {
    file: PortablePath
    creationDate: number
}
