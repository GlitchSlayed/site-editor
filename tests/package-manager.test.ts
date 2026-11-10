import { describe, expect, it } from 'vitest';
import {
  detectPackageManager,
  getProjectCommandArgs,
  getDevServerArgs,
} from '../src/lib/package-manager';

describe('package manager detection and arguments', () => {
  it('detects package manager from packageManager field in package.json', () => {
    expect(detectPackageManager({ packageManager: 'bun@1.2.4' })).toBe('bun');
    expect(detectPackageManager({ packageManager: 'pnpm@9.1.0' })).toBe('pnpm');
    expect(detectPackageManager({ packageManager: 'yarn@4.1.0' })).toBe('yarn');
    expect(detectPackageManager({ packageManager: 'npm@10.5.0' })).toBe('npm');
  });

  it('falls back to lockfiles when packageManager is absent', () => {
    expect(detectPackageManager({}, ['bun.lock'])).toBe('bun');
    expect(detectPackageManager({}, ['bun.lockb'])).toBe('bun');
    expect(detectPackageManager({}, ['pnpm-lock.yaml'])).toBe('pnpm');
    expect(detectPackageManager({}, ['yarn.lock'])).toBe('yarn');
    expect(detectPackageManager({}, ['package-lock.json'])).toBe('npm');
  });

  it('defaults to npm when neither packageManager nor lockfiles exist', () => {
    expect(detectPackageManager({})).toBe('npm');
    expect(detectPackageManager(null)).toBe('npm');
  });

  it('generates correct frozen-lockfile and standard install arguments', () => {
    // Bun
    expect(getProjectCommandArgs('bun', 'install', ['bun.lock'])).toEqual({
      program: 'bun',
      args: ['install', '--frozen-lockfile'],
    });
    expect(getProjectCommandArgs('bun', 'install', [])).toEqual({
      program: 'bun',
      args: ['install'],
    });

    // Pnpm
    expect(getProjectCommandArgs('pnpm', 'install', ['pnpm-lock.yaml'])).toEqual({
      program: 'pnpm',
      args: ['install', '--frozen-lockfile'],
    });

    // Yarn
    expect(getProjectCommandArgs('yarn', 'install', ['yarn.lock'])).toEqual({
      program: 'yarn',
      args: ['install', '--immutable'],
    });

    // Npm
    expect(getProjectCommandArgs('npm', 'install', ['package-lock.json'])).toEqual({
      program: 'npm',
      args: ['ci'],
    });
    expect(getProjectCommandArgs('npm', 'install', [])).toEqual({
      program: 'npm',
      args: ['install'],
    });
  });

  it('generates correct run check and run build arguments', () => {
    expect(getProjectCommandArgs('bun', 'check')).toEqual({
      program: 'bun',
      args: ['run', 'check'],
    });
    expect(getProjectCommandArgs('pnpm', 'build')).toEqual({
      program: 'pnpm',
      args: ['run', 'build'],
    });
  });

  it('generates correct dev server arguments with strictPort and host', () => {
    expect(getDevServerArgs('bun', 4321)).toEqual({
      program: 'bun',
      args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4321', '--strictPort'],
    });
  });
});
