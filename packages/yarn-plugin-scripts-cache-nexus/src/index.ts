import {Plugin} from "@yarnpkg/core"

import {
    BeforeYarnScriptsCacheUsage,
    CacheRegistry,
    Config,
    InitiatingScriptExecutionParameters,
    YarnScriptsCacheHooks
} from "@rgischk/yarn-scripts-cache-api"

import {NexusCache} from "./NexusCache"

const beforeYarnScriptsCacheUsage: BeforeYarnScriptsCacheUsage = async (
    cacheRegistry: CacheRegistry,
    config: Config,
    wrapScriptExecutionArgs: InitiatingScriptExecutionParameters
) => {
    cacheRegistry.push(new NexusCache(config))
}

const hooks: YarnScriptsCacheHooks = {
    beforeYarnScriptsCacheUsage
}

const plugin: Plugin = {
    hooks
}

export default plugin
