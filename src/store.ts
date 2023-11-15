import Conf from 'conf';
import { readPkgJson } from './util.js';
import { TransitLink } from './types._.js';

const conf = new Conf({
  projectName: 'package-deps-admin'
});

const keys = {
  packageVersion: 'version',
  transitLinks: 'transit_links',
  snapshots: 'snapshots'
};

export class Store {
  private readonly packageVersion: string;

  constructor() {
    const pkgJson: any = readPkgJson(process.cwd());
    const activeVersion = pkgJson['version'] || '';
    this.packageVersion = this.get<string>(keys.packageVersion);

    if (activeVersion !== this.packageVersion) {
      console.log('New version!'); // migration? cleanup?
      this.set(keys.packageVersion, activeVersion);
      this.packageVersion = activeVersion;
    }
  }

  // getString(key: string): string {
  //   return this.get<string>(key);
  // }

  get<T extends any>(key: string, defaultVal?: T | null): T {
    return conf.get(key, defaultVal) as T;
  }

  set(key: string, value: any) {
    conf.set(key, value);
  }

  saveTransitLink(transitLink: TransitLink) {
    const value = conf.get(keys.transitLinks);
    let links = new Set<TransitLink>();
    if (value) {
      links = value as Set<TransitLink>;
    }
    links.add(transitLink);
    conf.set(keys.transitLinks, links);
  }

  getTransitLinks() {
    const value = conf.get(keys.transitLinks);
    if (value) {
      return value as Set<TransitLink>;
    }
    return new Set<TransitLink>();
  }
}

export const store = new Store();