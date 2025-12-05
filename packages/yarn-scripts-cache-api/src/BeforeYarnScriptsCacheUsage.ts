import { CacheRegistry } from "./CacheRegistry"
import { StatisticsServiceRegistry } from "./StatisticsServiceRegistry"
import { InitiatingScriptExecutionParameters } from "./InitiatingScriptExecutionParameters"
import { Config } from "./Config"

/**
 * Custom hook by the yarn-scripts-cache plugin. Will be called before caches are used to allow cache implementations
 * provided by other plugins to register themselves.
 *
 * @param cacheRegistry The registry that cache implementations can add themselves
 * @param statisticsServiceRegistry The registry that statistic service implementations can add themselves
 * @param config the yarn-scripts-cache configuration
 * @param wrapScriptExecutionArgs The original arguments of the wrapScriptExecution hook that the yarn-scripts-cache
 *   plugin was triggered by
 */
export type BeforeYarnScriptsCacheUsage = (
    cacheRegistry: CacheRegistry,
    statisticsServiceRegistry: StatisticsServiceRegistry,
    config: Config,
    wrapScriptExecutionArgs: InitiatingScriptExecutionParameters,
) => Promise<void>
