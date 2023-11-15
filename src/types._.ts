import { PackageDomain } from './package-domain.js';

export type TransitedDeps = {
  runtime: Set<string>;
  dev: Set<string>;
}

export type TransitLink = {
  from: PackageDomain;
  dest: PackageDomain;
  transitedDependencies: TransitedDeps;
}
