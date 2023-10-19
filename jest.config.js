/** @type {import('jest').Config} */
const config = {
    // Ignore utility files in test directory.
    testRegex: "/__tests__/.*.test.js",

    // As the test spawns complex child processes, the execution time is much longer than the default timeout.
    // Average execution time on my machine is around 2 minutes, so a 10-minute timeout should work reliable on different systems without wasting too much
    // time in case the process hangs.
    testTimeout: 600000
}

module.exports = config
