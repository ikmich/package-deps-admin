import { logError, logInfo, logNotice, logSuccess, logWarn } from './log.util.js';
import { DependencyRefArray, PackageManagerValue } from './types.js';
import {
  _fn,
  _ifDev,
  assertPackageManager,
  assertPackageRoot,
  colorUtil,
  dependencyRefUtil,
  depsUtil,
  emptyUndoFn,
  optionFlagsUtil
} from './util.js';
import shell from 'shelljs';
import { PackageDomain } from './package-domain.js';

export type InstallInstruction = {
  dependencies: DependencyRefArray;
  undoFn: () => Promise<any>;
}

export type InstallOpts = {
  /**
   * If no domain, a global installation is implied.
   */
  domain?: PackageDomain;
  // packageRoot: string;
  // runtimeDependencies?: DependencyRefArray;
  // devDependencies?: DependencyRefArray;
  // globalDependencies?: DependencyRefArray;
  runtimeInstallInstruction?: InstallInstruction;
  devInstallInstruction?: InstallInstruction;
  globalInstallInstruction?: InstallInstruction;
  packageManager?: PackageManagerValue;

  /**
   * Set this to true to use the version property of the DependencyRef objects when doing the "install" command.
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

export async function installDependencies(opts: InstallOpts) {
  const {
    domain,
    packageManager,
    runtimeInstallInstruction,
    devInstallInstruction,
    globalInstallInstruction,
    versionSpecific = false,
    useOptionNpmLegacyPeerDeps = false,
    useOptionForce = false,
    extraOptions = []
  } = opts;

  const { packageRoot } = domain || {};

  const resolvedPackageManager = _fn(() => {
    if (packageManager) {
      return packageManager;
    }
    if (domain?.packageManager) {
      return domain?.packageManager;
    }
    return 'npm';
  });

  if (packageRoot) {
    assertPackageRoot(packageRoot);
  }
  assertPackageManager(resolvedPackageManager);

  const runtimeDependencies = runtimeInstallInstruction?.dependencies || [];
  const devDependencies = devInstallInstruction?.dependencies || [];
  const globalDependencies = globalInstallInstruction?.dependencies || [];

  const noDeps = !runtimeDependencies.length && !devDependencies.length && !globalDependencies.length;

  if (noDeps) {
    logError('!ERROR! No dependencies specified');
    return;
  }

  const hasRuntimeDependencies = runtimeDependencies.length > 0;
  const hasDevDependencies = devDependencies.length > 0;
  const hasGlobalDependencies = globalDependencies.length > 0;
  const hasExtraOptions = extraOptions.length > 0;

  let extraOptionsRef = '';
  if (hasExtraOptions) {
    extraOptionsRef = optionFlagsUtil.flatten(extraOptions);
  }

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
    cmdRuntimeDependencies += `${resolvedPackageManager} ${actions[resolvedPackageManager]} ${runtimePackageRefs} `;

    if (useOptionForce) {
      cmdRuntimeDependencies += ` --force `;
    }
    if (useOptionNpmLegacyPeerDeps && resolvedPackageManager == 'npm') {
      cmdRuntimeDependencies += ` --legacy-peer-deps `;
    }

    cmdRuntimeDependencies += ` ${extraOptionsRef} `;
  }

  if (hasDevDependencies) {
    cmdDevDependencies += `${resolvedPackageManager} ${actions[resolvedPackageManager]} ${devOptions[resolvedPackageManager]} ${devPackageRefs} `;

    if (useOptionForce) {
      cmdDevDependencies += ` --force `;
    }
    if (useOptionNpmLegacyPeerDeps && resolvedPackageManager == 'npm') {
      cmdDevDependencies += ` --legacy-peer-deps `;
    }

    cmdDevDependencies += ` ${extraOptionsRef}`;
  }

  if (hasGlobalDependencies) {
    cmdGlobalDependencies += `${resolvedPackageManager} ${actions[resolvedPackageManager]} ${globalOptions[resolvedPackageManager]} ${globalPackageRefs} `;
  }

  cmdRuntimeDependencies = cmdRuntimeDependencies.trim();
  cmdDevDependencies = cmdDevDependencies.trim();
  cmdGlobalDependencies = cmdGlobalDependencies.trim();

  _ifDev(() => {
    console.log('[installDependencies()]', {
      cmdRuntimeDeps: cmdRuntimeDependencies,
      cmdDevDeps: cmdDevDependencies,
      cmdGlobalDeps: cmdGlobalDependencies
    });
  });

  // RUNTIME DEPENDENCIES
  if (hasRuntimeDependencies) {
    logInfo(`\n-> Installing runtime dependencies (${runtimePackageRefs}) in root "${colorUtil.yellowText(packageRoot)}"`);

    const output = shell.exec(`${cmdRuntimeDependencies}`, { cwd: packageRoot });
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
    if (output.code !== 0) {

      logError(`Command failed: "${colorUtil.yellowText(cmdRuntimeDependencies)}"`);
      logNotice('Attempting to run undo callback function if implemented...');
      await runtimeInstallInstruction?.undoFn();
      // throw chalk.red(`Command failed: "${cmdRuntimeDependencies}"`);
    } else {
      logSuccess(`-> runtime dependencies installed: \n`);
    }
  }

  // DEV DEPENDENCIES
  if (hasDevDependencies) {
    logInfo(`\n-> Installing dev dependencies (${colorUtil.yellowText(devPackageRefs)}) in root "${colorUtil.yellowText(packageRoot)}"`);

    const output = shell.exec(`${cmdDevDependencies}`, { cwd: packageRoot });
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
    if (output.code !== 0) {
      logNotice('Attempting to run undo callback function if implemented...');
      await devInstallInstruction?.undoFn();
      logError(`Command failed: "${colorUtil.yellowText(cmdDevDependencies)}"`);
      // throw chalk.red(`Command failed: "${cmdDevDependencies}"`);
    } else {
      logSuccess(`-> dev dependencies installed: \n`);
    }
  }

  // GLOBAL DEPENDENCIES
  if (hasGlobalDependencies) {
    logInfo(`\n-> Installing global dependencies (${colorUtil.yellowText(globalPackageRefs)})`);

    const output = shell.exec(`${cmdGlobalDependencies}`);
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
    if (output.code !== 0) {
      logError(`Command failed: "${colorUtil.yellowText(cmdGlobalDependencies)}"`);
      logNotice('Attempting to run undo callback function if implemented...');
      await globalInstallInstruction?.undoFn();
      // throw chalk.red(`Command failed: "${cmdGlobalDependencies}"`);
    } else {
      logSuccess(`-> global dependencies installed: \n`);
    }
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
        return dependencyRefUtil.containsByName(dependencies, runtimeDep.name);
      }),
      dev: domain.devDependencies.filter(devDep => {
        return dependencyRefUtil.containsByName(dependencies, devDep.name);
      })
    };

    if (reinstalls.runtime.length) {
      await domain.installRuntimeDependencies(reinstalls.runtime, emptyUndoFn);
    }
    if (reinstalls.dev.length) {
      await domain.installDevDependencies(reinstalls.dev, emptyUndoFn);
    }
  };

  const actions = {
    npm: 'uninstall',
    yarn: 'remove',
    bun: 'remove',
    pnpm: 'remove'
  };

  let refs = depsUtil.flatten(dependencies);
  logInfo(`\n-> Uninstalling dependencies (${colorUtil.yellowText(refs)}); from root: "${colorUtil.yellowText(packageRoot)}"`);

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
    logError('Uninstall failed.');
    logNotice('Attempting to re-install the removed dependencies...');
    await undoFunction();
    return;
  }

  logSuccess('-> Dependencies uninstalled.');
}