const fs = require("fs").promises

async function getCacheDirectoryFileCount(packageName) {
    const path = `./dummy-packages/${packageName}/.yarn-scripts-cache`
    let cacheDirStat
    try {
        cacheDirStat = await fs.stat(path)
    } catch (error) {
        return undefined
    }
    if (!cacheDirStat.isDirectory()) {
        throw new Error("Path to cache directory is not a directory!")
    }

    return (await fs.readdir(path)).length
}

exports.getCacheDirectoryFileCount = getCacheDirectoryFileCount
