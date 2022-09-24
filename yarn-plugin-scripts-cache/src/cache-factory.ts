import {Cache} from "./cache";
import {Config} from "./config";
import {PortablePath} from "@yarnpkg/fslib";
import {LocalCache} from "./local-cache";
import {RemoteCache} from "./remote-cache";

export function buildCaches(cwd: PortablePath, config: Config): Cache[] {
    const caches: Cache[] = [new LocalCache(cwd)]
    if (config.remoteCaches) {
        config.remoteCaches.forEach(remoteCacheUrl => caches.push(new RemoteCache(new URL(remoteCacheUrl))))
    }
    return caches
}
