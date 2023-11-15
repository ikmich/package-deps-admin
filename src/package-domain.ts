import { _delay } from '@ikmich/utilis';
import { readPkgJson } from './util.js';
import { Dependency, DependencyRef, DependencyRefArray, TPackageManager } from './types.js';
import { installDependencies, uninstallDependencies } from './installer.js';
import { store } from './store.js';

/**
 * Represents a context that owns a package.json file and can have dependencies installed by node package managers.
 */
export class PackageDomain {
  private readonly packageConfig: Record<any, any> = {};
  readonly packageName: string = '';
  readonly runtimeDependencies: Dependency[] = [];
  readonly devDependencies: Dependency[] = [];

  /**
   * Create new instance of PackageDomain
   * @param tag The name of the app or project that owns the package.json config.
   * @param packageRoot The path to the dir containing package.json.
   * @param packageManager
   */
  constructor(readonly tag: string, readonly packageRoot: string, readonly packageManager: TPackageManager = 'npm') {
    this.packageConfig = readPkgJson(packageRoot);
    this.packageName = this.packageConfig['name'];
    this.reloadDependencies();
  }

  /**
   * Load dependencies from package.json into the class properties (runtimeDependencies and devDependencies). Useful
   * in the event that the dependency list may have changed after some activities.
   */
  reloadDependencies() {
    const depsMap = this.packageConfig['dependencies'];

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

    const devDepsMap = this.packageConfig['devDependencies'];

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

  async installRuntimeDependency(dep: DependencyRef) {
    // await this.__installDependency(dep);
    await installDependencies({
      packageRoot: this.packageRoot,
      packageManager: this.packageManager,
      dependencies: [dep] as DependencyRefArray
    });
  }

  async installRuntimeDependencies(deps: DependencyRefArray) {
    await installDependencies({
      packageRoot: this.packageRoot,
      packageManager: this.packageManager,
      dependencies: deps
    });
  }

  async installDevDependency(dep: DependencyRef) {
    await installDependencies({
      packageManager: this.packageManager,
      packageRoot: this.packageRoot,
      devDependencies: [dep] as DependencyRefArray
    });
  }

  async installDevDependencies(deps: DependencyRefArray) {
    // await this.__installDependencies(deps, true);
    await installDependencies({
      packageRoot: this.packageRoot,
      packageManager: this.packageManager,
      devDependencies: deps
    });
  }

  async removeDependency(dep: string) {
    await uninstallDependencies({
      packageManager: this.packageManager,
      packageRoot: this.packageRoot,
      dependencies: [dep]
    });
  }

  async removeDependencies(deps: DependencyRefArray) {
    let packageRefs = '';
    for (let dep of deps) {
      if (typeof dep == 'string') {
        packageRefs += `${dep} `;
      } else {
        packageRefs += `${dep.name} `;
      }
    }

    await uninstallDependencies({
      packageManager: this.packageManager,
      packageRoot: this.packageRoot,
      dependencies: deps
    });
  }

  /**
   * Uninstall and install a dependency. This can serve as a good way to upgrade to the latest available version.
   * @param dep
   */
  async reinstallDependency(dep: DependencyRef) {
    await this.removeDependencies([dep] as DependencyRefArray);
    await _delay(1000);
    await this.installRuntimeDependency(dep);
  }

  /**
   * Uninstall and install dependencies. This can serve as a good way to upgrade to the latest available versions.
   * @param deps
   */
  async reinstallDependencies(deps: DependencyRefArray) {
    await this.removeDependencies(deps);
    await _delay(1000);
    await this.installRuntimeDependencies(deps);
  }

  /**
   * Takes dependencies from a source package and installs in another package if that package does not have it. This
   * can be useful for package development to make the in-development package's dependencies available to a host package
   * for the sake of testing.
   * @param from
   * @param dest
   */
  static async transitDependencies(from: PackageDomain, dest: PackageDomain) {
    const foreignRuntimeDependencySet = new Set<string>();
    const foreignDevDependencySet = new Set<string>();

    const _from = {
      runtimeDepNames: from.runtimeDependencies.map(dep => dep.name),
      devDepNames: from.devDependencies.map(dep => dep.name)
    };

    const _dest = {
      runtimeDepNames: dest.runtimeDependencies.map(dep => dep.name),
      devDepNames: dest.devDependencies.map(dep => dep.name)
    };

    for (const dep of _dest.runtimeDepNames) {
      if (_from.runtimeDepNames.includes(dep)) continue;
      else foreignRuntimeDependencySet.add(dep);
    }

    for (const dep of _dest.devDepNames) {
      if (_from.devDepNames.includes(dep)) continue;
      else foreignDevDependencySet.add(dep);
    }

    if (foreignRuntimeDependencySet.size) {
      await dest.installRuntimeDependencies(Array.from(foreignRuntimeDependencySet));
    }

    if (foreignDevDependencySet.size) {
      await dest.installDevDependencies(Array.from(foreignDevDependencySet));
    }

    store.saveTransitLink({
      from,
      dest,
      transitedDependencies: {
        runtime: foreignRuntimeDependencySet,
        dev: foreignDevDependencySet
      }
    });
  }

  /**
   * Remove dependencies from this package that come from the other package.
   * @param from
   * @param to
   */
  static async removeTransitDependencies(from: PackageDomain, to: PackageDomain): Promise<boolean> {
    // careful!
    try {
      const link = Array.from(store.getTransitLinks()).find(item => item.from == from && item.dest == to);
      if (link) {
        const runtimeDependencies = link.transitedDependencies.runtime;
        const devDependencies = link.transitedDependencies.dev;

        await link.dest.removeDependencies(Array.from(runtimeDependencies));
        await link.dest.removeDependencies(Array.from(devDependencies));
      }
      return true;
    } catch (e) {
      return false;
    }
  }
}

// to-do - optional dependencies