const {executeCommand} = require("./utils/commandUtils")
const {buildCacheUpdateMessage, buildCacheReadMessage, buildGreetingMessage} = require("./utils/messageUtils")
const {getCacheDirectoryFileCount} = require("./utils/cacheDirectoryUtils")
const {replaceInFile, createFileWithContent, fileExists} = require("./utils/fileContentUtils")
const {isFileModified} = require("./utils/gitUtils")
const {
    PACKAGE_NAME_LIB, PACKAGE_NAME_LIB2, PACKAGE_NAME_APP, PACKAGE_NAME_PROJECT
} = require("./utils/dummyPackageUtils")

const CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT = "./dummy-packages/yarn-scripts-cache-dummy-project/src/util/constants.ts"
const CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_LIB = "./dummy-packages/yarn-scripts-cache-dummy-lib/src/index.ts"
const ADDITIONAL_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT = "./dummy-packages/yarn-scripts-cache-dummy-project/bin/foo.txt"

describe("yarn-scripts-cache", () => {

    async function cleanUp() {
        // Clean up previous failed test runs
        await executeCommand(`git restore ${CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT}`)
        await executeCommand(`git restore ${CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_LIB}`)
        // Ensure file is not modified
        expect(await isFileModified(CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT)).toBeFalsy()
        expect(await isFileModified(CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_LIB)).toBeFalsy()
        // Ensure dummy build directories are clean
        await executeCommand("yarn dummy-clean")
        // Ensure cache is clean
        await executeCommand("yarn clean-cache")
        // NOTE: This test uses YSC_FILE_CACHE_FOLDER_LOCATION: ".yarn-scripts-cache" to ensure a dedicated cache folder is used for every package. This
        // makes it easier to count the cache entries for each package. See /utils/commandUtils.js:DEFAULT_ENVIRONMENT for details.
    }

    beforeAll(async () => {
        await cleanUp()
    })

    afterAll(async () => {
        await cleanUp()
    })

    test("Test Step 01: Build is performed and cache is filled", async () => {
        // Build the dummy packages
        const buildOutput = await executeCommand("yarn dummy-build")

        // Ensure that the packages where build and that the cache was updated
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_LIB2))
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_APP))
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_PROJECT))

        // Ensure that the cache contains one entry for each package
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB2)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_APP)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_PROJECT)).toEqual(1)

        // Ensure that the package is working as intended
        const runOutput = await executeCommand("yarn dummy-hello")
        expect(runOutput).toMatch(buildGreetingMessage(PACKAGE_NAME_PROJECT))
    })

    test("Test Step 02: Build is skipped and cached result is used", async () => {
        // Build dummy packages again
        const buildOutput = await executeCommand("yarn dummy-build")

        // Ensure that build was skipped and results where read from cache
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB2))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_APP))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_PROJECT))

        // Ensure that the cache contains one entry for each package
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB2)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_APP)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_PROJECT)).toEqual(1)
    })

    test("Test Step 03: Make change to dummy package", async () => {
        // Modify a file in one package
        await replaceInFile(CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT, "World", "You")

        // Build dummy packages again
        const buildOutput = await executeCommand("yarn dummy-build")

        // Ensure that modified package was not read from cache but build again, and that cache was updated
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_PROJECT))

        // Remaining packages should be read from cache
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB2))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_APP))

        // Ensure that the cache contains one entry for each package, except the modified one
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB2)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_APP)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_PROJECT)).toEqual(2)

        // Ensure that the modified package still works, now with modified functionality
        const runOutput = await executeCommand("yarn dummy-hello")
        expect(runOutput).toMatch(buildGreetingMessage(PACKAGE_NAME_PROJECT, "You"))
    })

    test("Test Step 04: Change environment variable", async () => {
        // Build dummy packages again, but with custom environment variable that will change the build result
        const buildOutput = await executeCommand("yarn dummy-build", {REACT_APP_COLOR: "red"})

        // The app package should not be read from cache, as it is impacted by the environment variable
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_APP))

        // The remaining packages should be read from cache
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB2))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_PROJECT))

        // Ensure that the cache contains one entry for each package, except the modified ones
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB2)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_APP)).toEqual(2)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_PROJECT)).toEqual(2)

        // There is no easy way to test whether the yarn-scripts-cache-dummy-project package still works, as it serves a webpage.
    })

    test("Test Step 05: Revert changes and use previous cache result", async () => {
        // Undo the modification to the file
        await executeCommand(`git restore ${CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT}`)
        expect(await isFileModified(CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT)).toBeFalsy()

        // Build dummy packages again, without the modified environment variable
        const buildOutput = await executeCommand("yarn dummy-build")

        // All build results should be read from cache, as the original state was the first entry in the cache
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB2))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_APP))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_PROJECT))

        // Ensure that the cache contains one entry for each package, except the modified ones
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB2)).toEqual(1)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_APP)).toEqual(2)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_PROJECT)).toEqual(2)
    })

    test("Test Step 06: Existing files are delete before restore", async () => {
        // Undo the modification to the file
        await createFileWithContent(ADDITIONAL_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT, "bar")
        expect(await fileExists(ADDITIONAL_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT)).toBeTruthy()

        // Build dummy packages again, without the modified environment variable
        const buildOutput = await executeCommand("yarn dummy-build")

        // All build results should be read from cache, as no relevant changes have been done
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB2))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_APP))
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_PROJECT))

        // File should no longer exist
        expect(await fileExists(ADDITIONAL_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_PROJECT)).toBeFalsy()
    })

    test("Test Step 07: Modify package with dependencies", async () => {
        // Modify a file in a package with dependencies
        await replaceInFile(CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_LIB, "Hello", "Howdy")

        // Build dummy packages again
        const buildOutput = await executeCommand("yarn dummy-build")

        // Modified package and its dependencies should build and update cache
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_APP))
        expect(buildOutput).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_PROJECT))

        // Package without dependencies should not be build and read from cache
        expect(buildOutput).toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB2))

        // New cache entry should be created for the three packages
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB)).toEqual(2)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_APP)).toEqual(3)
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_PROJECT)).toEqual(3)

        // Package without dependencies should still only have one cache entry
        expect(await getCacheDirectoryFileCount(PACKAGE_NAME_LIB2)).toEqual(1)

        // Undo the modification to the file
        await executeCommand(`git restore ${CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_LIB}`)
        expect(await isFileModified(CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_LIB)).toBeFalsy()
    })

    test("Test Step 08: Ignore workspace dependencies", async () => {
        // Run command once to fill cache
        const buildOutput1 = await executeCommand("yarn dummy-echo")
        expect(buildOutput1).toMatch(buildCacheUpdateMessage(PACKAGE_NAME_APP))

        // Run command again, should be a cache hit
        const buildOutput2 = await executeCommand("yarn dummy-echo")
        expect(buildOutput2).toMatch(buildCacheReadMessage(PACKAGE_NAME_APP))

        // Modify a file in a workspace dependency
        await replaceInFile(CONSTANTS_FILE_IN_YARN_SCRIPTS_CACHE_DUMMY_LIB, "Hello", "Howdy")

        // Due to the "workspaceDependencyConfig": "ignore-all-workspace-dependencies" setting, the command should still be a cache hit
        const buildOutput3 = await executeCommand("yarn dummy-echo")
        expect(buildOutput3).toMatch(buildCacheReadMessage(PACKAGE_NAME_APP))
    })

    test("Test Step 09: Disable plugin", async () => {
        const buildOutput = await executeCommand("yarn dummy-build", {YSC_DISABLED: true})

        // No package cache was updated
        expect(buildOutput).not.toMatch(buildCacheUpdateMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).not.toMatch(buildCacheUpdateMessage(PACKAGE_NAME_LIB2))
        expect(buildOutput).not.toMatch(buildCacheUpdateMessage(PACKAGE_NAME_APP))
        expect(buildOutput).not.toMatch(buildCacheUpdateMessage(PACKAGE_NAME_PROJECT))

        // No package cache was read
        expect(buildOutput).not.toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB))
        expect(buildOutput).not.toMatch(buildCacheReadMessage(PACKAGE_NAME_LIB2))
        expect(buildOutput).not.toMatch(buildCacheReadMessage(PACKAGE_NAME_APP))
        expect(buildOutput).not.toMatch(buildCacheReadMessage(PACKAGE_NAME_PROJECT))
    })
})
