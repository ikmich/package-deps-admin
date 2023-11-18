import { createRequire } from 'module';
import Path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { DependencyRef, DependencyRefArray, PackageManagerName } from './types.js';
import shell from 'shelljs';

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
  flatten(deps: DependencyRefArray, includeVersion: boolean = false): string {
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

export const dependencyRefUtil = {
  filter(deps: DependencyRefArray, cb: (dependencyName: string) => boolean): DependencyRefArray {
    const filtered: DependencyRefArray = [];
    for (let dep of deps) {
      const name = typeof dep == 'string' ? dep : dep.name;
      if (cb(name)) {
        filtered.push(dep);
      }
    }

    return filtered;
  },

  find(deps: DependencyRefArray, name: string): DependencyRef | undefined {
    for (let dep of deps) {
      if (typeof dep == 'string') {
        if (dep === name) {
          return dep;
        }
      } else {
        if (dep.name === name) {
          return dep;
        }
      }
    }
  }
};

export const optionFlagsUtil = {
  flatten(options: string[]): string {
    let out = '';
    for (let opt of options) {
      const rex = /^-(-?)/;
      if (!rex.test(opt)) continue;
      out += `${opt} `;
    }
    return out;
  }
};

export function _ifDev(fn: () => any) {
  if (process.env.NODE_ENV == 'development') {
    fn();
  }
}

/**
 * Pauses execution for a period.
 * @param ms
 * @param msg Optional message to display while waiting.
 */
export async function _delay(ms: number, msg?: string) {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    if (msg) {
      console.log(msg);
    }
    setTimeout(() => {
      resolve(undefined);
    }, ms);
  });
}