import { Command } from 'commander';
import { InstallCommandBase } from './install-command.base.js';
import { logError } from '../../log.util.js';
import { installDependencies, InstallOpts } from '../../installer.js';
import { getPackageDomainForRoot } from '../../package-domain.js';
import { emptyUndoFn } from '../../util.js';

export const installCommandHandler = {
  async execute(command: Command) {
    console.log('=={ INSTALL }==');

    const resolvedInputs = InstallCommandBase.resolveInputs(command);

    if (!resolvedInputs.hasDependencies) {
      logError(`!ERROR! No dependencies provided.`);
      return;
    }

    // const depType = resolvedInputs.dependencyType;
    const dependencies = resolvedInputs.dependencies || [];
    const domain = getPackageDomainForRoot(process.cwd());

    /* Among the input dep-refs, we need to find which ones are dev and runtime deps. Also need to factor in the
    * dev-type option passed in. If dev-type option is passed, that should override the dep-type distinction from the
    * domain. */

    let installOpts: InstallOpts = {
      domain,
      useOptionNpmLegacyPeerDeps: resolvedInputs.usingNpmLegacyPeerDepsOptions,
      useOptionForce: resolvedInputs.usingForceOption
    };

    const useCases = {
      hasDependencyType: resolvedInputs.hasDepTypeOption
    };

    if (useCases.hasDependencyType) {
      // use dependency type passed in cli

      if (resolvedInputs.dependencyType) {
        switch (resolvedInputs.dependencyType) {
          case 'dev':
            await domain.installDevDependencies(dependencies, emptyUndoFn);
            break;
          case 'runtime':
            await domain.installRuntimeDependencies(dependencies, emptyUndoFn);
            break;
        }
      }
    } else {
      // resolve dependency types according to the domain
      const inputRuntimeDeps: string[] = [];
      const inputDevDeps: string[] = [];

      for (let dep of dependencies) {
        if (domain.runtimeDependencies.some(item => item.name === dep)) {
          inputRuntimeDeps.push(dep);
        } else if (domain.devDependencies.some(item => item.name === dep)) {
          inputDevDeps.push(dep);
        }
      }

      if (inputRuntimeDeps.length || inputDevDeps.length) {
        if (inputRuntimeDeps.length) {
          await domain.installRuntimeDependencies(dependencies, emptyUndoFn);
        }

        if (inputDevDeps.length) {
          await domain.installDevDependencies(dependencies, emptyUndoFn);
        }
      } else {
        // delete installOpts.domain;
        installOpts.runtimeInstallInstruction = {
          dependencies: dependencies,
          undoFn: emptyUndoFn
        };
        await installDependencies(installOpts);
      }
    }

  }
};