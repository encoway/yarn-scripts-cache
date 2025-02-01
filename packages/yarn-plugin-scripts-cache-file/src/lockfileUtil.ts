import { PortablePath, xfs } from "@yarnpkg/fslib"
import { MessageName, StreamReport } from "@yarnpkg/core"

export async function ensureCooldown(
    lockfile: PortablePath,
    cooldown: number,
    streamReport: StreamReport,
): Promise<boolean> {
    let readResult
    try {
        readResult = await readLockfile(lockfile)
    } catch (error) {
        streamReport.reportWarning(
            MessageName.UNNAMED,
            "Skipped file cache cleanup due to an error reading lockfile. This is probably fine and can happen when the cleanup is triggered in multiple processes/workspaces at the same time. If the cleanup NEVER succeeds, please report a bug to yarn-scripts-cache.",
        )
        return false
    }

    if (readResult === null) {
        return writeLockfile(lockfile, Date.now(), streamReport)
    }

    if (!Number.isNaN(readResult) && readResult + cooldown > Date.now()) {
        return false
    }

    try {
        await xfs.unlinkPromise(lockfile)
    } catch (error) {
        streamReport.reportWarning(
            MessageName.UNNAMED,
            "Skipped file cache cleanup due to an error deleting lockfile. This is probably fine and can happen when the cleanup is triggered in multiple processes/workspaces at the same time. If the cleanup NEVER succeeds, please report a bug to yarn-scripts-cache.",
        )
        return false
    }

    return writeLockfile(lockfile, Date.now(), streamReport)
}

async function readLockfile(lockfile: PortablePath): Promise<number | null> {
    try {
        const content = await xfs.readFilePromise(lockfile, "utf-8")
        return parseInt(content, 10)
    } catch (error) {
        if ((error as any).code === "ENOENT") {
            return null
        }
        throw error
    }
}

async function writeLockfile(
    lockfile: PortablePath,
    value: number,
    streamReport: StreamReport,
): Promise<boolean> {
    try {
        await xfs.writeFilePromise(lockfile, value.toString(), {
            flag: "wx",
        })
        return true
    } catch (error) {
        streamReport.reportWarning(
            MessageName.UNNAMED,
            "Skipped file cache cleanup due to an error writing lockfile. This is probably fine and can happen when the cleanup is triggered in multiple processes/workspaces at the same time. If the cleanup NEVER succeeds, please report a bug to yarn-scripts-cache.",
        )
        return false
    }
}
