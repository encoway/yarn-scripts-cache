
function buildCacheUpdateMessage(packageName) {
    return new RegExp(`\\[@rgischk\\/${packageName}\\]: ➤ YN0000: ┌ Updating script execution result cache\n\\[@rgischk\\/${packageName}\\]: ➤ YN0000: └ Completed`)
}

function buildCacheReadMessage(packageName) {
    return new RegExp(`\\[@rgischk\\/${packageName}\\]: ➤ YN0000: Script execution result was restored from file cache! Created .+ by [^\n]+\n`)
}

function buildGreetingMessage(packageName, subject = "World") {
    return new RegExp(`\\[@rgischk\\/${packageName}\\]: \\w+ ${subject}!`)
}

exports.buildCacheUpdateMessage = buildCacheUpdateMessage
exports.buildCacheReadMessage = buildCacheReadMessage
exports.buildGreetingMessage = buildGreetingMessage
