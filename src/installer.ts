import { logError, logInfo, logNotice } from './log.util.js';
import { shell_ } from '@ikmich/utilis';
import { InstallOpts, UninstallOpts } from './types.js';
import { _ifDev, assertPackageManager, assertPackageRoot, depsUtil } from './util.js';

export async function installDependencies(opts: InstallOpts) {
  const {
    packageRoot,
    dependencies = [],
    devDependencies = [],
    globalDependencies = [],
    packageManager = 'npm'
  } = opts;

  assertPackageRoot(packageRoot);
  assertPackageManager(packageManager);

  const noDeps = !dependencies.length && !devDependencies.length && !globalDependencies.length;

  if (noDeps) {
    logError('!ERROR! No dependencies specified');
    return;
  }

  const hasRuntimeDependencies = dependencies.length > 0;
  const hasDevDependencies = devDependencies.length > 0;
  const hasGlobalDependencies = globalDependencies.length > 0;

  let cmdRuntimeDeps: string = ``;
  let cmdDevDeps: string = ``;
  let cmdGlobalDeps: string = '';

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

  let runtimePackageRefs: string = depsUtil.getRefString(dependencies, true);
  let devPackageRefs: string = depsUtil.getRefString(devDependencies, true);
  let globalPackageRefs: string = depsUtil.getRefString(globalDependencies, true);

  if (hasRuntimeDependencies) {
    cmdRuntimeDeps += `${packageManager} ${actions[packageManager]} ${runtimePackageRefs} `;
  }

  if (hasGlobalDependencies) {
    cmdGlobalDeps += `${packageManager} ${actions[packageManager]} ${globalOptions[packageManager]} ${globalPackageRefs} `;
  }

  if (hasDevDependencies) {
    cmdDevDeps += `${packageManager} ${actions[packageManager]} ${devOptions[packageManager]} ${devPackageRefs} `;
  }

  cmdRuntimeDeps = cmdRuntimeDeps.trim();
  cmdDevDeps = cmdDevDeps.trim();

  _ifDev(() => {
    console.log('[installDependencies()]', {
      cmdRuntimeDeps,
      cmdDevDeps,
      cmdGlobalDeps
    });
  });

  if (hasRuntimeDependencies) {
    logInfo(`Installing dependencies: ${runtimePackageRefs}`);

    const output = await shell_.exec(`${cmdRuntimeDeps}`, { cwd: packageRoot });
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
  }

  if (hasDevDependencies) {
    logInfo(`Installing dependencies: ${devPackageRefs}`);

    const output = await shell_.exec(`${cmdDevDeps}`, { cwd: packageRoot });
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
  }

  if (hasGlobalDependencies) {
    logInfo(`Installing dependencies: ${globalPackageRefs}`);

    const output = await shell_.exec(`${cmdGlobalDeps}`, { cwd: packageRoot });
    if (output.stdout) {
      logInfo(output.stdout);
    }
    if (output.stderr) {
      logError(output.stderr);
    }
  }
}

export async function uninstallDependencies(opts: UninstallOpts) {
  const { packageRoot, dependencies, packageManager } = opts;

  assertPackageRoot(packageRoot);

  assertPackageManager(packageManager);

  if (!dependencies.length) {
    logError('!error! No dependencies to remove.');
    return;
  }


  const actions = {
    npm: 'uninstall',
    yarn: 'remove',
    bun: 'remove',
    pnpm: 'remove'
  };

  let refs = depsUtil.getRefString(dependencies);
  logNotice(`Uninstalling dependencies - ${refs}`);

  const cmd = `${packageManager} ${actions[packageManager]} ${refs}`;

  const output = await shell_.exec(cmd, { cwd: packageRoot });

  if (output.stdout) {
    logInfo(output.stdout);
  }
  if (output.stderr) {
    logError(output.stderr);
  }
  console.log('Done\n');
}