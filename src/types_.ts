import { PackageDomain } from './package-domain.js';

export type TransitedDeps = {
  runtime: Array<string>;
  dev: Array<string>;
}

export type TransitLink = {
  id: string;
  source: PackageDomain;
  dest: PackageDomain;
  transitedDependencies: TransitedDeps;
}
