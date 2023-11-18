export type PackageManagerValue = 'npm' | 'yarn' | 'bun' | 'pnpm';

export type Dependency = {
  name: string;
  version: string;
  isGlobal?: boolean;
}
export type DependencyRef = string | Dependency;
export type DependencyRefArray = DependencyRef[];

export type UndoFn = () => Promise<any>