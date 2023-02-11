# Yarn Scripts Cache: File

A Yarn Scripts Cache implementation using the local file system.

## Configuration

The following configuration options are available:

### Max age

The maximum age in milliseconds of script execution results to store.

* Environment variable: `YARN_SCRIPTS_CACHE_FILE_MAX_AGE`
* Config field: `cacheConfigs.file.maxAge`
* Default value: `2592000000` (30 days in milliseconds)

### Max amount

The maximum amount of script execution results to store.

* Environment variable: `YARN_SCRIPTS_CACHE_FILE_MAX_AMOUNT`
* Config field: `cacheConfigs.file.maxAmount`
* Default value: `1000`

### Cache folder name

The name of the folder to store the cache in.

* Environment variable: `YARN_SCRIPTS_CACHE_FILE_CACHE_FOLDER_NAME`
* Config field: `cacheConfigs.file.cacheFolderName`
* Default value: `.yarn-scripts-cache`
