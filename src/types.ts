export type TPackageManager = 'npm' | 'yarn' | 'bun' | 'pnpm';

export type Dependency = {
  name: string;
  version: string;
  isGlobal?: boolean;
}
export type DependencyRef = string | Dependency;
export type DependencyRefArray = string[] | Dependency[];

export type InstallOpts = {
  packageRoot: string;
  dependencies?: DependencyRefArray;
  devDependencies?: DependencyRefArray;
  globalDependencies?: DependencyRefArray;
  packageManager?: TPackageManager;
}

export type UninstallOpts = {
  packageRoot: string;
  dependencies: DependencyRefArray,
  packageManager: TPackageManager
}