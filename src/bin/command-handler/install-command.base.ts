import { CliOpts, DepType } from '../index.js';
import { Command } from 'commander';
import { getPackageDomainForRoot, PackageDomain } from '../../package-domain.js';

export type ResolvedInputs = {
  dependencyType?: DepType;
  dependencies?: string[];
  hasDependencies: boolean;
  usingForceOption: boolean;
  usingNpmLegacyPeerDepsOptions: boolean;
  packageManager?: string;
  domain: PackageDomain;
  isRuntimeDepType: boolean;
  isDevDepType: boolean;
  hasDepTypeOption: boolean;
  hasAllOption: boolean;
}

export const InstallCommandBase = {
  resolveInputs(command: Command): ResolvedInputs {
    const opts = command.opts<CliOpts>();

    const deps = this.getDependencies(command);

    const depType = this.resolveDepType(opts);

    return {
      dependencies: deps,
      hasDependencies: Array.isArray(deps) && deps.length > 0,
      usingForceOption: opts.force ?? false,
      usingNpmLegacyPeerDepsOptions: opts.npmLegacyPeerDeps ?? false,
      dependencyType: depType as DepType,
      packageManager: opts.packageManager,
      domain: getPackageDomainForRoot(process.cwd()),
      isDevDepType: depType == 'dev',
      isRuntimeDepType: depType == 'runtime',
      hasAllOption: opts.all === true,
      hasDepTypeOption: typeof opts.dev != 'undefined' || typeof opts.runtime != 'undefined' /*|| typeof opts['global'] == 'undefined'*/
    };
  },

  getDependencies(command: Command) {
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

