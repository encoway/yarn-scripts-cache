# Yarn Scripts Cache: Nexus

A Yarn Scripts Cache implementation using a Sonatype Nexus Repository Manager 2 as a remote cache.

## Nexus setup

The nexus repository must be of type "site (hosted)".
A user needs to be available to upload components.
Downloading components should not require authentication.

## Configuration

The following configuration options are available:

### Disable nexus cache

Disables this cache entirely. No reads or writes are performed.

- Environment variable: `YSC_NEXUS_DISABLED`
- Config field: `cacheConfigs.nexus.cacheDisabled`
- Default value: false

### Disable reading from nexus cache

Disables reading from the nexus cache.

- Environment variable: `YSC_NEXUS_READ_DISABLED`
- Config field: `cacheConfigs.nexus.cacheReadDisabled`
- Default value: false

### Disable writing to nexus cache

Disables writing to the nexus cache.

- Environment variable: `YSC_NEXUS_WRITE_DISABLED`
- Config field: `cacheConfigs.nexus.cacheWriteDisabled`
- Default value: false

### Host

The host of the nexus instance to use as a cache.

> Note: If the host is not configured, the cache will be disabled.

- Environment variable: `YSC_NEXUS_HOST`
- Config field: `cacheConfigs.nexus.host`
- Default value: No default
- Example: `http://localhost:8081`

### Repository

The name of the nexus repository to store the cache entries in.
The repository should be of type "site (hosted)".

- Environment variable: `YSC_NEXUS_REPOSITORY`
- Config field: `cacheConfigs.nexus.repository`
- Default value: `yarn-scripts-cache`

### Username

The nexus username used to authenticate when uploading cache entries.
Make sure this user is allowed to upload components to the configured repository.

> Note: If the username is not configured, the cache will not be updated.

- Environment variable: `YSC_NEXUS_USERNAME`
- Config field: `cacheConfigs.nexus.username`
- Default value: No default.

### Password

The password for the nexus username used to authenticate when uploading cache entries.
It is not recommended to store the password in the config file, as the file is not encrypted.

> Note: If the password is not configured, the cache will not be updated.

- Environment variable: `YSC_NEXUS_PASSWORD`
- Config field: `cacheConfigs.nexus.password`
- Default value: No default.

### Max retries

The maximum amount of attempts when performing a network request to the nexus instance.

- Environment variable: `YSC_NEXUS_MAX_RETRIES`
- Config field: `cacheConfigs.nexus.maxRetries`
- Default value: `3`

### Verbose

Whether verbose output should be generated. This is useful for analysing errors.

- Environment variable: `YSC_NEXUS_VERBOSE`
- Config field: `cacheConfigs.nexus.verbose`
- Default value: `false`
