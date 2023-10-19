const { exec } = require("child_process")

const REGEX_COLOR_CODE = /\x1b\[[\d;]*m/g

function removeColorCodes(string) {
    return string.replaceAll(REGEX_COLOR_CODE, "")
}

async function executeCommand(command, environment) {
    return new Promise((resolve, reject) => {
        exec(command, {env: environment}, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            } else {
                resolve(removeColorCodes(`${stderr}\n\n${stdout}`))
            }
        })
    })
}

exports.executeCommand = executeCommand
