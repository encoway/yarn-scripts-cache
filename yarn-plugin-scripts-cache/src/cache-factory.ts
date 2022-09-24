import {Cache} from "./cache";
import {Config} from "./config";
import {PortablePath} from "@yarnpkg/fslib";
import {LocalCache} from "./local-cache";
import {RemoteCache} from "./remote-cache";

export function buildCaches(cwd: PortablePath, config: Config): Cache[] {
    const caches: Cache[] = [new LocalCache(cwd, config)]
    if (config.remoteCache) {
        caches.push(new RemoteCache(new URL(config.remoteCache), config))
    }
    return caches
}
