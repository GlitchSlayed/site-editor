export interface DraftRecoveryEntry {
  repo: string;
  file: string;
  hash: string;
  source: string;
  timestamp: number;
}

function recoveryKey(repo: string, file: string): string {
  return `purpose-draft-recovery:${encodeURIComponent(repo)}:${encodeURIComponent(file)}`;
}

export function saveDraftRecovery(repo: string, file: string, hash: string, source: string): void {
  try {
    if (typeof localStorage === 'undefined' || !repo || !file) return;
    const entry: DraftRecoveryEntry = {
      repo,
      file,
      hash,
      source,
      timestamp: Date.now(),
    };
    localStorage.setItem(recoveryKey(repo, file), JSON.stringify(entry));
  } catch {}
}

export function getDraftRecovery(
  repo: string,
  file: string,
  _currentHash?: string
): DraftRecoveryEntry | null {
  try {
    if (typeof localStorage === 'undefined' || !repo || !file) return null;
    const raw = localStorage.getItem(recoveryKey(repo, file));
    if (!raw) return null;
    const entry: DraftRecoveryEntry = JSON.parse(raw);
    if (entry.source && entry.timestamp) {
      // Only return if it actually has content or differs
      return entry;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearDraftRecovery(repo: string, file: string): void {
  try {
    if (typeof localStorage === 'undefined' || !repo || !file) return;
    localStorage.removeItem(recoveryKey(repo, file));
  } catch {}
}
