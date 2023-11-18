import { Command } from 'commander';
import { InstallCommandBase } from './install-command.base.js';
import { getPackageDomainForRoot } from '../../package-domain.js';

export const uninstallCommandHandler = {
  async execute(command: Command) {
    const resolvedInputs = InstallCommandBase.resolveInputs(command);

    const domain = getPackageDomainForRoot(process.cwd());

    const outcomes = {
      removeAllInDomain: resolvedInputs.hasAllOption && !resolvedInputs.hasDependencies,
      removeListedDependenciesInDomain: resolvedInputs.hasDependencies,
      removeOnlyRuntimeDeps: resolvedInputs.isRuntimeDepType && !resolvedInputs.hasDependencies,
      removeOnlyDevDeps: resolvedInputs.isDevDepType && !resolvedInputs.hasDependencies,
      removeGlobalDeps: false
    };

    const deps = resolvedInputs.dependencies || [];

    switch (true) {
      case outcomes.removeAllInDomain: {
        await domain.removeAllDependencies();
        break;
      }

      case outcomes.removeListedDependenciesInDomain: {
        if (deps.length) {
          await domain.removeDependencies(deps);
        }
        break;
      }

      case outcomes.removeOnlyRuntimeDeps: {
        await domain.removeRuntimeDependencies();
        break;
      }

      case outcomes.removeOnlyDevDeps: {
        await domain.removeDevDependencies();
        break;
      }

      case outcomes.removeGlobalDeps: {
        // to be implemented.
        break;
      }
    }
  }
};