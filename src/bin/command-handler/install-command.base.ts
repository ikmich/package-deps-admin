import { CliOpts, DepType } from '../index.js';
import { Command } from 'commander';
import { DependencyRef } from '../../types.js';
import { getPackageDomainForRoot, PackageDomain } from '../../package-domain.js';

export type ResolvedInputs = {
  dependencyType?: DepType;
  dependencyNames?: string[];
  hasDependencyRefs: boolean;
  usingForceOption: boolean;
  usingNpmLegacyPeerDepsOptions: boolean;
  packageManager?: string;
  domain: PackageDomain;
  isRuntimeDeps: boolean;
  isDevDeps: boolean;
  hasDepTypeOption: boolean;
}

export const InstallCommandBase = {
  resolveInputs(command: Command): ResolvedInputs {
    const opts = command.opts<CliOpts>();

    const dependencyRefs = this.getDependencyRefs(command);

    const depType = this.resolveDepType(opts);

    return {
      dependencyNames: dependencyRefs,
      hasDependencyRefs: Array.isArray(dependencyRefs) && dependencyRefs.length > 0,
      usingForceOption: opts.force ?? false,
      usingNpmLegacyPeerDepsOptions: opts.npmLegacyPeerDeps ?? false,
      dependencyType: depType as DepType,
      packageManager: opts.packageManager,
      domain: getPackageDomainForRoot(process.cwd()),
      isDevDeps: depType == 'dev',
      isRuntimeDeps: depType == 'runtime',
      hasDepTypeOption: typeof opts.dev != 'undefined' || typeof opts.runtime != 'undefined' /*|| typeof opts['global'] == 'undefined'*/
    };
  },

  getDependencyRefs(command: Command) {
    const dependencyRefs = Array.from(command.args) || [];
    dependencyRefs.shift();
    return dependencyRefs;
  },

  isValidDepType(s: string): boolean {
    return ['runtime', 'dev'].includes(s);
  },

  resolveDepType(opts: CliOpts): string {
    let depType: string = '';
    const optKeys = Object.keys(opts);
    for (let k of optKeys) {
      if (this.isValidDepType(k)) {
        depType = k;
      }
    }

    if (!depType || depType.length === 0) {
      depType = 'runtime';
    }

    return depType;
  }
};

