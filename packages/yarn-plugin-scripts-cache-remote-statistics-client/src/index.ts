import { Configuration, Plugin, StreamReport } from "@yarnpkg/core"

import {
    BeforeYarnScriptsCacheUsage,
    CacheRegistry,
    StatisticsServiceRegistry,
    Config,
    InitiatingScriptExecutionParameters,
    WrapScriptExecutionExtra,
    YarnScriptsCacheHooks,
} from "@rgischk/yarn-scripts-cache-api"

import { RemoteStatisticsService } from "./RemoteStatisticsService"

async function buildReport(
    extra: WrapScriptExecutionExtra,
): Promise<StreamReport> {
    const configuration = Configuration.create(extra.cwd)
    return StreamReport.start(
        {
            configuration,
            includeFooter: false,
            stdout: extra.stdout,
        },
        async () => {
            /* no-op */
        },
    )
}

const beforeYarnScriptsCacheUsage: BeforeYarnScriptsCacheUsage = async (
    _: CacheRegistry,
    statisticsServiceRegistry: StatisticsServiceRegistry,
    config: Config,
    wrapScriptExecutionArgs: InitiatingScriptExecutionParameters,
) => {
    const report = await buildReport(wrapScriptExecutionArgs.extra)
    statisticsServiceRegistry.push(new RemoteStatisticsService(config, report))
}

const hooks: YarnScriptsCacheHooks = {
    beforeYarnScriptsCacheUsage,
}

const plugin: Plugin = {
    hooks,
}

export default plugin
