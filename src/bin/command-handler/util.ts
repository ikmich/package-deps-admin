import { CliOpts } from '../index.js';

export const commandUtil = {
  isDepType(s: string): boolean {
    return ['runtime', 'dev', 'all'].includes(s);
  },

  resolveDepType(opts: CliOpts): string {
    let depType: string = '';
    const optKeys = Object.keys(opts);
    for (let k of optKeys) {
      if (commandUtil.isDepType(k)) {
        depType = k;
      }
    }

    if (!depType || depType.length === 0) {
      depType = 'all';
    }

    return depType;
  },

};