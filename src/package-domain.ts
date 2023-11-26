import { _delay, readPkgJson } from './util.js';
import { Dependency, DependencyRef, PackageManagerValue, UndoFn } from './types.js';
import { installDependencies, uninstallDependencies } from './installer.js';
import { store } from './store.js';
import fs from 'fs-extra';
import Path from 'node:path';

let pkgJson: any = {};
const npm_lock = 'package-lock.json';
const yarn_lock = 'yarn.lock';
const bun_lock = 'bun.lockb';
const bun_lock_alt = 'bun.lock';
const pnpm_lock = 'pnpm-lock.yaml';
const pnpm_lock_alt = 'pnpm.lock';

const locks = [npm_lock, yarn_lock, bun_lock, bun_lock_alt, pnpm_lock, pnpm_lock_alt];

function hasLockFile(packageRoot: string, filename?: string) {
  if (filename) {
    const file = Path.join(packageRoot, filename);
    return fs.existsSync(file);
  }

  return locks.some(name => {
    const file = Path.join(packageRoot, name);
    return fs.existsSync(file);
  });
}

function inferPackageManagerFromLockFile(packageRoot: string): PackageManagerValue {
  switch (true) {
    case hasLockFile(packageRoot, npm_lock):
      return 'npm';
    case hasLockFile(packageRoot, yarn_lock):
      return 'yarn';
    case hasLockFile(packageRoot, bun_lock):
    case hasLockFile(packageRoot, bun_lock_alt):
      return 'bun';
    case hasLockFile(packageRoot, pnpm_lock):
    case hasLockFile(packageRoot, pnpm_lock_alt):
      return 'pnpm';
    default:
      return 'npm';
  }
}

/**
 * Represents a context that owns a package.json file and can have dependencies installed by node package managers.
 */
export class PackageDomain {
  // private readonly packageConfig: Record<any, any> = {};
  readonly packageName: string = '';
  readonly packageVersion: string = '';
  readonly runtimeDependencies: Dependency[] = [];
  readonly devDependencies: Dependency[] = [];

  /**
   * Create new instance of PackageDomain
   * @param packageRoot The path to the dir containing package.json.
   * @param packageManager
   */
  constructor(
    readonly packageRoot: string, readonly packageManager: PackageManagerValue = inferPackageManagerFromLockFile(packageRoot)
  ) {
    pkgJson = readPkgJson(packageRoot);
    this.packageName = pkgJson['name'];
    this.packageVersion = pkgJson['version'];

    this.loadDependencies();
  }

  private loadDependencies() {
    const depsMap = pkgJson['dependencies'];

    if (depsMap) {
      const entries = Object.entries(depsMap);
      for (let [k, v] of entries) {
        this.runtimeDependencies.push({
          name: k,
          version: v as string,
          isGlobal: false
        });
      }
    }

    const devDepsMap = pkgJson['devDependencies'];

    if (devDepsMap) {
      const entries = Object.entries(devDepsMap);
      for (let [k, v] of entries) {
        this.devDependencies.push({
          name: k,
          version: v as string,
          isGlobal: false
        });
      }
    }
  }

  /**
   * Load dependencies from package.json into the class properties (runtimeDependencies and devDependencies). Useful
   * in the event that the dependency list may have changed after some activities.
   */
  reloadDependencies() {
    pkgJson = readPkgJson(this.packageRoot);
    this.loadDependencies();
  }

  async installRuntimeDependency(dep: DependencyRef) {
    await installDependencies({
      domain: this,
      runtimeInstallInstruction: {
        dependencies: [dep],
        undoFn: async () => {
        }
      }
    });
  }

  async installRuntimeDependencies(depRefs: DependencyRef[], undoFn: UndoFn) {
    await installDependencies({
      domain: this,
      runtimeInstallInstruction: {
        dependencies: depRefs,
        undoFn
      }
    });
  }

  async installDevDependency(depRef: DependencyRef, undoFn: UndoFn) {
    await installDependencies({
      domain: this,
      devInstallInstruction: {
        dependencies: [depRef],
        undoFn
      }
    });
  }

  async installDevDependencies(deps: DependencyRef[], undoFn: UndoFn) {
    await installDependencies({
      domain: this,
      devInstallInstruction: {
        dependencies: deps,
        undoFn
      }
    });
  }

  async removeDependency(dep: string) {
    await uninstallDependencies({
      domain: this,
      dependencies: [dep]
    });
  }

  async removeDependencies(deps: DependencyRef[]) {
    await uninstallDependencies({
      domain: this,
      dependencies: deps
    });
  }

  async removeRuntimeDependencies() {
    await uninstallDependencies({
      domain: this,
      dependencies: this.runtimeDependencies
    });
  }

  async removeDevDependencies() {
    await uninstallDependencies({
      domain: this,
      dependencies: this.devDependencies
    });
  }

  async removeAllDependencies() {
    await uninstallDependencies({
      domain: this,
      dependencies: this.runtimeDependencies.concat(this.devDependencies)
    });
  }

  /**
   * Uninstall and install a dependency. This can serve as a good way to upgrade to the latest available version.
   * @param dep
   * @param undoFn
   */
  async reinstallDependency(dep: DependencyRef, undoFn: UndoFn) {

    await this.removeDependencies([dep] as DependencyRef[]);
    await _delay(500);

    if (this.isRuntimeDependency(dep)) {
      await this.installRuntimeDependency(dep);
    }

    if (this.isDevDependency(dep)) {
      await this.installDevDependency(dep, undoFn);
    }
  }

  /**
   * Uninstall and install dependencies. This can serve as a good way to upgrade to the latest available versions.
   * @param deps
   * @param undoFn
   */
  async reinstallDependencies(deps: DependencyRef[], undoFn: UndoFn) {
    await this.removeDependencies(deps);
    await _delay(500);

    let runtimeDeps: DependencyRef[] = [];
    let devDeps: DependencyRef[] = [];
    for (let dep of deps) {
      if (this.isRuntimeDependency(dep)) {
        runtimeDeps.push(dep);
      } else if (this.isDevDependency(dep)) {
        devDeps.push(dep);
      }
    }

    await this.installRuntimeDependencies(runtimeDeps, undoFn);
    await this.installDevDependencies(devDeps, undoFn);
  }

  async reinstallAllDependencies(undoFn: UndoFn) {
    // const runtimeDeps = Array.from(this.runtimeDependencies);
    // const devDeps = Array.from(this.devDependencies);

    await this.removeDependencies(this.runtimeDependencies);
    await this.removeDependencies(this.devDependencies);
    await _delay(500);
    await this.installRuntimeDependencies(this.runtimeDependencies, undoFn);
    await this.installDevDependencies(this.devDependencies, undoFn);
  }

  async reinstallRuntimeDependencies(undoFn: UndoFn) {
    await this.removeDependencies(this.runtimeDependencies);
    await _delay(500);
    await this.installRuntimeDependencies(this.runtimeDependencies, undoFn);
  }

  async reinstallDevDependencies(undoFn: UndoFn) {
    await this.removeDependencies(this.devDependencies);
    await _delay(500);
    await this.installDevDependencies(this.devDependencies, undoFn);
  }

  isRuntimeDependency(dep: DependencyRef): boolean {
    let isRuntimeDependency: boolean;
    if (typeof dep == 'string') {
      isRuntimeDependency = this.runtimeDependencies.some(item => item.name == dep);
    } else {
      isRuntimeDependency = this.runtimeDependencies.some(item => item.name == dep.name);
    }

    return isRuntimeDependency;
  }

  isDevDependency(dep: DependencyRef): boolean {
    let isDevDependency: boolean;
    if (typeof dep == 'string') {
      isDevDependency = this.devDependencies.some(item => item.name == dep);
    } else {
      isDevDependency = this.devDependencies.some(item => item.name == dep.name);
    }

    return isDevDependency;
  }

  /**
   * Check whether a domain has a dependency installed - be it a runtime or dev dependency.
   * @param dep
   */
  hasDependency(dep: DependencyRef): boolean {
    return this.isDevDependency(dep) || this.isRuntimeDependency(dep);
  }

  /**
   * Takes dependencies from a source package and installs in another package if that package does not have it. This
   * can be useful for package development to make the in-development package's dependencies available to a host package
   * for the sake of testing.
   * @param source
   * @param dest
   */
  static async transitDependencies(source: PackageDomain, dest: PackageDomain) {
    const foreignRuntimeDependencySet = new Set<string>();
    const foreignDevDependencySet = new Set<string>();

    const _source = {
      runtimeDepNames: source.runtimeDependencies.map(dep => dep.name),
      devDepNames: source.devDependencies.map(dep => dep.name)
    };

    // const _dest = {
    //   runtimeDepNames: dest.runtimeDependencies.map(dep => dep.name),
    //   devDepNames: dest.devDependencies.map(dep => dep.name)
    // };

    for (const dep of _source.runtimeDepNames) {
      if (!dest.hasDependency(dep)) {
        foreignRuntimeDependencySet.add(dep);
      }
    }

    for (const dep of _source.devDepNames) {
      if (!dest.hasDependency(dep)) {
        foreignDevDependencySet.add(dep);
      }
    }

    if (foreignRuntimeDependencySet.size) {
      await dest.installRuntimeDependencies(Array.from(foreignRuntimeDependencySet), () => Promise.resolve());
    }

    if (foreignDevDependencySet.size) {
      await dest.installDevDependencies(Array.from(foreignDevDependencySet), () => Promise.resolve());
    }

    store.saveTransitLink({
      id: `${source.packageName}::to::${dest.packageName}`,
      source,
      dest,
      transitedDependencies: {
        runtime: Array.from(foreignRuntimeDependencySet),
        dev: Array.from(foreignDevDependencySet)
      }
    });
  }

  /**
   * Remove dependencies from this package that come from the other package.
   * @param source
   * @param dest
   */
  static async removeTransitDependencies(source: PackageDomain, dest: PackageDomain) {
    // careful!
    const transitLinks = store.getTransitLinks();

    const link = transitLinks.find(item => {
      return item.source.packageName == source.packageName && item.dest.packageName == dest.packageName;
    });

    if (link) {
      const runtimeDependencies = link.transitedDependencies.runtime;
      const devDependencies = link.transitedDependencies.dev;

      await uninstallDependencies({
        domain: link.dest,
        dependencies: runtimeDependencies.concat(devDependencies)
      });

      // remove link from store
      store.removeTransitLink(link.id);
    }
    // return true;
  }
}

export function getPackageDomainForRoot(rootPath: string) {
  return new PackageDomain(rootPath);
}