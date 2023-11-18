import { Command } from 'commander';
import { installDependencies, InstallOpts, uninstallDependencies } from '../../installer.js';
import { CliOpts } from '../index.js';
import { dependencyRefUtil, emptyUndoFn } from '../../util.js';
import { InstallCommandBase } from './install-command.base.js';
import { PackageManagerValue } from '../../types.js';
import { logInfo } from '../../log.util.js';

export const reinstallCommandHandler = {
  async execute(command: Command) {
    console.log('=={ REINSTALL }==');

    const opts = command.opts<CliOpts>();
    const resolvedInputs = InstallCommandBase.resolveInputs(command);
    const dependencyRefs = resolvedInputs.dependencies || [];

    let depType = resolvedInputs.dependencyType;
    const domain = resolvedInputs.domain;

    console.log({
      deps: dependencyRefs,
      opts,
      selectedDepType: depType,
      hasDepTypeOpt: resolvedInputs.hasDepTypeOption,
      packageManager: resolvedInputs.packageManager
    });

    // ---

    let installOpts: InstallOpts = {
      domain,
      useOptionForce: resolvedInputs.usingForceOption,
      useOptionNpmLegacyPeerDeps: resolvedInputs.usingNpmLegacyPeerDepsOptions
    };

    if (resolvedInputs.packageManager) {
      installOpts.packageManager = resolvedInputs.packageManager as PackageManagerValue;
    }

    /* If it has dependencyRefs, just uninstall and reinstall those. Ignore the dep-type option flags. */
    switch (true) {

      case resolvedInputs.hasDependencies: {
        logInfo('-> has dependencies');
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
        break;
      }

      case resolvedInputs.hasDepTypeOption && !!depType: {
        /* No dependencyRefs available but a dep-type is specified. Reinstall only the dep-type dependencies. */
        logInfo('-> has dependency type');
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
        }

        await installDependencies(installOpts);
        break;
      }

      default: {
        logInfo('No deps');
        await domain.removeAllDependencies();

        installOpts = {
          ...installOpts,
          domain,
          runtimeInstallInstruction: {
            dependencies: domain.runtimeDependencies,
            undoFn: emptyUndoFn
          },
          devInstallInstruction: {
            dependencies: domain.devDependencies,
            undoFn: emptyUndoFn
          },
          globalInstallInstruction: undefined
        };

        await installDependencies(installOpts);
      }
    }
  }
};