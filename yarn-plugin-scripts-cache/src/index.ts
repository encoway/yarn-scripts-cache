import {Configuration, Locator, MessageName, Plugin, Project, StreamReport} from '@yarnpkg/core';
import {PortablePath} from "@yarnpkg/fslib";
import {readConfig} from "./config";
import {Readable, Writable} from "stream"
import {buildCaches} from "./cache-factory";
import {updateScriptExecutionResultFromCache, updateCacheFromScriptExecutionResult} from "./script-result";
import {isCacheDisabled, shouldUpdateCache, shouldUpdateScriptExecutionResult} from "./environment-util";

export type WrapScriptExecution = (
    executor: () => Promise<number>,
    project: Project,
    locator: Locator,
    scriptName: string,
    extra: WrapScriptExecutionExtra,
) => Promise<() => Promise<number>>

export type WrapScriptExecutionExtra = {
  script: string,
  args: Array<string>,
  cwd: PortablePath,
  env: ProcessEnvironment,
  stdin: Readable | null,
  stdout: Writable,
  stderr: Writable
}

export type ProcessEnvironment = {
  [key: string]: string
}

async function buildReport(extra: WrapScriptExecutionExtra): Promise<StreamReport> {
  const configuration = Configuration.create(extra.cwd);
  return StreamReport.start({
    configuration,
    includeFooter: false,
    stdout: extra.stdout,
  }, async () => {
    /* no-op */
  })
}

const wrapScriptExecution: WrapScriptExecution = async (
    executor,
    project,
    locator,
    scriptName,
    extra
) => {
  const report = await buildReport(extra)
  const config = await readConfig(extra.cwd, report)
  if (!config) {
    return executor
  }

  if (isCacheDisabled(config)) {
    return executor
  }

  const scriptToCache = config.scriptsToCache.find(s => s.scriptName === scriptName)
  if (!scriptToCache) {
    return executor
  }

  const caches = buildCaches(extra.cwd, config)

  return async () => {
    if (shouldUpdateScriptExecutionResult(config) && await updateScriptExecutionResultFromCache(project, locator, extra, scriptToCache, report, caches)) {
      report.reportInfo(MessageName.UNNAMED, "Script execution result was restored from cache!")
      return Promise.resolve(0)
    } else {
      const result = await executor()
      if (result === 0 && shouldUpdateCache(config)) {
        await report.startTimerPromise("Updating script execution result cache", async () => {
          await updateCacheFromScriptExecutionResult(project, locator, extra, scriptToCache, report, caches)
        })
      }
      return result
    }
  }
}

const plugin: Plugin = {
  hooks: {
    wrapScriptExecution
  }
}

export default plugin
