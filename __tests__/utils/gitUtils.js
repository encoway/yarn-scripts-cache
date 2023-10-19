const { executeCommand } = require("./commandUtils")

async function isFileModified(path) {
    try {
        await executeCommand(`git diff --exit-code ${path}`)
        return false
    } catch (error) {
        return true
    }
}

exports.isFileModified = isFileModified
