# Yarn Scripts Cache: Remote HTTP

A Yarn Scripts Cache implementation using a repository with HTTP PUT/GET/HEAD access as a remote cache.

## Repository setup

The repository setup depends on the repository manager in use. For example:

- Sonatype Nexus Repository Manager 2: Repository must be of type "site (hosted)".
- JFrog Artifactory: Repository must be of type "generic".

The permissions must be set accordingly. Typically only the CI/CD user is allowed to upload components, while local developers should only be allowed to
download components.

## Configuration

The following configuration options are available:

### Disable remote cache

Disables this cache entirely. No reads or writes are performed.

- Environment variable: `YSC_REMOTE_DISABLED`
- Config field: `cacheConfigs.remote.cacheDisabled`
- Default value: false

### Disable reading from remote cache

Disables reading from the remote cache.

- Environment variable: `YSC_REMOTE_READ_DISABLED`
- Config field: `cacheConfigs.remote.cacheReadDisabled`
- Default value: false

### Disable writing to remote cache

Disables writing to the remote cache.

- Environment variable: `YSC_REMOTE_WRITE_DISABLED`
- Config field: `cacheConfigs.remote.cacheWriteDisabled`
- Default value: false

### URL

The URL of the remote server to use as a cache. It should point to a repository that supports PUT/GET/HEAD requests,
e.g. a Nexus 2 server with a "site (hosted)" repository or a JFrog Artifactory instance with a "generic" repository.

> Note: If the URL is not configured, the cache will be disabled.

- Environment variable: `YSC_REMOTE_URL`
- Config field: `cacheConfigs.remote.url`
- Default value: No default
- Example: `http://localhost:8081/content/sites/artifacts-cache`

### Username

The remote username used to authenticate when downloading or uploading cache entries.
Make sure that the CI/CD user is allowed to upload components to the configured repository.

> Note: If the username is not configured, the cache will not be updated.

- Environment variable: `YSC_REMOTE_USERNAME`
- Config field: `cacheConfigs.remote.username`
- Default value: No default.

### Password

The password or access token for the remote username used to authenticate when downloading or uploading cache entries.
It is not recommended to store the password in the config file, as the file is not encrypted.

> Note: If the password is not configured, the cache will not be updated.

- Environment variable: `YSC_REMOTE_PASSWORD`
- Config field: `cacheConfigs.remote.password`
- Default value: No default.

### Max retries

The maximum amount of attempts when performing a network request to the remote instance.

- Environment variable: `YSC_REMOTE_MAX_RETRIES`
- Config field: `cacheConfigs.remote.maxRetries`
- Default value: `3`

### Verbose

Whether verbose output should be generated. This is useful for analysing errors.

- Environment variable: `YSC_REMOTE_VERBOSE`
- Config field: `cacheConfigs.remote.verbose`
- Default value: `false`
