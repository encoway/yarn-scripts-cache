import {Locator, Plugin, Project} from '@yarnpkg/core';
import {BaseCommand} from '@yarnpkg/cli';
import {Option} from 'clipanion';
import {PortablePath} from "@yarnpkg/fslib";
import {cachePop, cachePush} from "./build-cache";
import {Writable, Readable } from "stream"


const plugin: Plugin = {
  hooks: {
    wrapScriptExecution: async (
        executor: () => Promise<number>,
        project: Project,
        locator: Locator,
        scriptName: string,
        extra: {script: string, args: Array<string>, cwd: PortablePath, env: any, stdin: Readable | null, stdout: Writable, stderr: Writable},
    ): Promise<() => Promise<number>> => {
      const useBuildCacheArgIndex = extra.args.indexOf("--use-build-cache")
      if (useBuildCacheArgIndex > -1) {
        extra.args.splice(useBuildCacheArgIndex, 1)
        return async () => {
          if (await cachePop(extra.cwd, project)) {
            console.log("Restored from cache!")
            return Promise.resolve(0)
          } else {
            const result = await executor()
            if (result === 0) {
              await cachePush(extra.cwd, project)
              console.log("Cache updated!")
            }
            return result
          }
        }
      } else {
        return executor
      }
    }
  }
};

export default plugin;
