# Yarn Scripts Cache: Remote statistics service client

This package collects statistics about the cache usage and sends them to a remote statistics server.

> **Note**
>
> The implementation of the server receiving these statistics is not open source.
> You'll have to implement your own server, or implement your own statistics service plugin.

## Configuration

The following configuration options are available:

### Disable nexus cache

Disables this statistics service entirely.

- Environment variable: `YSC_REMOTE_STATISTICS_DISABLED`
- Config field: `cacheConfigs.remoteStatistics.statisticsDisabled`
- Default value: false

### Host

The host of the remote statistics server to send the statistics to.

> Note: If the host is not configured, the cache will be disabled.

- Environment variable: `YSC_REMOTE_STATISTICS_HOST`
- Config field: `cacheConfigs.remoteStatistics.host`
- Default value: No default
- Example: `http://localhost:3000`

### Verbose

Whether verbose output should be generated. This is useful for analysing errors.

- Environment variable: `YSC_REMOTE_STATISTICS_VERBOSE`
- Config field: `cacheConfigs.remoteStatistics.verbose`
- Default value: `false`
