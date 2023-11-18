import { Command } from 'commander';
import { getPackageDomainForRoot } from '../../package-domain.js';
import { installDependencies, InstallOpts, uninstallDependencies } from '../../installer.js';
import { CliOpts } from '../index.js';
import { PackageManagerName } from '../../types.js';
import { commandUtil, dependencyRefUtil } from '../../util.js';

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

    let installOpts: InstallOpts = {
      domain
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

      installOpts = {
        ...installOpts,
        runtimeInstallInstruction: {
          dependencies: domain.runtimeDependencies.filter(item => {
            return dependencyRefUtil.containsByName(dependencyRefs, item.name);
          }),
          undoFn: async () => {
          }
        },
        devInstallInstruction: {
          dependencies: domain.devDependencies.filter(item => {
            return dependencyRefUtil.containsByName(dependencyRefs, item.name);
          }),
          undoFn: async () => {
          }
        }
      };

      await installDependencies(installOpts);
    } else if (!!depType) {
      /* No dependencyRefs available but a dep-type is specified. Reinstall only the dep-type dependencies. */

      switch (depType) {
        case 'runtime':
          await domain.removeRuntimeDependencies();

          installOpts = {
            ...installOpts,
            domain,
            runtimeInstallInstruction: {
              dependencies: domain.runtimeDependencies,
              undoFn: async () => {
              }
            },
            devInstallInstruction: undefined,
            globalInstallInstruction: undefined
          };

          break;

        case 'dev':
          await domain.removeDevDependencies();

          installOpts = {
            ...installOpts,
            domain,
            devInstallInstruction: {
              dependencies: domain.devDependencies,
              undoFn: async () => {
              }
            },
            runtimeInstallInstruction: undefined,
            globalInstallInstruction: undefined
          };

          break;

        case 'all':
          await domain.removeAllDependencies();

          installOpts = {
            ...installOpts,
            domain,
            runtimeInstallInstruction: {
              dependencies: domain.runtimeDependencies,
              undoFn: async () => {
              }
            },
            devInstallInstruction: {
              dependencies: domain.devDependencies,
              undoFn: async () => {
              }
            },
            globalInstallInstruction: undefined
          };
          break;
      }

      await installDependencies(installOpts);
    }
  }
};