# Yarn Scripts Cache: File

A Yarn Scripts Cache implementation using the local file system.

## Configuration

The following configuration options are available:

### Disable file cache

Disables this cache entirely. No reads or writes are performed.

* Environment variable: `YSC_FILE_DISABLED`
* Config field: `cacheConfigs.file.cacheDisabled`
* Default value: false

### Disable reading from file cache

Disables reading from the file cache.

* Environment variable: `YSC_FILE_READ_DISABLED`
* Config field: `cacheConfigs.file.cacheReadDisabled`
* Default value: false

### Disable writing to file cache

Disables writing to the file cache.

* Environment variable: `YSC_FILE_WRITE_DISABLED`
* Config field: `cacheConfigs.file.cacheWriteDisabled`
* Default value: false

### Max age

The maximum age in milliseconds of script execution results to store.

* Environment variable: `YSC_FILE_MAX_AGE`
* Config field: `cacheConfigs.file.maxAge`
* Default value: `2592000000` (30 days in milliseconds)

### Max amount

The maximum amount of script execution results to store.

* Environment variable: `YSC_FILE_MAX_AMOUNT`
* Config field: `cacheConfigs.file.maxAmount`
* Default value: `1000`

### Cache folder name

The name of the folder to store the cache in.

* Environment variable: `YSC_FILE_CACHE_FOLDER_NAME`
* Config field: `cacheConfigs.file.cacheFolderName`
* Default value: `.yarn-scripts-cache`

### Cache folder location

The location of the folder to store the cache in.
If this option is provided, the cache folder name option is ignored.

> Note: You can use the same cache folder location for multiple projects or workspaces.
> But note that the cleanup options do not distinguish between different projects or workspaces, therefore you might want to increase the default options accordingly. 

* Environment variable: `YSC_FILE_CACHE_FOLDER_LOCATION`
* Config field: `cacheConfigs.file.cacheFolderLocation`
* Default value: Current working directory.
* Examples:
  * `C:\path\to\cache`
  * `path\to\cache\within\current\working\directory`
