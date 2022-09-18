import {Configuration, Locator, MessageName, Plugin, Project, StreamReport} from '@yarnpkg/core';
import {PortablePath} from "@yarnpkg/fslib";
import {cachePop, cachePush, readConfig} from "./build-cache";
import {Writable, Readable } from "stream"

type WrapScriptExecution = (
    executor: () => Promise<number>,
    project: Project,
    locator: Locator,
    scriptName: string,
    extra: WrapScriptExecutionExtra,
) => Promise<() => Promise<number>>

type WrapScriptExecutionExtra = {
  script: string,
  args: Array<string>,
  cwd: PortablePath,
  env: any,
  stdin: Readable | null,
  stdout: Writable,
  stderr: Writable
}

async function log(extra: WrapScriptExecutionExtra, message: string) {
  const configuration = Configuration.create(extra.cwd);
  await StreamReport.start({
    configuration,
    includeFooter: false,
    stdout: extra.stdout
  }, async report => {
    report.reportInfo(MessageName.UNNAMED, message)
  })
}

const wrapScriptExecution: WrapScriptExecution = async (
    executor,
    project,
    locator,
    scriptName,
    extra
) => {
  const config = await readConfig(extra.cwd)
  if (config && config.scriptsToCache.includes(scriptName)) {
    return async () => {
      if (await cachePop(extra.cwd, project)) {
        await log(extra, "Restored from cache!")
        return Promise.resolve(0)
      } else {
        const result = await executor()
        if (result === 0) {
          await cachePush(extra.cwd, project)
          await log(extra, "Cache updated!")
        }
        return result
      }
    }
  } else {
    return executor
  }
};

const plugin: Plugin = {
  hooks: {
    wrapScriptExecution
  }
};

export default plugin;
