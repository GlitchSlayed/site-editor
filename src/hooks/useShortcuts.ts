import { useEffect, useRef } from 'react';

export interface ShortcutOptions {
  selected: unknown;
  dirty: boolean;
  busy: boolean;
  shortcutsOpen: boolean;
  outlineOpen: boolean;
  appearanceDialog: boolean;
  publishDialog: boolean;
  newDialog: boolean;
  renameTarget: unknown;
  duplicateTarget: unknown;
  deleteTarget: unknown;
  onSave: () => Promise<boolean | unknown> | boolean | unknown;
  onToggleTheme: () => void;
  onToggleOutline: () => void;
  onToggleWordWrap: () => void;
  onToggleSourceMode: () => void;
  onOpenShortcuts: () => void;
  onCloseShortcuts: () => void;
  onCloseOutline: () => void;
  onCloseAppearanceDialog: () => void;
  onClosePublishDialog: () => void;
  onCloseNewDialog: () => void;
  onCloseRenameDialog: () => void;
  onCloseDuplicateDialog: () => void;
  onCloseDeleteDialog: () => void;
  onSearchFocus: () => void;
  onQuit?: () => void;
}

export function handleShortcutKeyDown(
  e: {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    preventDefault?: () => void;
  },
  opts: ShortcutOptions,
  isSavingRef: { current: boolean },
  isInputFocused = false,
  isMac = false
): void {
  const modKey = isMac ? Boolean(e.metaKey) : Boolean(e.ctrlKey);

  // 1. Save: Ctrl+S / Cmd+S
  if (modKey && !e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault?.();
    if (opts.selected && opts.dirty && !opts.busy && !isSavingRef.current) {
      isSavingRef.current = true;
      Promise.resolve(opts.onSave()).finally(() => {
        isSavingRef.current = false;
      });
    }
    return;
  }

  // 1b. Quit: Ctrl+Q / Cmd+Q
  if (modKey && !e.shiftKey && e.key.toLowerCase() === 'q') {
    e.preventDefault?.();
    opts.onQuit?.();
    return;
  }

  // 2. Search: Ctrl+K / Cmd+K
  if (modKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
    e.preventDefault?.();
    opts.onSearchFocus();
    return;
  }

  // 3. Toggle Theme: Ctrl+Shift+T / Cmd+Shift+T
  if (modKey && e.shiftKey && e.key.toLowerCase() === 't') {
    e.preventDefault?.();
    opts.onToggleTheme();
    return;
  }

  // 4. Toggle Outline: Ctrl+Shift+O / Cmd+Shift+O
  if (modKey && e.shiftKey && e.key.toLowerCase() === 'o') {
    e.preventDefault?.();
    opts.onToggleOutline();
    return;
  }

  // 5. Toggle Word Wrap: Ctrl+Shift+W / Cmd+Shift+W
  if (modKey && e.shiftKey && e.key.toLowerCase() === 'w') {
    e.preventDefault?.();
    opts.onToggleWordWrap();
    return;
  }

  // 6. Toggle Source / Frontmatter Mode: Ctrl+Shift+P / Cmd+Shift+P
  if (modKey && e.shiftKey && e.key.toLowerCase() === 'p') {
    e.preventDefault?.();
    opts.onToggleSourceMode();
    return;
  }

  // 7. Open shortcuts cheat sheet: ? (when not typing in an input)
  if (e.key === '?' && !modKey && !isInputFocused) {
    e.preventDefault?.();
    opts.onOpenShortcuts();
    return;
  }

  // 8. Escape stack: close topmost modal/dialog first
  if (e.key === 'Escape') {
    e.preventDefault?.();
    if (opts.deleteTarget) {
      opts.onCloseDeleteDialog();
    } else if (opts.renameTarget) {
      opts.onCloseRenameDialog();
    } else if (opts.duplicateTarget) {
      opts.onCloseDuplicateDialog();
    } else if (opts.publishDialog) {
      opts.onClosePublishDialog();
    } else if (opts.newDialog) {
      opts.onCloseNewDialog();
    } else if (opts.appearanceDialog) {
      opts.onCloseAppearanceDialog();
    } else if (opts.shortcutsOpen) {
      opts.onCloseShortcuts();
    } else if (opts.outlineOpen) {
      opts.onCloseOutline();
    }
  }
}

/**
 * Single unified keyboard shortcut layer.
 * Uses a ref to latest state/handlers so window listener is registered only once
 * and does not re-subscribe on every keystroke.
 * Serializes saves and prevents concurrent re-entry.
 */
export function useShortcuts(options: ShortcutOptions): void {
  const latestRef = useRef<ShortcutOptions>(options);
  latestRef.current = options;

  const isSavingRef = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      handleShortcutKeyDown(e, latestRef.current, isSavingRef, isInputFocused, isMac);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
