import { beforeEach, describe, expect, it } from 'vitest';
import {
  getStoredRecentRepositories,
  setStoredRecentRepositories,
  getStoredTheme,
  setStoredTheme,
  getStoredAccent,
  setStoredAccent,
  getStoredMetadataOpen,
  setStoredMetadataOpen,
  getStoredWordWrap,
  setStoredWordWrap,
} from '../src/lib/storage';

// Polyfill in-memory localStorage for Node test runner
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: ReturnType<typeof createMockLocalStorage> }).localStorage =
    createMockLocalStorage();
}

describe('safe storage helper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('safely handles corrupted recent-repositories JSON without throwing', () => {
    // Malformed JSON string
    localStorage.setItem('recent-repositories', '{not valid json');
    expect(getStoredRecentRepositories()).toEqual([]);

    // Valid JSON but wrong type (object instead of array of strings)
    localStorage.setItem('recent-repositories', JSON.stringify({ a: 1 }));
    expect(getStoredRecentRepositories()).toEqual([]);

    // Array containing non-strings
    localStorage.setItem('recent-repositories', JSON.stringify([123, null, 'valid/path']));
    expect(getStoredRecentRepositories()).toEqual([]);

    // Valid array of strings
    const valid = ['/home/user/Site', '/home/user/Other'];
    setStoredRecentRepositories(valid);
    expect(getStoredRecentRepositories()).toEqual(valid);
  });

  it('safely parses and defaults theme', () => {
    expect(getStoredTheme()).toBe('light');

    localStorage.setItem('purpose-theme', 'invalid-theme');
    expect(getStoredTheme()).toBe('light');

    setStoredTheme('dark');
    expect(getStoredTheme()).toBe('dark');

    setStoredTheme('light');
    expect(getStoredTheme()).toBe('light');
  });

  it('safely parses and validates hex accent color', () => {
    expect(getStoredAccent()).toBe('#ff5b36');

    localStorage.setItem('blog-editor-accent', 'not-a-color');
    expect(getStoredAccent()).toBe('#ff5b36');

    setStoredAccent('#33d17a');
    expect(getStoredAccent()).toBe('#33d17a');
  });

  it('safely parses metadataOpen and wordWrap booleans', () => {
    expect(getStoredMetadataOpen()).toBe(false);
    setStoredMetadataOpen(true);
    expect(getStoredMetadataOpen()).toBe(true);

    expect(getStoredWordWrap()).toBe(false);
    setStoredWordWrap(true);
    expect(getStoredWordWrap()).toBe(true);
  });
});
