import { describe, expect, it, vi } from 'vitest';
import { handleShortcutKeyDown, type ShortcutOptions } from '../src/hooks/useShortcuts';

describe('useShortcuts keyboard handler', () => {
  const createMockOpts = (overrides: Partial<ShortcutOptions> = {}): ShortcutOptions => ({
    selected: { path: 'src/content/writing/post.md' },
    dirty: true,
    busy: false,
    shortcutsOpen: false,
    outlineOpen: false,
    appearanceDialog: false,
    publishDialog: false,
    newDialog: false,
    renameTarget: null,
    duplicateTarget: null,
    deleteTarget: null,
    onSave: vi.fn().mockResolvedValue(true),
    onToggleTheme: vi.fn(),
    onToggleOutline: vi.fn(),
    onToggleWordWrap: vi.fn(),
    onToggleSourceMode: vi.fn(),
    onOpenShortcuts: vi.fn(),
    onCloseShortcuts: vi.fn(),
    onCloseOutline: vi.fn(),
    onCloseAppearanceDialog: vi.fn(),
    onClosePublishDialog: vi.fn(),
    onCloseNewDialog: vi.fn(),
    onCloseRenameDialog: vi.fn(),
    onCloseDuplicateDialog: vi.fn(),
    onCloseDeleteDialog: vi.fn(),
    onSearchFocus: vi.fn(),
    ...overrides,
  });

  it('triggers save on Ctrl+S when dirty and not busy', () => {
    const opts = createMockOpts();
    const isSaving = { current: false };
    const preventDefault = vi.fn();

    handleShortcutKeyDown({ key: 's', ctrlKey: true, preventDefault }, opts, isSaving);

    expect(preventDefault).toHaveBeenCalled();
    expect(opts.onSave).toHaveBeenCalledTimes(1);
    expect(isSaving.current).toBe(true);
  });

  it('ignores Ctrl+S when not dirty or when busy or already saving', () => {
    const optsNotDirty = createMockOpts({ dirty: false });
    const isSaving = { current: false };
    handleShortcutKeyDown({ key: 's', ctrlKey: true }, optsNotDirty, isSaving);
    expect(optsNotDirty.onSave).not.toHaveBeenCalled();

    const optsBusy = createMockOpts({ busy: true });
    handleShortcutKeyDown({ key: 's', ctrlKey: true }, optsBusy, isSaving);
    expect(optsBusy.onSave).not.toHaveBeenCalled();

    const optsAlreadySaving = createMockOpts();
    isSaving.current = true;
    handleShortcutKeyDown({ key: 's', ctrlKey: true }, optsAlreadySaving, isSaving);
    expect(optsAlreadySaving.onSave).not.toHaveBeenCalled();
  });

  it('triggers search focus on Ctrl+K', () => {
    const opts = createMockOpts();
    const isSaving = { current: false };
    const preventDefault = vi.fn();

    handleShortcutKeyDown({ key: 'k', ctrlKey: true, preventDefault }, opts, isSaving);

    expect(preventDefault).toHaveBeenCalled();
    expect(opts.onSearchFocus).toHaveBeenCalledTimes(1);
  });

  it('triggers ? to open shortcuts only when not typing in an input', () => {
    const opts = createMockOpts();
    const isSaving = { current: false };

    // In input -> should NOT open
    handleShortcutKeyDown({ key: '?' }, opts, isSaving, true);
    expect(opts.onOpenShortcuts).not.toHaveBeenCalled();

    // Not in input -> SHOULD open
    handleShortcutKeyDown({ key: '?' }, opts, isSaving, false);
    expect(opts.onOpenShortcuts).toHaveBeenCalledTimes(1);
  });

  it('unwinds the modal stack in strict priority order on Escape', () => {
    const isSaving = { current: false };

    // Case 1: deleteTarget takes precedence over all else
    const opts1 = createMockOpts({
      deleteTarget: { path: 'a.md' },
      renameTarget: { path: 'b.md' },
      publishDialog: true,
      shortcutsOpen: true,
    });
    handleShortcutKeyDown({ key: 'Escape' }, opts1, isSaving);
    expect(opts1.onCloseDeleteDialog).toHaveBeenCalledTimes(1);
    expect(opts1.onCloseRenameDialog).not.toHaveBeenCalled();
    expect(opts1.onClosePublishDialog).not.toHaveBeenCalled();

    // Case 2: publishDialog takes precedence over shortcuts
    const opts2 = createMockOpts({
      publishDialog: true,
      shortcutsOpen: true,
    });
    handleShortcutKeyDown({ key: 'Escape' }, opts2, isSaving);
    expect(opts2.onClosePublishDialog).toHaveBeenCalledTimes(1);
    expect(opts2.onCloseShortcuts).not.toHaveBeenCalled();

    // Case 3: shortcutsOpen closes before outline
    const opts3 = createMockOpts({
      shortcutsOpen: true,
      outlineOpen: true,
    });
    handleShortcutKeyDown({ key: 'Escape' }, opts3, isSaving);
    expect(opts3.onCloseShortcuts).toHaveBeenCalledTimes(1);
    expect(opts3.onCloseOutline).not.toHaveBeenCalled();
  });

  it('triggers onQuit on Ctrl+Q / Cmd+Q', () => {
    const onQuit = vi.fn();
    const opts = createMockOpts({ onQuit });
    const isSaving = { current: false };
    const preventDefault = vi.fn();

    handleShortcutKeyDown({ key: 'q', ctrlKey: true, preventDefault }, opts, isSaving);
    expect(preventDefault).toHaveBeenCalled();
    expect(onQuit).toHaveBeenCalledTimes(1);
  });
});
