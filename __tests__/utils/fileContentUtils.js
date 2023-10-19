const fs = require('fs').promises

async function replaceInFile(path, pattern, replacement) {
    const oldContents = await fs.readFile(path, 'utf8')
    const newContents = oldContents.replaceAll(pattern, replacement)
    await fs.writeFile(path, newContents)
}

exports.replaceInFile = replaceInFile
