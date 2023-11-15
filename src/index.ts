import { PackageDomain } from './package-domain.js';
import { installDependencies } from './installer.js';
import { inspect } from 'util';
import { _delay, _fn } from '@ikmich/utilis';

export * from './types.js';
export { installDependencies };

const domain = new PackageDomain('package-deps-admin', process.cwd());

console.log(
  inspect({
    deps: domain.runtimeDependencies,
    devDeps: domain.devDependencies
  }, false, 8, true)
);


await domain.installRuntimeDependency('case');
await _delay(3000, 'pls wait...');
await domain.removeDependency('case');


// {
//   let deps = ['pg', 'sqlite3'];
//   await domain.installRuntimeDependencies(deps);
//
//   await _delay(5000);
//   await domain.removeDependencies(deps);
// }


// {
//   await domain.installDependency({
//     name: 'knexhelpers',
//     version: '0.0.27-alpha'
//   });
//
//   await _delay(3000);
//   await domain.removeDependency('knexhelpers');
// }


// {
//   await domain.installDevDependency('ts-node');
//   await _delay(2000);
//   await domain.installDevDependency('ts-node');
// }


// await installDependencies({
//   packageManager: 'npm',
//   packageRoot: process.cwd(),
//   devDependencies: ['ts-node', '@types/node'],
//   dependencies: ['pg']
// });
