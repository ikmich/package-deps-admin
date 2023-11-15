import { createRequire } from 'module';
import Path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { DependencyRefArray, PackageManagerName } from './types.js';
import shell from 'shelljs';
import { _env } from '@ikmich/utilis';

export const require = createRequire(import.meta.url);

export function readPkgJson(packageRoot: string): object {
  let file = Path.join(packageRoot, 'package.json');
  if (!fs.existsSync(file)) {
    throw (new Error(`File not found - ${file}`));
  }

  return require(file) as object;
}

export function assertPackageRoot(domainRoot: string) {
  const isDir = fs.statSync(domainRoot).isDirectory();
  if (!fs.existsSync(domainRoot) || !isDir) {
    throw chalk.red(`package root dir not found - ${domainRoot}`);
  }

  let file = Path.join(domainRoot, 'package.json');
  if (!fs.existsSync(file)) {
    throw chalk.red(`package.json file not found - ${file}`);
  }
}

export function isPackageManagerInstalled(packageManager: PackageManagerName) {
  const output = shell.which(packageManager)?.trim();
  return !!output;
}

export function assertPackageManager(packageManager: PackageManagerName) {
  const msg = `!ERROR! It seems package manager "${packageManager}" is not installed. Install it and try again, or choose another package manager that is installed.`;
  if (!isPackageManagerInstalled(packageManager)) {
    throw chalk.red(msg);
  }
}

export const depsUtil = {
  getRefString(deps: DependencyRefArray, includeVersion: boolean = false): string {
    let out = '';

    for (let dep of deps) {
      if (typeof dep == 'string') {
        out += `${dep}`;
      } else {
        out += `${dep.name}`;

        if (includeVersion) {
          out += `@${dep.version}`;
        }
      }

      out += ' ';
    }

    return out.trim();
  }
};

export function _ifDev(fn: () => any) {
  if (_env('node_env') == 'development') {
    fn();
  }
}