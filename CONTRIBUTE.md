# How to contribute

Feel free to create a fork of this repository, implement your desired feature or bugfix, and create a merge request into the main project.

## How to build

First make sure that all third-party-dependencies are installed:

```shell
yarn install
```

Now build the project:

```shell
yarn build
```

This command will build the actual plugin packages.
The resulting bundle files are located in the `bundles/@yarnpkg`
 directories.
You will need to call this command after every change you did to the plugins.

The project is configured to actually use these plugins itself, as you can see in the `.yarnrc.yml` file.
The dummy packages can be used to test the functionality of the plugins.
To build these dummy packages call the following command:

```shell
yarn dummy-build
```

By repeatedly calling this command, you can see that consecutive executions are cached by the plugin.
To clean the local cache used for those dummy packages, run this command:

```shell
yarn clean-cache
```

The different dummy packages have different commands to actually execute them (e.g. `yarn dummy-hello` and `yarn dummy-serve`).
This way you can test that the build results restored from cache actually work as intended.

There is also an automated test which is running some yarn commands to ensure the correct functionality of the plugins.
The test can be started with the following command:

```shell
yarn test
```

## How to release

Follow these steps to create a new release of the project.
You need to be the owner of this repository to do that, so this is mostly a manual for myself.
this process is barely automated, as I rarely perform it.

### Step 1: Bump the version

Bump the version of the projects packages according to the [Semantic Versioning](https://semver.org/) guidelines.
The version needs to be adjusted in all packages.
To do this, you can call the `set-version` script as follows:

```shell
yarn set-version <version>
```

### Step 2: Build & test

Make sure that your changes didn't break anything by building the project and running the tests.

```shell
yarn build
yarn test
```

### Step 3: Commit changes

Commit and push the changed versions in the `package.json` files and the updated bundle files (e.g. `plugin-scripts-cache.js`).
Use a commit message like "Bump version to &lt;version&gt;".

### Step 4: Publish API package to npmjs.com

Before you can publish a package to npmjs.com you need to make sure you are logged in.
For that call the following command and follow the prompt to login.

```shell
yarn npm login
```

Once that is successful, you can perform the publication by calling this command:

```shell
yarn publish
```

**Note:** During the execution of this command, you will need to once more enter a one-time-password. There is no obvious prompt for this, though.
You simply have to enter the OTP once the command seems to hang.

### Step 5: Create the release on GitHub

Go to the [Releases](https://github.com/rgischk/yarn-scripts-cache/releases) on the GitHub project.
Press the "Draft a new release" button on the top.

On this page, press the "Choose a tag" button and enter a tag matching the version of your release, e.g. `v4.2.0`. Make sure to add the prepending `v`.

Make the "Release title" the same as the tag and enter a short description of your release.

**Important:** Manually attach the three bundle files by uploading them:
* `packages/yarn-plugin-scripts-cache/bundles/@yarnpkg/plugin-scripts-cache.js`
* `packages/yarn-plugin-scripts-cache-file/bundles/@yarnpkg/plugin-scripts-cache-file.js`
* `packages/yarn-plugin-scripts-cache-nexus/bundles/@yarnpkg/plugin-scripts-cache-nexus.js`
