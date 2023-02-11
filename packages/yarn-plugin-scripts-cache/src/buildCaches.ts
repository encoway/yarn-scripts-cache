import {
    Cache,
    CacheRegistry,
    Config,
    InitiatingScriptExecutionParameters,
    YarnScriptsCacheHooks
} from "@rgischk/yarn-scripts-cache-api"

export async function buildCaches(config: Config, wrapScriptExecutionArgs: InitiatingScriptExecutionParameters): Promise<Cache[]> {
    const configuration = wrapScriptExecutionArgs.project.configuration
    const cacheRegistry: CacheRegistry = []
    await configuration.triggerHook(
        (hooks: YarnScriptsCacheHooks) => hooks.beforeYarnScriptsCacheUsage,
        cacheRegistry,
        config,
        wrapScriptExecutionArgs
    )
    return cacheRegistry.sort((a, b) => a.order - b.order)
}
