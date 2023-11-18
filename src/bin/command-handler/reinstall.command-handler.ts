import { Command } from 'commander';
import { commandUtil } from './util.js';
import { getPackageDomainForRoot } from '../../package-domain.js';
import { installDependencies, InstallOpts, uninstallDependencies } from '../../installer.js';
import { CliOpts } from '../index.js';
import { PackageManagerName } from '../../types.js';

export const reinstallCommandHandler = {
  async execute(command: Command) {
    console.log('=={ REINSTALL }==');

    const opts = command.opts<CliOpts>();
    const dependencyRefs = Array.from(command.args) || [];
    dependencyRefs.shift();

    let depType: string = commandUtil.resolveDepType(opts);

    const domain = getPackageDomainForRoot(process.cwd());

    const packageManager = (opts.packageManager || 'npm') as PackageManagerName;

    console.log({
      deps: dependencyRefs,
      opts,
      selectedDepType: depType,
      packageManager
    });

    // ---

    const installOpts: InstallOpts = {
      domain,
      runtimeDependencies: domain.runtimeDependencies
    };

    if (opts.force) {
      installOpts.useOptionForce = true;
    }

    if (opts.npmLegacyPeerDeps) {
      installOpts.useOptionNpmLegacyPeerDeps = true;
    }

    /* If it has dependencyRefs, just uninstall and reinstall those. Ignore the dep-type option flags. */
    if (dependencyRefs.length) {
      await uninstallDependencies({
        domain,
        dependencies: dependencyRefs
      });

      await installDependencies(installOpts, () => {
      });
      // await domain.reinstallDependencies(dependencyRefs);
    } else if (!!depType) {
      /* No dependencyRefs available but a dep-type is specified. Reinstall only the dep-type dependencies. */

      switch (depType) {
        case 'runtime':
          await domain.removeRuntimeDependencies();

          installOpts.runtimeDependencies = domain.runtimeDependencies;
          delete installOpts.devDependencies;
          delete installOpts.globalDependencies;

          break;

        case 'dev':
          await domain.removeDevDependencies();

          installOpts.devDependencies = domain.devDependencies;
          delete installOpts.runtimeDependencies;
          delete installOpts.globalDependencies;

          break;

        case 'all':
          await domain.removeAllDependencies();

          installOpts.devDependencies = domain.devDependencies;
          installOpts.runtimeDependencies = domain.runtimeDependencies;

          break;
      }

      await installDependencies(installOpts, () => {
      });
    }
  }
};