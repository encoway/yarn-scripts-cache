
function buildCacheUpdateMessage(packageName) {
    return new RegExp(`➤ YN0000: \\[@rgischk\\/${packageName}\\]: ➤ YN0000: ┌ Updating script execution result cache\n➤ YN0000: \\[@rgischk\\/${packageName}\\]: ➤ YN0000: └ Completed`)
}

function buildCacheReadMessage(packageName) {
    return new RegExp(`➤ YN0000: \\[@rgischk\\/${packageName}\\]: ➤ YN0000: Script execution result was restored from file cache! Created .+ by [^\n]+\n`)
}

function buildGreetingMessage(packageName, subject = "World") {
    return new RegExp(`➤ YN0000: \\[@rgischk\\/${packageName}\\]: \\w+ ${subject}!`)
}

exports.buildCacheUpdateMessage = buildCacheUpdateMessage
exports.buildCacheReadMessage = buildCacheReadMessage
exports.buildGreetingMessage = buildGreetingMessage
