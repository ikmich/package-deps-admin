import Conf from 'conf';
import { readPkgJson } from './util.js';
import { TransitLink } from './types._.js';
import { logInfo } from './log.util.js';

const conf = new Conf({
  projectName: 'package-deps-admin'
});

const keys = {
  packageVersion: 'version',
  transitLinks: 'transit_links'
};

export class Store {
  private readonly cachedVersion: string;
  private readonly activeVersion: string;

  constructor() {
    const pkgJson: any = readPkgJson(process.cwd());
    this.activeVersion = pkgJson['version'] || '';
    this.cachedVersion = this.get<string>(keys.packageVersion) || '';

    if (this.activeVersion !== this.cachedVersion) {
      logInfo('[store] New version!'); // migration? cleanup?
      this.set(keys.packageVersion, this.activeVersion);
      this.cachedVersion = this.activeVersion;
    }
  }

  get<T>(key: string, defaultVal?: T | null): T | null {
    try {
      let value = conf.get(key, defaultVal);
      if (value) {
        return value as T;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  set(key: string, value: any) {
    conf.set(key, value);
  }

  saveTransitLink(transitLink: TransitLink) {
    let links = this.getTransitLinks();

    const hasExisting = links.some(link => link.id === transitLink.id);
    if (hasExisting) {
      // remove existing
      const index = links.findIndex(item => item.id == transitLink.id);
      links.splice(index, 1);
    }

    links.push(transitLink);
    conf.set(keys.transitLinks, links);
  }

  getTransitLinks() {
    return this.get<TransitLink[]>(keys.transitLinks) || [];
  }

  removeTransitLink(id: string) {
    const links = this.getTransitLinks();
    const idx = links.findIndex(item => item.id === id);
    links.splice(idx, 1);
    this.set(keys.transitLinks, links);
  }

  clearTransitLinks() {
    conf.delete(keys.transitLinks);
  }
}

export const store = new Store();