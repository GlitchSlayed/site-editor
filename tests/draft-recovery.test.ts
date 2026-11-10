import { describe, it, expect, beforeEach } from 'vitest';
import { saveDraftRecovery, getDraftRecovery, clearDraftRecovery } from '../src/lib/draft-recovery';

// Mock in-memory localStorage for Node testing environment
const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

describe('draft-recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves recovered draft', () => {
    const repo = '/home/user/Site';
    const file = 'src/content/writing/post.md';
    const hash = 'abc123hash';
    const source = '---\ntitle: Draft Title\n---\nDraft content here.';

    saveDraftRecovery(repo, file, hash, source);

    const recovered = getDraftRecovery(repo, file, 'different_hash');
    expect(recovered).not.toBeNull();
    expect(recovered?.source).toBe(source);
    expect(recovered?.hash).toBe(hash);
    expect(typeof recovered?.timestamp).toBe('number');
  });

  it('clears recovered draft on save', () => {
    const repo = '/home/user/Site';
    const file = 'src/content/writing/post.md';
    saveDraftRecovery(repo, file, 'hash', 'content');

    expect(getDraftRecovery(repo, file, 'hash')).not.toBeNull();

    clearDraftRecovery(repo, file);
    expect(getDraftRecovery(repo, file, 'hash')).toBeNull();
  });

  it('handles invalid or empty inputs gracefully', () => {
    expect(getDraftRecovery('', '', '')).toBeNull();
    expect(() => saveDraftRecovery('', '', '', '')).not.toThrow();
    expect(() => clearDraftRecovery('', '')).not.toThrow();
  });
});
