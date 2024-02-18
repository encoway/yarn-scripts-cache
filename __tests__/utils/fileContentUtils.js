const fs = require('fs').promises

async function replaceInFile(path, pattern, replacement) {
    const oldContents = await fs.readFile(path, 'utf8')
    const newContents = oldContents.replaceAll(pattern, replacement)
    await fs.writeFile(path, newContents)
}

async function createFileWithContent(path, content) {
    await fs.writeFile(path, content)
}

async function fileExists(path) {
    try {
        await fs.access(path)
        return true
    } catch (error) {
        return false
    }
}

exports.replaceInFile = replaceInFile
exports.createFileWithContent = createFileWithContent
exports.fileExists = fileExists
