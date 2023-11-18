import { logError, logInfo, logNotice, logWarn } from './log.util.js';
import { DependencyRefArray } from './types.js';
import {
  _ifDev,
  assertPackageManager,
  assertPackageRoot,
  dependencyRefUtil,
  depsUtil,
  optionFlagsUtil
} from './util.js';
import shell from 'shelljs';
import chalk from 'chalk';
import { PackageDomain } from './package-domain.js';

export type InstallInstruction = {
  dependencies: DependencyRefArray;
  undoFn: () => any;
}

export type InstallOpts = {
  domain: PackageDomain;
  // packageRoot: string;
  // runtimeDependencies?: DependencyRefArray;
  // devDependencies?: DependencyRefArray;
  // globalDependencies?: DependencyRefArray;
  runtimeDependencies?: DependencyRefArray;
  devDependencies?: DependencyRefArray;
  globalDependencies?: DependencyRefArray;
  // packageManager?: PackageManagerName;

  /**
   * Set this to true to use the version property of the DependencyRef objects when doing the install command.
   */
  versionSpecific?: boolean;

  /**
   * Use the "--legacy-peer-deps" flag when running the command. Only applies to npm package manager.
   */
  useOptionNpmLegacyPeerDeps?: boolean;

  /**
   * Use the "--force" option when running the package manager command.
   */
  useOptionForce?: boolean;

  /**
   * Include extra cli options to apply to the package manager command. Each value must include the "dash" or
   * "double-dash" switch symbol, or they will be ignored as if not passed.
   */
  extraOptions?: string[];
}

export type UninstallOpts = {
  // packageRoot: string;
  domain: PackageDomain,
  dependencies: DependencyRefArray,
  // packageManager: PackageManagerName
}

export async function installDependencies(opts: InstallOpts, undoCb: () => unknown) {
  const {
    domain,
    runtimeDependencies = [],
    devDependencies = [],
    globalDependencies = [],
    versionSpecific = false,
    useOptionNpmLegacyPeerDeps = false,
    useOptionForce = false,
    extraOptions = []
  } = opts;

  const { packageManager, packageRoot } = domain;

  assertPackageRoot(packageRoot);
  assertPackageManager(packageManager);

  const noDeps = !runtimeDependencies.length && !devDependencies.length && !globalDependencies.length;

  if (noDeps) {
    logError('!ERROR! No dependencies specified');
    return;
  }

  const hasRuntimeDependencies = runtimeDependencies.length > 0;
  const hasDevDependencies = devDependencies.length > 0;
  const hasGlobalDependencies = globalDependencies.length > 0;
  const hasExtraOptions = extraOptions.length > 0;

  const extraOptionsRef = optionFlagsUtil.flatten(extraOptions);

  let cmdRuntimeDependencies: string = ``;
  let cmdDevDependencies: string = ``;
  let cmdGlobalDependencies: string = '';

  const actions = {
    npm: 'install',
    yarn: 'add',
    bun: 'install',
    pnpm: 'add'
  };

  const globalOptions = {
    npm: '-g',
    yarn: 'global',
    bun: '-g',
    pnpm: '-g'
  };

  const devOptions = {
    npm: '--save-dev',
    yarn: '--dev',
    bun: '--development',
    pnpm: '--save-dev'
  };

  let runtimePackageRefs: string = depsUtil.flatten(runtimeDependencies, versionSpecific);
  let devPackageRefs: string = depsUtil.flatten(devDependencies, versionSpecific);
  let globalPackageRefs: string = depsUtil.flatten(globalDependencies, versionSpecific);

  if (hasRuntimeDependencies) {
    cmdRuntimeDependencies += `${packageManager} ${actions[packageManager]} ${runtimePackageRefs} `;

    if (useOptionForce) {
      cmdRuntimeDependencies += ` --force `;
    }
    if (useOptionNpmLegacyPeerDeps && packageManager == 'npm') {
      cmdRuntimeDependencies += ` --legacy-peer-deps `;
    }

    cmdRuntimeDependencies += ` ${extraOptionsRef}`;
  }

  if (hasGlobalDependencies) {
    cmdGlobalDependencies += `${packageManager} ${actions[packageManager]} ${globalOptions[packageManager]} ${globalPackageRefs} `;
  }

  if (hasDevDependencies) {
    cmdDevDependencies += `${packageManager} ${actions[packageManager]} ${devOptions[packageManager]} ${devPackageRefs} `;

    if (useOptionForce) {
      cmdDevDependencies += ` --force `;
    }
    if (useOptionNpmLegacyPeerDeps && packageManager == 'npm') {
      cmdDevDependencies += ` --legacy-peer-deps `;
    }

    cmdDevDependencies += ` ${extraOptionsRef}`;
  }

  cmdRuntimeDependencies = cmdRuntimeDependencies.trim();
  cmdDevDependencies = cmdDevDependencies.trim();

  _ifDev(() => {
    console.log('[installDependencies()]', {
      cmdRuntimeDeps: cmdRuntimeDependencies,
      cmdDevDeps: cmdDevDependencies,
      cmdGlobalDeps: cmdGlobalDependencies
    });
  });

  if (hasRuntimeDependencies) {
    logInfo(`\nInstalling runtime dependencies (${runtimePackageRefs}) in root "${chalk.yellow(packageRoot)}"`);

    const output = shell.exec(`${cmdRuntimeDependencies}`, { cwd: packageRoot });
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
    if (output.code !== 0) {
      throw chalk.red(`Command failed: "${cmdRuntimeDependencies}"`);
    }
    logNotice(`-> runtime dependencies installed: \n`);
  }

  if (hasDevDependencies) {
    logInfo(`\nInstalling dev dependencies (${devPackageRefs}) in root "${chalk.yellow(packageRoot)}"`);

    const output = shell.exec(`${cmdDevDependencies}`, { cwd: packageRoot });
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
    if (output.code !== 0) {
      throw chalk.red(`Command failed: "${cmdDevDependencies}"`);
    }
    logNotice(`-> dev dependencies installed: \n`);
  }

  if (hasGlobalDependencies) {
    logInfo(`\nInstalling global dependencies (${globalPackageRefs}) in root "${chalk.yellow(packageRoot)}"`);

    const output = shell.exec(`${cmdGlobalDependencies}`, { cwd: packageRoot });
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
    if (output.code !== 0) {
      throw chalk.red(`Command failed: "${cmdGlobalDependencies}"`);
    }
    logNotice(`-> global dependencies installed: \n`);
  }

}

export async function uninstallDependencies(opts: UninstallOpts) {
  const { domain, dependencies } = opts;
  const { packageManager, packageRoot } = domain;
  assertPackageRoot(packageRoot);
  assertPackageManager(packageManager);

  if (!dependencies.length) {
    logWarn('!notice! No dependencies to remove.');
    return;
  }

  const undoFunction = async () => {
    const reinstalls = {
      runtime: domain.runtimeDependencies.filter(runtimeDep => {
        return dependencyRefUtil.find(dependencies, runtimeDep.name);
      }),
      dev: domain.devDependencies.filter(devDep => {
        return dependencyRefUtil.find(dependencies, devDep.name);
      })
    };

    if (reinstalls.runtime.length) {
      await domain.installRuntimeDependencies(reinstalls.runtime);
    }
    if (reinstalls.dev.length) {
      await domain.installDevDependencies(reinstalls.dev);
    }
  };

  const actions = {
    npm: 'uninstall',
    yarn: 'remove',
    bun: 'remove',
    pnpm: 'remove'
  };

  let refs = depsUtil.flatten(dependencies);
  logNotice(`\nUninstalling dependencies (${refs}); from root: "${chalk.yellow(packageRoot)}"`);

  const cmd = `${packageManager} ${actions[packageManager]} ${refs}`;

  const output = shell.exec(cmd, { cwd: packageRoot });

  if (output.stdout) {
    logInfo(output.stdout);
  }
  if (output.stderr) {
    logError(output.stderr);
  }

  if (output.code !== 0) {
    // undo? reinstall exact versions as before the uninstallation.
    logNotice('Uninstall failed. Re-installing removed dependencies.');
    await undoFunction();
    return;
  }

  logNotice('-> Dependencies uninstalled.');
}