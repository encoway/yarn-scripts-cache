import {
    CacheRegistry,
    Config,
    InitiatingScriptExecutionParameters,
    StatisticsServiceRegistry,
    YarnScriptsCacheHooks,
} from "@rgischk/yarn-scripts-cache-api"

export async function buildRegistries(
    config: Config,
    wrapScriptExecutionArgs: InitiatingScriptExecutionParameters,
): Promise<Registries> {
    const configuration = wrapScriptExecutionArgs.project.configuration
    const cacheRegistry: CacheRegistry = []
    const statisticsServiceRegistry: StatisticsServiceRegistry = []
    await configuration.triggerHook(
        (hooks: YarnScriptsCacheHooks) => hooks.beforeYarnScriptsCacheUsage,
        cacheRegistry,
        statisticsServiceRegistry,
        config,
        wrapScriptExecutionArgs,
    )
    return {
        cacheRegistry: cacheRegistry.sort((a, b) => a.order - b.order),
        statisticsServiceRegistry,
    }
}

export type Registries = {
    cacheRegistry: CacheRegistry
    statisticsServiceRegistry: StatisticsServiceRegistry
}
