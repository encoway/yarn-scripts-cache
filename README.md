# Yarn Scripts Cache

A Yarn Berry plugin to cache script execution results.

## Installation

* TBD

## Configuration options

### Config file

The plugin requires a file called `.build-result-cache-rc.json` to be placed in the root directory of your project (next to the package.json).
This file can be checked into version control and contains all your project related configuration.
See [the type declaration](yarn-plugin-build-result-cache/src/config.ts) for the possible configuration options.

### Environment variables

* TBD

## How does it work?

Let's imagine you have the following directory structure:
```
my-project/
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ index.ts
│  └─ util/
│     └─ someUtil.ts
└─ dist/
   ├─ index.js
   ├─ index.d.ts
   └─ util/
      ├─ someUtil.js
      └─ someUtil.d.ts
```

And you have the following script in you `package.json`:
```
  "scripts": {
    "build": "tsc"
  }
```

By running the `build` script, you execute the typescript compiler, which transpiles your typescript sources and places the resulting plain javascript and ambient type definitions in the `dist` directory.
You could of course also use a different compiler, e.g. use babel or webpack to build your project.
But what these have in common, is that they will work on some set of files as an input, and produce another set of files as their output.

Add a configuration file called `.build-result-cache-rc.json` to your projects root-directory with the following content.
(Note: The comments are only added for readability, remove them to get a valid JSON file!)
```
{
  "scriptsToCache": [
    {
      "scriptName": "build",        <- Wrap around the script called "build"
      "inputIncludes": "**",        <- Consider all files when checking for changes
      "inputExcludes": "dist/**",   <- Except for those files located in the "dist" directory
      "outputIncludes": "dist/**"   <- Copy and restore all files in the "dist" directory
    }
  ]
}
```

Now run the `build` script once:
```
> yarn run build
➤ YN0000: ┌ Updating build result cache
➤ YN0000: └ Completed
```
This will execute your `build` script normally.
Additionally, it will place those files matching the "output" configuration in the cache.

Now run the same `build` script a second time:
```
> yarn run build
➤ YN0000: Build result was restored from cache!
```
This time you will notice, that the command exited a lot faster.
Because you did not make any changes to the "input" files, the "output" files where simply restored from the cache.
You can verify this, by deleting your `dist` directory and running the command again.

Finally, make some changes to your source files, e.g. the `my-project/src/util/someUtil.ts` file.
Then run the `build` script one more time:
```
> yarn run build
➤ YN0000: ┌ Updating build result cache
➤ YN0000: └ Completed
```
As you can see, this time the script execution was not skipped.
The plugin detected that you made a change to one of the input files, executed the `build` script, and then updated the cache with the new output files.

By the way, the script execution results will only be copied to the cache, if your script terminated successfully.
If it failed with an exit code other than zero, it will not add the output to the cache.

### Monorepo with yarn workspaces

When working in a monorepo project with multiple workspaces, you need to add a dedicated configuration file for each workspace that you want to enable caching for.
**Important note: A workspaces scripts can only be cached, if all workspaces that it depends on also have their own cache configuration!**
This is because if one workspace's contents change, all dependent workspaces need to be re-build as well.
To do this, we check the combined outputs of all scripts defined in all workspaces another workspace depends on, when caching it.

We do not relate between multiple scripts to cache in different workspaces based on their name.
For example if `workspace-b` depends on `workspace-a`, and both workspaces have a cached `build` and a `validate` script, then when running the `build` script in `workspace-b`, we will check the outputs of both the `build` **and** the `validate` scripts of `workspace-a` for changes.
This may result in unnecessary script executions, but we can't know for sure whether the `build` script from `workspace-b` only depends on the `build` result of `workspace-a`, or also on the `validate` result.

If you do not actually want to cache any script executions in a workspace, but need a cache configuration because you want to cache dependent workspaces, then you can simply add a "dummy" script cache configuration.
The "scriptName" can reference no actually existing script, like "non-existing-script".
You only want to make sure to include the correct output files.
```
{
  "scriptsToCache": [
    {
      "scriptName": "non-existing-script",
      "outputIncludes": "dist/**"
    }
  ]
}
```


## Examples

**Basic configuration**

This will include everything in the input, except for the `dist` directory, which is included in the output:
```
{
  "scriptsToCache": [
    {
      "scriptName": "build",
      "inputIncludes": "**",
      "inputExcludes": "dist/**",
      "outputIncludes": "dist/**"
    }
  ]
}
```

**Cache multiple scripts**

This will cache both the `build` and the `validate` scripts with different output directories:
```
{
  "scriptsToCache": [
    {
      "scriptName": "build",
      "inputIncludes": "**",
      "inputExcludes": ["dist/**", "validation-results/**"],
      "outputIncludes": "dist/**"
    },
    {
      "scriptName": "validate",
      "inputIncludes": "**",
      "inputExcludes": ["dist/**", "validation-results/**"],
      "outputIncludes": "validation-results/**"
    }
  ]
}
```

**Consider environment variable changes**

This will consider changes in the values of any environment variables starting with `REACT_APP` (for example when using create-react-app):
```
{
  "scriptsToCache": [
    {
      "scriptName": "build",
      "inputIncludes": "**",
      "inputExcludes": "dist/**",
      "outputIncludes": "dist/**",
      "environmentVariableIncludes": "REACT_APP.*"
    }
  ]
}
```
