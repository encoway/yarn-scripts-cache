import {Hooks} from "@yarnpkg/core"
import {BeforeYarnScriptsCacheUsage} from "./BeforeYarnScriptsCacheUsage"

/**
 * Custom hook definition for the yarn-scripts-cache.
 */
export interface YarnScriptsCacheHooks extends Hooks {
    /**
     * This hook allows plugins to register additional cache implementations. It is called before caches are being used.
     */
    beforeYarnScriptsCacheUsage: BeforeYarnScriptsCacheUsage
}
