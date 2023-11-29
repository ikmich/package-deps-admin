import { createRequire } from 'module';
import Path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { DependencyRef, PackageManagerValue } from './types.js';
import shell from 'shelljs';
import { logWarn } from './log.util.js';

export const require = createRequire(import.meta.url);

export function readPkgJson(packageRoot: string): object {
  let file = Path.join(packageRoot, 'package.json');
  if (!fs.existsSync(file)) {
    logWarn(`[WARN] package.json file not found at ${file}`);
    return {};
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

export function isPackageManagerInstalled(packageManager: PackageManagerValue) {
  const output = shell.which(packageManager)?.trim();
  return !!output;
}

export function assertPackageManager(packageManager: PackageManagerValue) {
  const msg = `!ERROR! It seems package manager "${packageManager}" is not installed. Install it and try again, or choose another package manager that is installed.`;
  if (!isPackageManagerInstalled(packageManager)) {
    throw chalk.red(msg);
  }
}

export const depsUtil = {
  flatten(deps: DependencyRef[], includeVersion: boolean = false): string {
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
  filter(deps: DependencyRef[], cb: (dependencyName: string) => boolean): DependencyRef[] {
    const filtered: DependencyRef[] = [];
    for (let dep of deps) {
      const name = typeof dep == 'string' ? dep : dep.name;
      if (cb(name)) {
        filtered.push(dep);
      }
    }

    return filtered;
  },

  find(deps: DependencyRef[], name: string): DependencyRef | undefined {
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
  },

  containsByName(deps: DependencyRef[], dependencyName: string): boolean {
    for (let dep of deps) {
      if (typeof dep == 'string') {
        if (dep === dependencyName) {
          return true;
        }
      } else {
        if (dep.name === dependencyName) {
          return true;
        }
      }
    }
    return false;
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

export function _fn<T extends any>(f: () => T) {
  return f();
}

export const colorUtil = {
  yellowText(s?: string) {
    return chalk.yellow(s);
  },

  blueText(s?: string) {
    return chalk.blueBright(s);
  }
};

export const emptyUndoFn = () => Promise.resolve();