import { Plugin } from "@yarnpkg/core"

import {
    BeforeYarnScriptsCacheUsage,
    CacheRegistry,
    Config,
    InitiatingScriptExecutionParameters,
    YarnScriptsCacheHooks,
} from "@rgischk/yarn-scripts-cache-api"

import { FileCache } from "./FileCache"

const beforeYarnScriptsCacheUsage: BeforeYarnScriptsCacheUsage = async (
    cacheRegistry: CacheRegistry,
    config: Config,
    wrapScriptExecutionArgs: InitiatingScriptExecutionParameters,
) => {
    cacheRegistry.push(
        new FileCache(
            wrapScriptExecutionArgs.extra.cwd,
            wrapScriptExecutionArgs.project,
            config,
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
