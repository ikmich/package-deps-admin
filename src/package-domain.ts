import { _delay } from '@ikmich/utilis';
import { readPkgJson } from './util.js';
import { Dependency, DependencyRef, DependencyRefArray, PackageManagerName } from './types.js';
import { installDependencies, uninstallDependencies } from './installer.js';
import { store } from './store.js';

let pkgJson: any = {};

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
   * @param tag The name of the app or project that owns the package.json config.
   * @param packageRoot The path to the dir containing package.json.
   * @param packageManager
   */
  constructor(readonly tag: string, readonly packageRoot: string, readonly packageManager: PackageManagerName = 'npm') {
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

    const _dest = {
      runtimeDepNames: dest.runtimeDependencies.map(dep => dep.name),
      devDepNames: dest.devDependencies.map(dep => dep.name)
    };

    for (const dep of _source.runtimeDepNames) {
      if (!_dest.runtimeDepNames.includes(dep)) {
        foreignRuntimeDependencySet.add(dep);
      }
    }

    for (const dep of _source.devDepNames) {
      if (!_dest.devDepNames.includes(dep)) {
        foreignDevDependencySet.add(dep);
      }
    }

    if (foreignRuntimeDependencySet.size) {
      await dest.installRuntimeDependencies(Array.from(foreignRuntimeDependencySet));
    }

    if (foreignDevDependencySet.size) {
      await dest.installDevDependencies(Array.from(foreignDevDependencySet));
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
        packageManager: link.dest.packageManager,
        packageRoot: link.dest.packageRoot,
        dependencies: runtimeDependencies.concat(devDependencies)
      });

      // remove link from store
      store.removeTransitLink(link.id);
    }
    // return true;
  }
}
