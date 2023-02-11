import {Hooks} from "@yarnpkg/core"

/**
 * Type of the @yarnpkg/core's wrapScriptExecution hook.
 */
export type WrapScriptExecution = NonNullable<Hooks["wrapScriptExecution"]>

/**
 * The parameters of the wrapScriptExecution hook that initiated this cache usage.
 */
export type InitiatingScriptExecutionParameters = {
    // don't provide executor
    project: Parameters<WrapScriptExecution>["1"]
    locator: Parameters<WrapScriptExecution>["2"]
    scriptName: Parameters<WrapScriptExecution>["3"]
    extra: Parameters<WrapScriptExecution>["4"]
}

/**
 * Type of the @yarnpkg/core's wrapScriptExecution hook's extra parameter.
 */
export type WrapScriptExecutionExtra = InitiatingScriptExecutionParameters["extra"]
