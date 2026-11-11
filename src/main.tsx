import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FileText } from 'lucide-react';
import { parseSiteDocument, replaceMarkdownBody, serializeSiteDocument, validateMetadata, type SiteMetadata } from './lib/site-adapter';
import { auditEditorialText, fixAllEmDashes, type EditorialIssue } from './lib/editorial-rules';
import { initMiddleClickAutoscroll } from './lib/autoscroll';
import { preProcessMarkdown, transformTablePercentBadges } from './lib/preview-transformer';
import { useShortcuts } from './hooks/useShortcuts';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import {
  saveDraftRecovery,
  getDraftRecovery,
  clearDraftRecovery,
  type DraftRecoveryEntry,
} from './lib/draft-recovery';
import { MOCK_ENTRIES, MOCK_BWB_MDX } from './lib/browser-mock';
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
} from './lib/storage';

// Modular Components
import { AppHeader } from './components/layout/AppHeader';
import { ContentSidebar, type Entry, type Environment } from './components/sidebar/ContentSidebar';
import { EditorToolbar } from './components/editor/EditorToolbar';
import { MetadataEditor } from './components/editor/MetadataEditor';
import { MarkdownEditor } from './components/editor/MarkdownEditor';
import { ArticlePreviewPane } from './components/preview/ArticlePreviewPane';
import { DocumentOutlineDrawer, type HeadingItem } from './components/outline/DocumentOutlineDrawer';
import { StatusBar } from './components/statusbar/StatusBar';
import { OutputPanel } from './components/terminal/OutputPanel';

// Modals
import { KeyboardShortcutsDialog } from './components/modals/KeyboardShortcutsDialog';
import { RenameDialog } from './components/modals/RenameDialog';
import { DuplicateDialog } from './components/modals/DuplicateDialog';
import { DeleteDialog } from './components/modals/DeleteDialog';
import { AppearanceDialog } from './components/modals/AppearanceDialog';
import { NewDocumentDialog } from './components/modals/NewDocumentDialog';
import { PublishDialog } from './components/modals/PublishDialog';
import { ConflictDialog } from './components/modals/ConflictDialog';
import { CloseConfirmDialog } from './components/modals/CloseConfirmDialog';

import './style.css';

type FileData = { text: string; hash: string };
type CommandResult = { code: number; output: string };
type GitInfo = { branch: string; upstream: string; ahead: number; behind: number; changed: string[]; diff: string };

const native = isTauri();
const LIVE_SITE_URL = 'https://glitchslayed.github.io/Site/';
const DEFAULT_APP_ACCENT = '#ff5b36';
const ACCENT_PRESETS = [
  { label: 'Orange', value: '#ff5b36' },
  { label: 'Green', value: '#33d17a' },
  { label: 'Blue', value: '#739cda' },
  { label: 'Violet', value: '#b18cff' },
  { label: 'Pink', value: '#ff73b7' },
  { label: 'Cyan', value: '#50c9d9' },
];

const startingRecent: string[] = getStoredRecentRepositories();
const siteAssetPath = (src: string) => {
  const match = src.replace(/\\/g, '/').match(/(?:^|\/)(images\/[^?#)\s]+)/);
  return match?.[1];
};

function App() {
  const [repository, setRepository] = useState(startingRecent[0] || '');
  const [recent, setRecent] = useState(startingRecent);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [source, setSource] = useState('');
  const [savedSource, setSavedSource] = useState('');
  const [hash, setHash] = useState('');
  const [metadata, setMetadata] = useState<SiteMetadata>({});
  const [savedMetadata, setSavedMetadata] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'All' | 'Writing' | 'Projects'>('All');
  const [stateFilter, setStateFilter] = useState<'All' | 'Drafts' | 'Published'>('All');
  const [notice, setNotice] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [git, setGit] = useState<GitInfo | null>(null);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [schemaIssues, setSchemaIssues] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [publishDialog, setPublishDialog] = useState(false);
  const [diffText, setDiffText] = useState('');
  const [diffLoading, setDiffLoading] = useState(false);
  const [newDialog, setNewDialog] = useState(false);
  const [newKind, setNewKind] = useState<'writing' | 'projects'>('writing');
  const [newExtension, setNewExtension] = useState<'md' | 'mdx'>('md');
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [renameTarget, setRenameTarget] = useState<Entry | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Entry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);

  // Appearance & UI layout states
  const [appAccent, setAppAccent] = useState(() => getStoredAccent());
  const [accentDraft, setAccentDraft] = useState(appAccent);
  const [appearanceDialog, setAppearanceDialog] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [sourceMode, setSourceMode] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [metadataOpen, setMetadataOpen] = useState(() => getStoredMetadataOpen());
  const [wordWrap, setWordWrap] = useState<boolean>(() => getStoredWordWrap());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Phase 2 & 3: Dev server status, streaming output, conflict modal, close guard, draft recovery
  const [devServerRunning, setDevServerRunning] = useState(false);
  const [conflictData, setConflictData] = useState<{ localText: string; diskText: string } | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<DraftRecoveryEntry | null>(null);
  const closeConfirmedRef = useRef(false);

  const bodyEditor = useRef<HTMLTextAreaElement>(null);
  const sourceEditor = useRef<HTMLTextAreaElement>(null);
  const workarea = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(440);
  const [previewAssets, setPreviewAssets] = useState<Record<string, string>>({});
  const [dropTarget, setDropTarget] = useState<'content' | 'visual' | null>(null);

  const dirty = Boolean(selected) && (source !== savedSource || JSON.stringify(metadata) !== savedMetadata);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    setStoredMetadataOpen(metadataOpen);
  }, [metadataOpen]);

  useEffect(() => {
    setStoredWordWrap(wordWrap);
  }, [wordWrap]);

  useEffect(() => {
    return initMiddleClickAutoscroll();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    const docTitle = metadata.title || selected?.title || '';
    const titleStr = docTitle ? `Purpose — ${docTitle}${dirty ? ' ●' : ''}` : 'Purpose';
    document.title = titleStr;
    if (native) {
      getCurrentWindow().setTitle(titleStr).catch(() => {});
    }
  }, [selected?.title, metadata.title, dirty]);

  useEffect(() => {
    const hex = appAccent.slice(1);
    const channels = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const luminance = channels
      .map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    document.documentElement.style.setProperty('--orange-accent', appAccent);
    document.documentElement.style.setProperty('--accent-foreground', luminance > 0.179 ? '#080808' : '#f5f5f5');
    setStoredAccent(appAccent);
  }, [appAccent]);

  useEffect(() => {
    if (repository && native) {
      refreshRepository(repository);
    } else if (!native) {
      setRepository('The Technical Dispatch & Notebook');
      setEntries(MOCK_ENTRIES);
      setSelected(MOCK_ENTRIES[0]);
      setSource(MOCK_BWB_MDX);
      setSavedSource(MOCK_BWB_MDX);
      try {
        const doc = parseSiteDocument(MOCK_BWB_MDX);
        setMetadata(doc.metadata);
        setSavedMetadata(JSON.stringify(doc.metadata));
      } catch {}
      setHash('mock-hash-123');
    }
  }, []);

  // Window close interception
  const lastCloseAttemptRef = useRef<number>(0);

  useEffect(() => {
    if (!native) return;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow()
      .onCloseRequested(async event => {
        if (closeConfirmedRef.current) return;
        const now = Date.now();
        // If user attempts close again within 2 seconds, bypass guard and force close
        if (lastCloseAttemptRef.current > 0 && now - lastCloseAttemptRef.current < 2000) {
          closeConfirmedRef.current = true;
          await getCurrentWindow().destroy();
          return;
        }
        lastCloseAttemptRef.current = now;

        if (dirtyRef.current) {
          event.preventDefault();
          setCloseConfirmOpen(true);
        }
      })
      .then(stop => {
        unlisten = stop;
      });
    return () => {
      unlisten?.();
    };
  }, []);

  // Listen to live command output and dev server logs
  useEffect(() => {
    if (!native) return;
    let unlistenCmd: (() => void) | undefined;
    let unlistenDev: (() => void) | undefined;

    void listen<string>('command-output-line', event => {
      setOutput(prev => (prev ? `${prev}\n${event.payload}` : event.payload));
    }).then(stop => {
      unlistenCmd = stop;
    });

    void listen<string>('dev-server-log', event => {
      setOutput(prev => (prev ? `${prev}\n${event.payload}` : event.payload));
    }).then(stop => {
      unlistenDev = stop;
    });

    return () => {
      unlistenCmd?.();
      unlistenDev?.();
    };
  }, []);

  // Drag-and-drop listener for images
  const storeImageRef = useRef(storeImage);
  storeImageRef.current = storeImage;

  useEffect(() => {
    if (!native || !repository || !selected) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    const targetAt = (position: { x: number; y: number }): 'content' | 'visual' => {
      const element = document.elementFromPoint(
        position.x / window.devicePixelRatio,
        position.y / window.devicePixelRatio
      );
      if (element?.closest('[data-image-drop="visual"]')) return 'visual';
      return 'content';
    };
    void getCurrentWindow()
      .onDragDropEvent(event => {
        if (event.payload.type === 'enter' || event.payload.type === 'over')
          setDropTarget(targetAt(event.payload.position));
        else if (event.payload.type === 'leave') setDropTarget(null);
        else if (event.payload.type === 'drop') {
          const target = targetAt(event.payload.position);
          setDropTarget(null);
          for (const file of event.payload.paths) void storeImageRef.current(file, target);
        }
      })
      .then(stop => {
        if (cancelled) stop();
        else unlisten = stop;
      })
      .catch(error => setNotice(`Image drop is unavailable: ${String(error)}`));
    return () => {
      cancelled = true;
      unlisten?.();
      setDropTarget(null);
    };
  }, [repository, selected?.path]);

  // Periodic draft autosave recovery
  useEffect(() => {
    if (!repository || !selected || !dirty) return;
    const timer = setTimeout(() => {
      saveDraftRecovery(repository, selected.path, hash, source);
    }, 2000);
    return () => clearTimeout(timer);
  }, [repository, selected?.path, source, hash, dirty]);

  const parsed = useMemo(() => {
    try {
      return parseSiteDocument(source);
    } catch {
      return parseSiteDocument('');
    }
  }, [source]);
  const body = parsed.body;
  const isMdx = Boolean(selected?.path.endsWith('.mdx'));

  useEffect(() => {
    if (!native || !repository) return;
    const sources = [
      ...Array.from(body.matchAll(/!\[[^\]]*\]\((?:<)?([^\s)>]+)(?:>)?/g), match => match[1]),
      String(metadata.visualImage || ''),
    ];
    const assets = [...new Set(sources.map(siteAssetPath).filter((asset): asset is string => Boolean(asset)))];
    for (const asset of assets) {
      if (previewAssets[asset]) continue;
      void invoke<string>('read_site_image', { path: repository, asset })
        .then(data => setPreviewAssets(current => ({ ...current, [asset]: data })))
        .catch(() => {});
    }
  }, [repository, source, metadata.visualImage, previewAssets]);

  const headings = useMemo<HeadingItem[]>(() => {
    if (!body) return [];
    const lines = body.split('\n');
    const items: HeadingItem[] = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim().replace(/[*_`]/g, '');
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        items.push({ level, text, id, line: idx });
      }
    });
    return items;
  }, [body]);

  const DEFAULT_SITE_TAGS = [
    'Aerodynamics',
    'Aeroelasticity',
    'Airfoils',
    'Avionics',
    'CFD',
    'Flight Control',
    'Fluid Dynamics',
    'Linux',
    'Propulsion',
    'Rust',
    'Structures',
    'Systems',
    'Transonic',
    'Wind Tunnel',
  ];

  const allRepoTags = useMemo(() => {
    const set = new Set<string>(DEFAULT_SITE_TAGS);
    if (Array.isArray(metadata.tags)) {
      metadata.tags.forEach((t: unknown) => {
        if (typeof t === 'string' && t.trim()) set.add(t.trim());
      });
    }
    return Array.from(set).sort();
  }, [metadata.tags]);

  const wordsCount = useMemo(() => {
    return body.trim() ? body.trim().split(/\s+/).length : 0;
  }, [body]);

  const readTimeMin = useMemo(() => {
    return Math.max(1, Math.ceil(wordsCount / 220));
  }, [wordsCount]);

  const updateCursorPosition = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const textBefore = el.value.substring(0, el.selectionStart);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorPos({ line, col });
  };

  const deferredBody = useDeferredValue(body);

  const rendered = useMemo(() => {
    const preprocessed = preProcessMarkdown(deferredBody);
    const rawHtml = marked.parse(preprocessed, { async: false }) as string;
    const transformedHtml = transformTablePercentBadges(rawHtml);
    const withAssets = transformedHtml.replace(/src="([^"]+)"/g, (_all, src: string) => {
      const asset = siteAssetPath(src);
      return `src="${asset && previewAssets[asset] ? previewAssets[asset] : src}"`;
    });
    return DOMPurify.sanitize(withAssets, { ADD_TAGS: ['aside'], ADD_ATTR: ['class'] });
  }, [deferredBody, previewAssets]);

  const validation = useMemo(() => {
    return selected ? validateMetadata(selected.kind.toLowerCase() as 'writing' | 'projects', metadata) : [];
  }, [selected, metadata]);

  const editorialIssues: EditorialIssue[] = useMemo(() => {
    return auditEditorialText(deferredBody, isMdx);
  }, [deferredBody, isMdx]);

  async function refreshRepository(path: string) {
    try {
      const list = await invoke<Entry[]>('list_content', { path });
      const issues = await invoke<string[]>('validate_repo', { path });
      setRepository(path);
      setEntries(list);
      setSchemaIssues(issues);
      const next = [path, ...recent.filter(r => r !== path)].slice(0, 5);
      setRecent(next);
      setStoredRecentRepositories(next);
      await refreshGit(path);
      setEnvironment(await invoke<Environment>('environment', { path }));
      setNotice(issues.length ? issues.join(' ') : '');
    } catch (e) {
      setNotice(String(e));
    }
  }

  async function chooseRepository() {
    if (!native) {
      setNotice('Browser mode cannot access local folders, run package manager commands, or run Git. Open the Tauri desktop app for repository access.');
      return;
    }
    try {
      const path = await open({ directory: true, multiple: false, title: 'Open Astro website repository' });
      if (typeof path === 'string') await refreshRepository(path);
    } catch (e) {
      setNotice(String(e));
    }
  }

  async function refreshGit(path = repository) {
    if (!native || !path) return;
    try {
      setGit(await invoke<GitInfo>('git_info', { path }));
    } catch (e) {
      setNotice(String(e));
    }
  }

  async function selectEntry(item: Entry, force = false) {
    if (!force && dirty && !window.confirm('Discard your unsaved edits and open another file?')) return;
    if (!native) {
      setSelected(item);
      const text = item.path.includes('bwb')
        ? MOCK_BWB_MDX
        : `---\ntitle: "${item.title}"\ndate: 2026-10-20\ncategory: Aerospace\ntags:\n  - Engineering\ndraft: false\n---\n\n# ${item.title}\n\nTechnical monograph body content...\n`;
      const doc = parseSiteDocument(text);
      setSource(text);
      setSavedSource(text);
      setMetadata(doc.metadata);
      setSavedMetadata(JSON.stringify(doc.metadata));
      setHash('mock-hash');
      setMode('edit');
      setNotice('');
      return;
    }
    try {
      const file = await invoke<FileData>('read_article', { path: repository, file: item.path });
      const doc = parseSiteDocument(file.text);
      setSelected(item);
      setSource(file.text);
      setSavedSource(file.text);
      setMetadata(doc.metadata);
      setSavedMetadata(JSON.stringify(doc.metadata));
      setHash(file.hash);
      setMode('edit');
      setNotice('');

      const recovery = getDraftRecovery(repository, item.path, file.hash);
      if (recovery && recovery.source !== file.text) {
        setRecoveredDraft(recovery);
      } else {
        setRecoveredDraft(null);
      }
    } catch (e) {
      setNotice(String(e));
    }
  }

  async function createDocument() {
    if (!repository) return;
    const title = newTitle.trim();
    const slug = newSlug.trim();
    if (!title || !slug) {
      setNotice('Enter a title and filename.');
      return;
    }
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    const newDocMeta: SiteMetadata = {
      title,
      description: '',
      date,
      tags: [],
      category: '',
      draft: true,
      sample: false,
      featured: false,
      ...(newKind === 'projects' ? { status: 'Concept', art: 'wing' } : {}),
    };
    const text = serializeSiteDocument('', newDocMeta, `# ${title}\n\nWrite your technical article here…\n`);
    try {
      setBusy(true);
      const item = await invoke<Entry>('create_article', {
        path: repository,
        kind: newKind,
        title,
        slug,
        extension: newExtension,
        text,
      });
      setNewDialog(false);
      setNewTitle('');
      setNewSlug('');
      await refreshRepository(repository);
      await selectEntry(item);
    } catch (e) {
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(newSlug: string) {
    if (!repository || !renameTarget) return;
    try {
      setBusy(true);
      const updated = await invoke<Entry>('rename_article', {
        path: repository,
        file: renameTarget.path,
        new_slug: newSlug,
      });
      setRenameTarget(null);
      await refreshRepository(repository);
      if (selected?.path === renameTarget.path) {
        await selectEntry(updated);
      }
      setNotice(`Renamed to ${updated.path.split('/').at(-1)}.`);
    } catch (e) {
      setNotice(`Rename failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(newSlug: string, newTitle: string) {
    if (!repository || !duplicateTarget) return;
    try {
      setBusy(true);
      const duplicated = await invoke<Entry>('duplicate_article', {
        path: repository,
        file: duplicateTarget.path,
        new_slug: newSlug,
        new_title: newTitle,
      });
      setDuplicateTarget(null);
      await refreshRepository(repository);
      await selectEntry(duplicated);
      setNotice(`Duplicated to ${duplicated.path.split('/').at(-1)} as draft.`);
    } catch (e) {
      setNotice(`Duplicate failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!repository || !deleteTarget) return;
    try {
      setBusy(true);
      await invoke('delete_article', {
        path: repository,
        file: deleteTarget.path,
      });
      const wasSelected = selected?.path === deleteTarget.path;
      setDeleteTarget(null);
      await refreshRepository(repository);
      if (wasSelected) {
        setSelected(null);
        setSource('');
        setSavedSource('');
        setMetadata({});
      }
      setNotice('Document moved to trash.');
    } catch (e) {
      setNotice(`Delete failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function setField(key: string, value: unknown) {
    setMetadata(current => ({ ...current, [key]: value }));
  }

  function updateAccent(value: string) {
    setAccentDraft(value);
    if (/^#[0-9a-f]{6}$/i.test(value)) setAppAccent(value);
  }

  async function save(): Promise<boolean> {
    if (!native || !selected) return false;
    if (schemaIssues.length) {
      setNotice(schemaIssues.join(' '));
      return false;
    }
    const outputText = serializeSiteDocument(source, metadata, body);
    try {
      const newHash = await invoke<string>('save_article', {
        path: repository,
        file: selected.path,
        text: outputText,
        expectedHash: hash,
      });
      setSource(outputText);
      setSavedSource(outputText);
      setHash(newHash);
      setSavedMetadata(JSON.stringify(metadata));
      clearDraftRecovery(repository, selected.path);
      setNotice('Saved locally. Markdown body and unrecognized metadata are preserved.');

      const [list] = await Promise.all([
        invoke<Entry[]>('list_content', { path: repository }),
        refreshGit(),
      ]);
      setEntries(list);
    } catch (e: unknown) {
      const errMsg = String(e);
      if (errMsg.includes('changed outside the editor')) {
        try {
          const disk = await invoke<FileData>('read_article', { path: repository, file: selected.path });
          setConflictData({
            localText: outputText,
            diskText: disk.text,
          });
        } catch {
          setNotice(errMsg);
        }
        return false;
      }
      setNotice(errMsg);
      return false;
    }
    return true;
  }

  async function handleOverwriteDisk() {
    if (!selected || !repository) return;
    try {
      setBusy(true);
      const disk = await invoke<FileData>('read_article', { path: repository, file: selected.path });
      const outputText = serializeSiteDocument(source, metadata, body);
      const newHash = await invoke<string>('save_article', {
        path: repository,
        file: selected.path,
        text: outputText,
        expectedHash: disk.hash,
      });
      setSource(outputText);
      setSavedSource(outputText);
      setHash(newHash);
      setSavedMetadata(JSON.stringify(metadata));
      clearDraftRecovery(repository, selected.path);
      setConflictData(null);
      setNotice('File overwritten successfully.');
      const [list] = await Promise.all([
        invoke<Entry[]>('list_content', { path: repository }),
        refreshGit(),
      ]);
      setEntries(list);
    } catch (e) {
      setNotice(`Overwrite failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  useShortcuts({
    selected,
    dirty,
    busy,
    shortcutsOpen,
    outlineOpen,
    appearanceDialog,
    publishDialog,
    newDialog,
    renameTarget,
    duplicateTarget,
    deleteTarget,
    onSave: save,
    onToggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    onToggleOutline: () => setOutlineOpen(o => !o),
    onToggleWordWrap: () => setWordWrap(w => !w),
    onToggleSourceMode: () => setSourceMode(sm => !sm),
    onOpenShortcuts: () => setShortcutsOpen(true),
    onCloseShortcuts: () => setShortcutsOpen(false),
    onCloseOutline: () => setOutlineOpen(false),
    onCloseAppearanceDialog: () => setAppearanceDialog(false),
    onClosePublishDialog: () => setPublishDialog(false),
    onCloseNewDialog: () => setNewDialog(false),
    onCloseRenameDialog: () => setRenameTarget(null),
    onCloseDuplicateDialog: () => setDuplicateTarget(null),
    onCloseDeleteDialog: () => setDeleteTarget(null),
    onSearchFocus: () => document.querySelector<HTMLInputElement>('.search-box input')?.focus(),
  });

  function insertMarkdown(before: string, after = '', linePrefix?: string, placeholder = 'text') {
    const editor = sourceMode || selected?.path.endsWith('.mdx') ? sourceEditor.current : bodyEditor.current;
    if (!editor) return;
    const raw = sourceMode || selected?.path.endsWith('.mdx');
    const bodyStart = raw ? source.length - body.length : 0;
    const start = Math.max(0, Math.min(body.length, editor.selectionStart - bodyStart));
    const end = Math.max(start, Math.min(body.length, editor.selectionEnd - bodyStart));
    const selectedText = body.slice(start, end);
    let replacement: string;
    let selectionStart: number;
    let selectionEnd: number;
    if (linePrefix) {
      const lineStart = body.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEndIndex = body.indexOf('\n', end);
      const lineEnd = lineEndIndex < 0 ? body.length : lineEndIndex;
      const block = body.slice(lineStart, lineEnd);
      replacement = block
        .split('\n')
        .map(line => linePrefix + line)
        .join('\n');
      selectionStart = lineStart;
      selectionEnd = lineStart + replacement.length;
      const next = body.slice(0, lineStart) + replacement + body.slice(lineEnd);
      setSource(replaceMarkdownBody(source, next));
    } else {
      const insertedText = selectedText || placeholder;
      replacement = `${before}${insertedText}${after}`;
      const next = body.slice(0, start) + replacement + body.slice(end);
      selectionStart = start + before.length;
      selectionEnd = selectionStart + insertedText.length;
      setSource(replaceMarkdownBody(source, next));
    }
    requestAnimationFrame(() => {
      const active = raw ? sourceEditor.current : bodyEditor.current;
      if (active) {
        active.focus();
        active.setSelectionRange(selectionStart + (raw ? bodyStart : 0), selectionEnd + (raw ? bodyStart : 0));
      }
    });
  }

  function insertSnippet(snippet: string, importStatement?: string) {
    const raw = sourceMode || Boolean(selected?.path.endsWith('.mdx'));
    const editor = raw ? sourceEditor.current : bodyEditor.current;
    if (!editor) return;

    if (raw) {
      let currentSource = source;
      let selStart = editor.selectionStart ?? currentSource.length;
      let selEnd = editor.selectionEnd ?? selStart;

      if (importStatement && !currentSource.includes(importStatement)) {
        const fmMatch = currentSource.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/);
        if (fmMatch) {
          const fmEnd = fmMatch[0].length;
          const importText = `${importStatement}\n\n`;
          currentSource = currentSource.slice(0, fmEnd) + importText + currentSource.slice(fmEnd);
          const addedLen = importText.length;
          if (selStart >= fmEnd) {
            selStart += addedLen;
            selEnd += addedLen;
          } else {
            selStart = fmEnd + addedLen;
            selEnd = selStart;
          }
        } else {
          const importText = `${importStatement}\n\n`;
          currentSource = importText + currentSource;
          const addedLen = importText.length;
          selStart += addedLen;
          selEnd += addedLen;
        }
      }

      const snippetText = `\n\n${snippet}\n\n`;
      const nextSource = currentSource.slice(0, selStart) + snippetText + currentSource.slice(selEnd);
      const newCursorPos = selStart + snippetText.length;

      setSource(nextSource);
      try {
        setMetadata(parseSiteDocument(nextSource).metadata);
      } catch {}

      requestAnimationFrame(() => {
        if (sourceEditor.current) {
          sourceEditor.current.focus();
          sourceEditor.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    } else {
      let currentBody = body;
      let selStart = editor.selectionStart ?? currentBody.length;
      let selEnd = editor.selectionEnd ?? selStart;

      if (importStatement && !currentBody.includes(importStatement)) {
        const importText = `${importStatement}\n\n`;
        currentBody = importText + currentBody;
        const addedLen = importText.length;
        selStart += addedLen;
        selEnd += addedLen;
      }

      const snippetText = `\n\n${snippet}\n\n`;
      const nextBody = currentBody.slice(0, selStart) + snippetText + currentBody.slice(selEnd);
      const newCursorPos = selStart + snippetText.length;

      setSource(replaceMarkdownBody(source, nextBody));

      requestAnimationFrame(() => {
        if (bodyEditor.current) {
          bodyEditor.current.focus();
          bodyEditor.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    }
  }

  function insertTable() {
    insertMarkdown('| Parameter | Value | Unit |\n| --- | --- | --- |\n| Velocity | 60 | m/s |\n', '');
  }

  function handleFixEmDashes() {
    const fixed = fixAllEmDashes(body);
    setSource(replaceMarkdownBody(source, fixed));
    setNotice('All em dashes and double hyphens replaced with clean hyphens.');
  }

  async function storeImage(sourcePath: string, target: 'content' | 'visual') {
    if (!native || !repository || !selected) {
      setNotice('Open a content document before adding an image.');
      return;
    }
    const usage = target === 'visual' && selected.kind === 'Projects' ? 'visual' : 'content';
    try {
      const asset = await invoke<string>('import_site_image', {
        path: repository,
        article: selected.path,
        sourcePath,
        usage,
      });
      const data = await invoke<string>('read_site_image', { path: repository, asset });
      setPreviewAssets(current => ({ ...current, [asset]: data }));
      if (usage === 'visual') {
        setField('visualImage', asset);
        setField(
          'visualImageAlt',
          asset.split('/').at(-1)?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || ''
        );
        setField('visual', 'asset');
        setNotice('Image added to the project visual and stored in public/images.');
      } else {
        insertMarkdown(`\n\n![${asset.split('/').at(-1) || 'image'}](../../${asset})\n\n`, '');
        setNotice('Image copied into public/images and added to the Markdown content.');
      }
      await refreshGit();
    } catch (error) {
      setNotice(`Could not add image: ${String(error)}`);
    }
  }

  async function chooseImage(target: 'content' | 'visual') {
    try {
      const path = await open({
        multiple: false,
        directory: false,
        title: 'Choose an image',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'] }],
      });
      if (typeof path === 'string') await storeImage(path, target);
    } catch (error) {
      setNotice(String(error));
    }
  }

  function setPaneWidth(width: number) {
    const total = workarea.current?.getBoundingClientRect().width ?? 1200;
    setPreviewWidth(Math.round(Math.min(Math.max(width, 320), Math.min(1120, total - 360))));
  }

  function resizePanes(event: React.PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    const bounds = workarea.current?.getBoundingClientRect();
    if (bounds) setPaneWidth(bounds.right - event.clientX - 6);
  }

  function startPaneResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function finishPaneResize(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  async function cancelCommand() {
    try {
      const res = await invoke<string>('cancel_project_command');
      setNotice(res);
    } catch (e) {
      setNotice(String(e));
    }
  }

  async function command(operation: 'check' | 'build') {
    setBusy(true);
    const pm = environment?.package_manager || 'npm';
    setOutput(`Running ${pm} run ${operation}…\n`);
    try {
      const r = await invoke<CommandResult>('project_command', { path: repository, operation });
      if (r.output) setOutput(r.output);
      setNotice(r.code === 0 ? `${pm} run ${operation} completed.` : `${pm} run ${operation} failed with exit code ${r.code}.`);
    } catch (e) {
      setOutput(prev => `${prev}\n${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function installDependencies() {
    setBusy(true);
    const pm = environment?.package_manager || 'npm';
    setOutput(`Installing dependencies with ${pm}…\n`);
    try {
      const result = await invoke<CommandResult>('project_command', { path: repository, operation: 'install' });
      if (result.output) setOutput(result.output);
      if (result.code === 0) {
        setNotice('Dependencies installed.');
        setEnvironment(await invoke<Environment>('environment', { path: repository }));
      } else {
        setNotice('Dependency installation failed.');
      }
    } catch (e) {
      setOutput(prev => `${prev}\n${String(e)}`);
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function server() {
    setBusy(true);
    try {
      const willStart = !devServerRunning;
      const result = await invoke<string>(willStart ? 'run_dev_server' : 'stop_dev_server', { path: repository });
      setOutput(prev => (prev ? `${prev}\n${result}` : result));
      setDevServerRunning(willStart);
      if (willStart) window.open('http://127.0.0.1:4321', '_blank');
    } catch (e) {
      setOutput(prev => `${prev}\n${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (schemaIssues.length) {
      setNotice(schemaIssues.join(' '));
      return;
    }
    if (dirty && !(await save())) return;
    if (environment?.messages.length) {
      setNotice(environment.messages.join(' '));
      return;
    }
    if (validation.length) {
      setNotice(validation[0]);
      return;
    }
    setBusy(true);
    const pm = environment?.package_manager || 'npm';
    try {
      setOutput(`Running ${pm} run check…\n`);
      const check = await invoke<CommandResult>('project_command', { path: repository, operation: 'check' });
      if (check.output) setOutput(check.output);
      if (check.code !== 0) {
        setNotice('Check failed. Review the output before publishing.');
        return;
      }
      setOutput(prev => `${prev}\nRunning ${pm} run build…\n`);
      const build = await invoke<CommandResult>('project_command', { path: repository, operation: 'build' });
      if (build.output) setOutput(prev => `${prev}\n${build.output}`);
      if (build.code !== 0) {
        setNotice('Build failed. Review the output before publishing.');
        return;
      }
      const pushed = await invoke<CommandResult>('publish', {
        path: repository,
        message: commitMessage || `Update ${selected?.title || 'site content'}`,
      });
      if (pushed.code !== 0) {
        setOutput(prev => `${prev}\n${pushed.output}`);
        setNotice('Push failed. Your local changes and any commit are preserved.');
        return;
      }
      setOutput(prev => `${prev}\n${pushed.output}`);
      setNotice('Pushed successfully. GitHub Pages deployment may still be running.');
      setPublishDialog(false);
      await refreshGit();
    } catch (e) {
      setOutput(prev => `${prev}\n${String(e)}`);
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function loadWorkingDiff() {
    if (!native || !repository) return;
    setDiffLoading(true);
    try {
      const diff = await invoke<string>('git_diff_file', { path: repository, file: null });
      setDiffText(diff);
    } catch (e) {
      setDiffText(String(e));
    } finally {
      setDiffLoading(false);
    }
  }

  const content = selected ? (
    <>
      <EditorToolbar
        selected={selected}
        dirty={dirty}
        busy={busy}
        mode={mode}
        sourceMode={sourceMode}
        hasSchemaIssues={schemaIssues.length > 0}
        onSetMode={setMode}
        onToggleSourceMode={() => setSourceMode(!sourceMode)}
        onSave={save}
      />

      {recoveredDraft && (
        <div className="draft-recovery-banner">
          <span>
            <strong>Unsaved draft recovery available</strong> from {new Date(recoveredDraft.timestamp).toLocaleTimeString()}.
          </span>
          <div className="draft-recovery-actions">
            <button
              className="button button-outline button-xs"
              onClick={() => {
                clearDraftRecovery(repository, selected.path);
                setRecoveredDraft(null);
              }}
            >
              Discard Draft
            </button>
            <button
              className="button button-primary button-xs"
              onClick={() => {
                setSource(recoveredDraft.source);
                try {
                  setMetadata(parseSiteDocument(recoveredDraft.source).metadata);
                } catch {}
                setRecoveredDraft(null);
                setNotice('Draft recovered from local storage.');
              }}
            >
              Restore Draft
            </button>
          </div>
        </div>
      )}

      <div className="workarea" ref={workarea}>
        <div className="editor-column">
          {mode === 'edit' && (
            <>
              <MetadataEditor
                selected={selected}
                metadata={metadata}
                isOpen={metadataOpen}
                dropTarget={dropTarget}
                validation={validation}
                allRepoTags={allRepoTags}
                onToggle={() => setMetadataOpen(!metadataOpen)}
                onFieldChange={setField}
                onChooseImage={chooseImage}
              />

              <MarkdownEditor
                selected={selected}
                source={source}
                body={body}
                sourceMode={sourceMode}
                isMdx={isMdx}
                wordWrap={wordWrap}
                wordsCount={wordsCount}
                dropTarget={dropTarget}
                editorialIssues={editorialIssues}
                bodyEditorRef={bodyEditor}
                sourceEditorRef={sourceEditor}
                onSourceChange={val => {
                  setSource(val);
                  try {
                    setMetadata(parseSiteDocument(val).metadata);
                  } catch {}
                  updateCursorPosition(sourceEditor.current);
                }}
                onBodyChange={val => {
                  setSource(replaceMarkdownBody(source, val));
                  updateCursorPosition(bodyEditor.current);
                }}
                onToggleWordWrap={() => setWordWrap(!wordWrap)}
                onToggleSourceMode={() => setSourceMode(!sourceMode)}
                onUpdateCursorPos={updateCursorPosition}
                onInsertMarkdown={insertMarkdown}
                onInsertTable={insertTable}
                onInsertSnippet={insertSnippet}
                onFixEmDashes={handleFixEmDashes}
              />
            </>
          )}

          {mode === 'preview' && (
            <section className="preview-page">
              <div className="eyebrow">ARTICLE PREVIEW · APPROXIMATION</div>
              <h1>{String(metadata.title || 'Untitled')}</h1>
              <p className="preview-description">{String(metadata.description || '')}</p>
              <div className="preview-meta">
                {metadata.date ? String(metadata.date).slice(0, 10) : ''}
                {metadata.category && <span className="tag category-tag">{metadata.category}</span>}
                {Array.isArray(metadata.tags) &&
                  metadata.tags.map(t => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
              </div>
              {selected.kind === 'Projects' && metadata.visualImage && previewAssets[String(metadata.visualImage)] && (
                <img
                  className="project-image-preview"
                  src={previewAssets[String(metadata.visualImage)]}
                  alt={String(metadata.visualImageAlt || '')}
                />
              )}
              <hr />
              <article className="prose-preview" dangerouslySetInnerHTML={{ __html: rendered }} />
            </section>
          )}
        </div>

        {mode === 'edit' && (
          <>
            <div
              className="pane-resize-handle"
              role="separator"
              aria-label="Resize editor and render preview"
              tabIndex={0}
              onPointerDown={startPaneResize}
              onPointerMove={resizePanes}
              onPointerUp={finishPaneResize}
              onPointerCancel={finishPaneResize}
            />
            <ArticlePreviewPane
              selected={selected}
              metadata={metadata}
              renderedHtml={rendered}
              isMdx={isMdx}
              previewWidth={previewWidth}
              previewAssets={previewAssets}
            />
          </>
        )}

        {outlineOpen && (
          <DocumentOutlineDrawer
            open={outlineOpen}
            headings={headings}
            onClose={() => setOutlineOpen(false)}
            onSelectHeading={item => {
              if (bodyEditor.current) {
                const lines = body.split('\n');
                let charIdx = 0;
                for (let i = 0; i < item.line && i < lines.length; i++) {
                  charIdx += lines[i].length + 1;
                }
                bodyEditor.current.focus();
                bodyEditor.current.setSelectionRange(charIdx, charIdx);
                bodyEditor.current.scrollTop = Math.max(0, item.line * 24 - 40);
                updateCursorPosition(bodyEditor.current);
              } else if (sourceEditor.current) {
                sourceEditor.current.focus();
                updateCursorPosition(sourceEditor.current);
              }
            }}
          />
        )}
      </div>
    </>
  ) : (
    <div className="empty-editor">
      <div className="empty-symbol">
        <FileText size={24} />
      </div>
      <h2>Choose a document</h2>
      <p>Open an article or project from the library to edit its metadata and Markdown.</p>
      {!repository && (
        <button className="button button-primary" onClick={chooseRepository}>
          Open website folder
        </button>
      )}
    </div>
  );

  return (
    <div className="app-shell">
      <AppHeader
        repository={repository}
        recent={recent}
        sidebar={sidebar}
        dirty={dirty}
        selectedTitle={selected?.title}
        appAccent={appAccent}
        busy={busy}
        schemaIssuesCount={schemaIssues.length}
        native={native}
        liveSiteUrl={LIVE_SITE_URL}
        theme={theme}
        outlineOpen={outlineOpen}
        onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        onToggleOutline={() => setOutlineOpen(o => !o)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onSelectRecent={refreshRepository}
        onChooseRepository={chooseRepository}
        onOpenSidebar={() => setSidebar(true)}
        onOpenAppearance={() => {
          setAccentDraft(appAccent);
          setAppearanceDialog(true);
        }}
        onOpenPublish={() => {
          setCommitMessage(`Update ${selected?.title || 'site content'}`);
          setPublishDialog(true);
        }}
        onNotice={setNotice}
      />

      <div className="main-layout">
        {sidebar && (
          <ContentSidebar
            entries={entries}
            selected={selected}
            dirty={dirty}
            search={search}
            type={type}
            stateFilter={stateFilter}
            repository={repository}
            native={native}
            busy={busy}
            schemaIssues={schemaIssues}
            environment={environment}
            onSearchChange={setSearch}
            onTypeChange={setType}
            onStateFilterChange={setStateFilter}
            onSelectEntry={selectEntry}
            onNewClick={() => {
              setNewKind('writing');
              setNewTitle('');
              setNewSlug('');
              setNewDialog(true);
            }}
            onRefresh={() => refreshRepository(repository)}
            onCollapse={() => setSidebar(false)}
            onInstallDependencies={installDependencies}
            onRenameClick={setRenameTarget}
            onDuplicateClick={setDuplicateTarget}
            onDeleteClick={setDeleteTarget}
          />
        )}
        <main className="main-panel">{content}</main>
      </div>

      <StatusBar
        repository={repository}
        git={git}
        selected={selected}
        wordsCount={wordsCount}
        readTimeMin={readTimeMin}
        cursorPos={cursorPos}
        wordWrap={wordWrap}
        busy={busy}
        native={native}
        devServerRunning={devServerRunning}
        onToggleWordWrap={() => setWordWrap(!wordWrap)}
        onToggleServer={server}
        onRunCommand={command}
      />

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <OutputPanel
        notice={notice}
        output={output}
        busy={busy}
        onClear={() => {
          setNotice('');
          setOutput('');
        }}
        onCancelCommand={cancelCommand}
      />

      <AppearanceDialog
        open={appearanceDialog}
        appAccent={appAccent}
        accentDraft={accentDraft}
        accentPresets={ACCENT_PRESETS}
        defaultAccent={DEFAULT_APP_ACCENT}
        onClose={() => setAppearanceDialog(false)}
        onUpdateAccent={updateAccent}
      />

      <NewDocumentDialog
        open={newDialog}
        busy={busy}
        kind={newKind}
        extension={newExtension}
        title={newTitle}
        slug={newSlug}
        onClose={() => setNewDialog(false)}
        onKindChange={setNewKind}
        onExtensionChange={setNewExtension}
        onTitleChange={setNewTitle}
        onSlugChange={setNewSlug}
        onCreate={createDocument}
      />

      {renameTarget && (
        <RenameDialog
          entry={renameTarget}
          busy={busy}
          onClose={() => setRenameTarget(null)}
          onConfirm={handleRename}
        />
      )}

      {duplicateTarget && (
        <DuplicateDialog
          entry={duplicateTarget}
          busy={busy}
          onClose={() => setDuplicateTarget(null)}
          onConfirm={handleDuplicate}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          entry={deleteTarget}
          busy={busy}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      <PublishDialog
        open={publishDialog}
        busy={busy}
        git={git}
        commitMessage={commitMessage}
        diffText={diffText}
        diffLoading={diffLoading}
        onClose={() => setPublishDialog(false)}
        onCommitMessageChange={setCommitMessage}
        onLoadDiff={loadWorkingDiff}
        onPublish={publish}
      />

      {conflictData && selected && (
        <ConflictDialog
          filePath={selected.path}
          localText={conflictData.localText}
          diskText={conflictData.diskText}
          busy={busy}
          onClose={() => setConflictData(null)}
          onReloadFromDisk={() => {
            setConflictData(null);
            void selectEntry(selected, true);
          }}
          onOverwriteDisk={handleOverwriteDisk}
        />
      )}

      {closeConfirmOpen && (
        <CloseConfirmDialog
          fileName={selected?.path.split('/').at(-1) || selected?.title || 'Unsaved Document'}
          busy={busy}
          onSaveAndClose={async () => {
            const saved = await save();
            if (saved) {
              closeConfirmedRef.current = true;
              setCloseConfirmOpen(false);
              await getCurrentWindow().destroy();
            }
          }}
          onDiscardAndClose={async () => {
            closeConfirmedRef.current = true;
            setCloseConfirmOpen(false);
            await getCurrentWindow().destroy();
          }}
          onCancel={() => setCloseConfirmOpen(false)}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
