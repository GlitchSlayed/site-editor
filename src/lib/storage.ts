export function getStoredRecentRepositories(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem('recent-repositories');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed.filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

export function setStoredRecentRepositories(repos: string[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('recent-repositories', JSON.stringify(repos));
  } catch {}
}

export function getStoredTheme(): 'light' | 'dark' {
  try {
    if (typeof localStorage === 'undefined') return 'light';
    const stored = localStorage.getItem('purpose-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'light';
  } catch {
    return 'light';
  }
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('purpose-theme', theme);
  } catch {}
}

export function getStoredAccent(): string {
  try {
    if (typeof localStorage === 'undefined') return '#ff5b36';
    const stored = localStorage.getItem('blog-editor-accent');
    if (stored && /^#[0-9a-fA-F]{6}$/.test(stored)) return stored;
    return '#ff5b36';
  } catch {
    return '#ff5b36';
  }
}

export function setStoredAccent(accent: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('blog-editor-accent', accent);
  } catch {}
}

export function getStoredMetadataOpen(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const stored = localStorage.getItem('blog-editor-metadata-open');
    return stored === 'true';
  } catch {
    return false;
  }
}

export function setStoredMetadataOpen(open: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('blog-editor-metadata-open', String(open));
  } catch {}
}

export function getStoredWordWrap(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const stored = localStorage.getItem('blog-editor-word-wrap');
    return stored === 'true';
  } catch {
    return false;
  }
}

export function setStoredWordWrap(wrap: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('blog-editor-word-wrap', String(wrap));
  } catch {}
}
