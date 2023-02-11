import {Cache, CacheEntry, CacheEntryKey, Config} from "@rgischk/yarn-scripts-cache-api"
import {PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib"
import crypto from "crypto"

const CACHE_FOLDER_NAME = ".yarn-scripts-cache" // TODO: Allow to configure the location of this folder
const DEFAULT_MAX_AGE = 2592000000 // 30 days in milliseconds
const DEFAULT_MAX_AMOUNT = 1000

const NAME = "file"
const ORDER = 10

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
        // if (!shouldUpdateLocalCache(this.config)) {
        //     return
        // }

        const cacheDir = this.buildCacheDir()
        await xfs.mkdirPromise(cacheDir, {recursive: true})
        const file = this.buildCacheFile(cacheDir, cacheEntry.key)
        const fileContent = JSON.stringify(cacheEntry)
        await xfs.writeFilePromise(file, fileContent)

        await this.cleanup()
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        // if (!shouldUpdateScriptExecutionResultFromLocalCache(this.config)) {
        //     return undefined
        // }

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

    async cleanup() {
        const maxAge = typeof this.config.localCacheMaxAge === "undefined"
            ? DEFAULT_MAX_AGE
            : this.config.localCacheMaxAge
        const maxAmount = typeof this.config.localCacheMaxAmount === "undefined"
            ? DEFAULT_MAX_AMOUNT
            : this.config.localCacheMaxAmount

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

    buildCacheFile(cacheDir: PortablePath, cacheEntryKey: CacheEntryKey): PortablePath {
        const hash = crypto.createHash("sha512")
        hash.update(JSON.stringify(cacheEntryKey))
        return ppath.join(cacheDir, toFilename(`${hash.digest("base64url")}.json`))
    }

    buildCacheDir(): PortablePath {
        return ppath.join(this.cwd, toFilename(CACHE_FOLDER_NAME))
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
