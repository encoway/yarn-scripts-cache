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

import { FileCache } from "./FileCache"

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
    cacheRegistry: CacheRegistry,
    _: StatisticsServiceRegistry,
    config: Config,
    wrapScriptExecutionArgs: InitiatingScriptExecutionParameters,
) => {
    const report = await buildReport(wrapScriptExecutionArgs.extra)
    cacheRegistry.push(
        new FileCache(
            wrapScriptExecutionArgs.extra.cwd,
            wrapScriptExecutionArgs.project,
            config,
            report,
        ),
    )
}

const hooks: YarnScriptsCacheHooks = {
    beforeYarnScriptsCacheUsage,
}

const plugin: Plugin = {
    hooks,
}

export default plugin
