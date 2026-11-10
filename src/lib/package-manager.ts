export type PackageManagerType = 'bun' | 'pnpm' | 'yarn' | 'npm';

export interface PackageJsonLike {
  packageManager?: string;
  engines?: {
    node?: string;
  };
}

/**
 * Detects the package manager from package.json and repository files.
 * Priority:
 * 1. package.json `packageManager` field (e.g. "bun@1.2.4", "pnpm@9.0.0")
 * 2. Lockfiles in repository root:
 *    - bun.lock or bun.lockb -> bun
 *    - pnpm-lock.yaml -> pnpm
 *    - yarn.lock -> yarn
 *    - package-lock.json -> npm
 * 3. Default: npm
 */
export function detectPackageManager(
  packageJson: PackageJsonLike | null | undefined,
  existingFiles: string[] = []
): PackageManagerType {
  const pmField = packageJson?.packageManager;
  if (pmField && typeof pmField === 'string') {
    const trimmed = pmField.trim().toLowerCase();
    if (trimmed.startsWith('bun')) return 'bun';
    if (trimmed.startsWith('pnpm')) return 'pnpm';
    if (trimmed.startsWith('yarn')) return 'yarn';
    if (trimmed.startsWith('npm')) return 'npm';
  }

  const fileSet = new Set(existingFiles.map(f => f.toLowerCase()));
  if (fileSet.has('bun.lock') || fileSet.has('bun.lockb')) return 'bun';
  if (fileSet.has('pnpm-lock.yaml')) return 'pnpm';
  if (fileSet.has('yarn.lock')) return 'yarn';
  if (fileSet.has('package-lock.json')) return 'npm';

  return 'npm';
}

export function getProjectCommandArgs(
  pm: PackageManagerType,
  operation: 'check' | 'build' | 'install',
  existingFiles: string[] = []
): { program: PackageManagerType; args: string[] } {
  const fileSet = new Set(existingFiles.map(f => f.toLowerCase()));

  if (operation === 'check') {
    return { program: pm, args: ['run', 'check'] };
  }

  if (operation === 'build') {
    return { program: pm, args: ['run', 'build'] };
  }

  if (operation === 'install') {
    switch (pm) {
      case 'bun':
        return {
          program: 'bun',
          args: fileSet.has('bun.lock') ? ['install', '--frozen-lockfile'] : ['install'],
        };
      case 'pnpm':
        return {
          program: 'pnpm',
          args: fileSet.has('pnpm-lock.yaml') ? ['install', '--frozen-lockfile'] : ['install'],
        };
      case 'yarn':
        return {
          program: 'yarn',
          args: fileSet.has('yarn.lock') ? ['install', '--immutable'] : ['install'],
        };
      case 'npm':
      default:
        return {
          program: 'npm',
          args: fileSet.has('package-lock.json') ? ['ci'] : ['install'],
        };
    }
  }

  throw new Error(`Unsupported operation: ${operation}`);
}

export function getDevServerArgs(pm: PackageManagerType, port = 4321): { program: PackageManagerType; args: string[] } {
  return {
    program: pm,
    args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  };
}
