import {Cache, CacheEntry, CacheEntryKey} from "./cache";
import {PortablePath, ppath, toFilename, xfs} from "@yarnpkg/fslib";

export class LocalCache implements Cache {
    cwd: PortablePath

    constructor(cwd: PortablePath) {
        this.cwd = cwd
    }

    async saveCacheEntry(cacheEntry: CacheEntry) {
        const filename = Date.now().toString() + ".json"
        const fileContent = JSON.stringify(cacheEntry)
        const cacheDir = ppath.join(this.cwd, toFilename(".build-result-cache"))
        await xfs.mkdirPromise(cacheDir, {recursive: true})
        const file = ppath.join(cacheDir, toFilename(filename))
        await xfs.writeFilePromise(file, fileContent)
    }

    async loadCacheEntry(cacheEntryKey: CacheEntryKey): Promise<CacheEntry | undefined> {
        const cacheDir = ppath.join(this.cwd, toFilename(".build-result-cache"))
        if (! await xfs.existsPromise(cacheDir)) {
            return undefined
        }
        // TODO: Implement cleanup using maxAge and maxAmount config flags
        const files = await xfs.readdirPromise(cacheDir)
        for (const file of files) {
            const fullFile = ppath.join(cacheDir, file)
            const content = await xfs.readFilePromise(fullFile, "utf8")
            const cacheEntry = JSON.parse(content) as CacheEntry
            if (isSameKey(cacheEntryKey, cacheEntry.key)) {
                return cacheEntry
            }
        }
        return undefined
    }
}

function isSameKey(key1: CacheEntryKey, key2: CacheEntryKey): boolean {
    return JSON.stringify(key1) === JSON.stringify(key2)
}
