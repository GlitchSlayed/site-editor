import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  FileText,
  Save,
  Eye,
  Code2,
  Play,
  Square,
  Check,
  Hammer,
  Send,
  ChevronDown,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { parseSiteDocument, replaceMarkdownBody, serializeSiteDocument, validateMetadata, type SiteMetadata } from './lib/site-adapter';
import { auditEditorialText, fixAllEmDashes, type EditorialIssue } from './lib/editorial-rules';
import { initMiddleClickAutoscroll } from './lib/autoscroll';
import { AppHeader } from './components/layout/AppHeader';
import { ContentSidebar, type Entry, type Environment } from './components/sidebar/ContentSidebar';
import { MetadataEditor } from './components/editor/MetadataEditor';
import { FormatToolbar } from './components/editor/FormatToolbar';
import { EditorialAuditPanel } from './components/editor/EditorialAuditPanel';
import { ArticlePreviewPane } from './components/preview/ArticlePreviewPane';
import { DocumentOutlineDrawer, type HeadingItem } from './components/outline/DocumentOutlineDrawer';
import { KeyboardShortcutsDialog } from './components/modals/KeyboardShortcutsDialog';
import { RenameDialog } from './components/modals/RenameDialog';
import { DuplicateDialog } from './components/modals/DuplicateDialog';
import { DeleteDialog } from './components/modals/DeleteDialog';
import { useShortcuts } from './hooks/useShortcuts';
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

const startingRecent: string[] = JSON.parse(localStorage.getItem('recent-repositories') || '[]');
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
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
  const [newDialog, setNewDialog] = useState(false);
  const [newKind, setNewKind] = useState<'writing' | 'projects'>('writing');
  const [newExtension, setNewExtension] = useState<'md' | 'mdx'>('md');
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [renameTarget, setRenameTarget] = useState<Entry | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Entry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);

  const [appAccent, setAppAccent] = useState(() => {
    const stored = localStorage.getItem('blog-editor-accent');
    return stored && /^#[0-9a-f]{6}$/i.test(stored) ? stored : DEFAULT_APP_ACCENT;
  });
  const [accentDraft, setAccentDraft] = useState(appAccent);
  const [appearanceDialog, setAppearanceDialog] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [sourceMode, setSourceMode] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [metadataOpen, setMetadataOpen] = useState(() => {
    const stored = localStorage.getItem('blog-editor-metadata-open');
    return stored !== null ? stored === 'true' : true;
  });
  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    const stored = localStorage.getItem('blog-editor-word-wrap');
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('blog-editor-metadata-open', String(metadataOpen));
  }, [metadataOpen]);

  useEffect(() => {
    localStorage.setItem('blog-editor-word-wrap', String(wordWrap));
  }, [wordWrap]);

  useEffect(() => {
    return initMiddleClickAutoscroll();
  }, []);

  const bodyEditor = useRef<HTMLTextAreaElement>(null);
  const sourceEditor = useRef<HTMLTextAreaElement>(null);
  const workarea = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(440);
  const [previewAssets, setPreviewAssets] = useState<Record<string, string>>({});
  const [dropTarget, setDropTarget] = useState<'content' | 'visual' | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('purpose-theme');
    return stored === 'dark' ? 'dark' : 'light';
  });
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const dirty = Boolean(selected) && (source !== savedSource || JSON.stringify(metadata) !== savedMetadata);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('purpose-theme', theme);
  }, [theme]);

  useEffect(() => {
    const docTitle = metadata.title || selected?.title || '';
    const titleStr = docTitle ? `Purpose — ${docTitle}${dirty ? ' ●' : ''}` : 'Purpose';
    document.title = titleStr;
    if (native) {
      getCurrentWindow().setTitle(titleStr).catch(() => {});
    }
  }, [selected?.title, metadata.title, dirty, native]);

  useEffect(() => {
    const hex = appAccent.slice(1);
    const channels = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const luminance = channels
      .map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    document.documentElement.style.setProperty('--orange-accent', appAccent);
    document.documentElement.style.setProperty('--accent-foreground', luminance > 0.179 ? '#080808' : '#f5f5f5');
    localStorage.setItem('blog-editor-accent', appAccent);
  }, [appAccent]);

  useEffect(() => {
    if (repository && native) refreshRepository(repository);
  }, []);

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
  }, [native, repository, selected?.path]);

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
  }, [native, repository, source, metadata.visualImage, previewAssets]);

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

  const rendered = useMemo(() => {
    let markdown = body;

    // Satteri percentage annotations in tables / text: (+12.4%), (-3.2%)
    markdown = markdown.replace(
      /\(\+([0-9.]+%?)\)/g,
      '<span class="delta-badge delta-pos">(+$1)</span>'
    );
    markdown = markdown.replace(
      /\(-([0-9.]+%?)\)/g,
      '<span class="delta-badge delta-neg">(-$1)</span>'
    );

    // Math preview blocks
    markdown = markdown.replace(
      /\$\$([\s\S]*?)\$\$/g,
      (_m, eq: string) => `<div class="mdx-equation-preview"><div class="mdx-equation-math">${escapeHtml(eq)}</div></div>`
    );
    markdown = markdown.replace(
      /\$([^$\n]+)\$/g,
      (_m, eq: string) => `<code class="math-inline">${escapeHtml(eq)}</code>`
    );

    // EngineeringNote visual cards
    markdown = markdown.replace(
      /<EngineeringNote\s+kind="([^"]*)"(?:\s+title="([^"]*)")?>([\s\S]*?)<\/EngineeringNote>/g,
      (_m, kind: string, title: string, content: string) =>
        `<aside class="mdx-note-preview mdx-note-${escapeHtml(kind)}"><div class="mdx-note-kicker">${escapeHtml(kind)}</div>${title ? `<h4>${escapeHtml(title)}</h4>` : ''}<div>${content}</div></aside>`
    );

    // EquationBlock visual cards
    markdown = markdown.replace(
      /<EquationBlock[\s\S]*?equation="([^"]*)"[\s\S]*?description="([^"]*)"[\s\S]*?\/>/g,
      (_m, eq: string, desc: string) =>
        `<div class="mdx-equation-preview"><div class="mdx-equation-math">${escapeHtml(eq)}</div><div class="mdx-equation-desc">${escapeHtml(desc)}</div></div>`
    );

    // Measurement visual cards
    markdown = markdown.replace(
      /<Measurement[\s\S]*?label="([^"]*)"[\s\S]*?value=\{?([0-9.]+)\}?[\s\S]*?unit="([^"]*)"[\s\S]*?\/>/g,
      (_m, label: string, value: string, unit: string) =>
        `<div class="mdx-measurement-preview"><span class="mdx-measurement-lbl">${escapeHtml(label)}</span><span class="mdx-measurement-val">${escapeHtml(value)} ${escapeHtml(unit)}</span></div>`
    );

    const html = marked.parse(markdown, { async: false }) as string;
    const withAssets = html.replace(/src="([^"]+)"/g, (_all, src: string) => {
      const asset = siteAssetPath(src);
      return `src="${asset && previewAssets[asset] ? previewAssets[asset] : src}"`;
    });
    return DOMPurify.sanitize(withAssets, { ADD_TAGS: ['aside'], ADD_ATTR: ['class'] });
  }, [body, previewAssets]);

  const validation = useMemo(() => {
    return selected ? validateMetadata(selected.kind.toLowerCase() as 'writing' | 'projects', metadata) : [];
  }, [selected, metadata]);

  const editorialIssues: EditorialIssue[] = useMemo(() => {
    return auditEditorialText(body, isMdx);
  }, [body, isMdx]);

  async function refreshRepository(path: string) {
    try {
      const list = await invoke<Entry[]>('list_content', { path });
      const issues = await invoke<string[]>('validate_repo', { path });
      setRepository(path);
      setEntries(list);
      setSchemaIssues(issues);
      const next = [path, ...recent.filter(r => r !== path)].slice(0, 5);
      setRecent(next);
      localStorage.setItem('recent-repositories', JSON.stringify(next));
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

  async function selectEntry(item: Entry) {
    if (dirty && !window.confirm('Discard your unsaved edits and open another file?')) return;
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
      setNotice('Document deleted.');
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

  async function save() {
    if (!native || !selected) return false;
    if (schemaIssues.length) {
      setNotice(schemaIssues.join(' '));
      return false;
    }
    try {
      const outputText = serializeSiteDocument(source, metadata, body);
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
      setNotice('Saved locally. Markdown body and unrecognized metadata are preserved.');
      setEntries(await invoke<Entry[]>('list_content', { path: repository }));
      await refreshGit();
    } catch (e) {
      setNotice(String(e));
      return false;
    }
    return true;
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

      // Check if importStatement is already present in source
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
            // If selection was inside frontmatter, place insertion after the import statement
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

  async function command(operation: 'check' | 'build') {
    setBusy(true);
    const pm = environment?.package_manager || 'npm';
    setOutput(`Running ${pm} run ${operation}…`);
    try {
      const r = await invoke<CommandResult>('project_command', { path: repository, operation });
      setOutput(r.output || `Exited with code ${r.code}`);
      setNotice(r.code === 0 ? `${pm} run ${operation} completed.` : `${pm} run ${operation} failed.`);
    } catch (e) {
      setOutput(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function installDependencies() {
    setBusy(true);
    setOutput('Installing the site dependencies…');
    try {
      const result = await invoke<CommandResult>('project_command', { path: repository, operation: 'install' });
      setOutput(result.output);
      if (result.code === 0) {
        setNotice('Dependencies installed.');
        setEnvironment(await invoke<Environment>('environment', { path: repository }));
      } else setNotice('Dependency installation failed.');
    } catch (e) {
      setOutput(String(e));
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function server() {
    setBusy(true);
    try {
      const start = !output.includes('4321');
      const result = await invoke<string>(start ? 'run_dev_server' : 'stop_dev_server', { path: repository });
      setOutput(result);
      if (start) window.open('http://127.0.0.1:4321', '_blank');
    } catch (e) {
      setOutput(String(e));
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
      setOutput(`Running ${pm} run check…`);
      const check = await invoke<CommandResult>('project_command', { path: repository, operation: 'check' });
      setOutput(check.output);
      if (check.code !== 0) {
        setNotice('Check failed. Review the output before publishing.');
        return;
      }
      setOutput(`Running ${pm} run build…`);
      const build = await invoke<CommandResult>('project_command', { path: repository, operation: 'build' });
      setOutput(build.output);
      if (build.code !== 0) {
        setNotice('Build failed. Review the output before publishing.');
        return;
      }
      const pushed = await invoke<CommandResult>('publish', {
        path: repository,
        message: commitMessage || `Update ${selected?.title || 'site content'}`,
      });
      if (pushed.code !== 0) {
        setOutput(pushed.output);
        setNotice('Push failed. Your local changes and any commit are preserved.');
        return;
      }
      setOutput(pushed.output);
      setNotice('Pushed successfully. GitHub Pages deployment may still be running.');
      setPublishDialog(false);
      await refreshGit();
    } catch (e) {
      setOutput(String(e));
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  }

  const content = selected ? (
    <>
      <div className="docbar">
        <div className="crumb">
          <span>{selected.kind}</span>
          <span className="slash">/</span>
          <span>{selected.path.split('/').at(-1)}</span>
          {dirty && <span className="unsaved-dot" title="Unsaved changes" />}
        </div>
        <div className="doc-actions">
          <div className="segmented">
            <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>
              <Code2 size={14} /> Edit
            </button>
            <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
              <Eye size={14} /> Preview
            </button>
          </div>
          <button
            className={`icon-btn ${sourceMode ? 'active' : ''}`}
            title="Raw source mode"
            onClick={() => setSourceMode(!sourceMode)}
          >
            <Code2 size={16} />
          </button>
          <button
            className="button button-primary button-sm"
            onClick={save}
            disabled={!dirty || busy || schemaIssues.length > 0}
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>

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

              <section
                className={`markdown-section ${dropTarget === 'content' ? 'image-drop-active' : ''}`}
                data-image-drop="content"
              >
                <div className="section-title">
                  <div>
                    <span className="eyebrow">CONTENT</span>
                    <h2>{selected.path.endsWith('.mdx') ? 'MDX Source & Components' : 'Markdown Body'}</h2>
                  </div>
                  <div className="markdown-tools">
                    <button
                      type="button"
                      className={`tool-button ${wordWrap ? 'active' : ''}`}
                      onClick={() => setWordWrap(!wordWrap)}
                      title={wordWrap ? 'Word wrap is ON (lines wrap cleanly)' : 'Word wrap is OFF (lines do not wrap)'}
                    >
                      {wordWrap ? 'Wrap: On' : 'Wrap: Off'}
                    </button>
                    <button className="tool-button" onClick={() => setSourceMode(!sourceMode)}>
                      {sourceMode ? 'Rich editor' : 'Raw source'}
                    </button>
                    <span className="word-count">{wordsCount} words</span>
                  </div>
                </div>

                {dropTarget === 'content' && (
                  <div className="image-drop-message">Drop image to add it to this document</div>
                )}

                <FormatToolbar
                  isMdx={isMdx}
                  onInsertMarkdown={insertMarkdown}
                  onInsertTable={insertTable}
                  onInsertSnippet={insertSnippet}
                />

                {sourceMode || selected.path.endsWith('.mdx') ? (
                  <textarea
                    ref={sourceEditor}
                    className={`source-editor ${wordWrap ? 'wrap-on' : 'wrap-off'}`}
                    wrap={wordWrap ? 'soft' : 'off'}
                    spellCheck={false}
                    value={source}
                    onMouseDown={e => {
                      if (e.button === 1) e.preventDefault();
                    }}
                    onAuxClick={e => {
                      if (e.button === 1) e.preventDefault();
                    }}
                    onKeyUp={e => updateCursorPosition(e.currentTarget)}
                    onClick={e => updateCursorPosition(e.currentTarget)}
                    onSelect={e => updateCursorPosition(e.currentTarget)}
                    onChange={e => {
                      setSource(e.target.value);
                      try {
                        setMetadata(parseSiteDocument(e.target.value).metadata);
                      } catch {}
                      updateCursorPosition(e.currentTarget);
                    }}
                    aria-label="Markdown source"
                  />
                ) : (
                  <textarea
                    ref={bodyEditor}
                    className={`markdown-editor ${wordWrap ? 'wrap-on' : 'wrap-off'}`}
                    wrap={wordWrap ? 'soft' : 'off'}
                    spellCheck={false}
                    value={body}
                    onMouseDown={e => {
                      if (e.button === 1) e.preventDefault();
                    }}
                    onAuxClick={e => {
                      if (e.button === 1) e.preventDefault();
                    }}
                    onKeyUp={e => updateCursorPosition(e.currentTarget)}
                    onClick={e => updateCursorPosition(e.currentTarget)}
                    onSelect={e => updateCursorPosition(e.currentTarget)}
                    onChange={e => {
                      setSource(replaceMarkdownBody(source, e.target.value));
                      updateCursorPosition(e.currentTarget);
                    }}
                    aria-label="Markdown content"
                    placeholder="Write your article in Markdown…"
                  />
                )}

                <EditorialAuditPanel
                  issues={editorialIssues}
                  wordCount={wordsCount}
                  onFixEmDashes={handleFixEmDashes}
                />

                <div className="editor-foot">
                  <span>
                    {selected.path.endsWith('.mdx')
                      ? 'MDX source · Interactive components preview in live Astro server'
                      : 'Markdown · math equations preview approximated via KaTeX'}
                  </span>
                  <span>Autosave off</span>
                </div>
              </section>
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

      <footer className="statusbar">
        <div className="status-left">
          <span className="status-dot" />
          {repository ? repository.split('/').filter(Boolean).at(-1) : 'No repository opened'}
          {git && (
            <>
              <span className="status-divider" />
              <span>
                branch <b>{git.branch || 'detached'}</b>
              </span>
              <span className="git-count">
                ↑ {git.ahead} ↓ {git.behind}
              </span>
            </>
          )}
          {selected && (
            <>
              <span className="status-divider" />
              <span title="Word count and estimated reading time">
                {wordsCount} words · ~{readTimeMin} min read
              </span>
              <span className="status-divider" />
              <span title="Cursor position">
                Ln {cursorPos.line}, Col {cursorPos.col}
              </span>
            </>
          )}
        </div>
        <div className="status-actions">
          <button
            onClick={() => setWordWrap(!wordWrap)}
            title="Toggle word wrap (Ctrl+Shift+W)"
            className={wordWrap ? 'status-btn-active' : ''}
          >
            Wrap: {wordWrap ? 'On' : 'Off'}
          </button>
          <button onClick={server} disabled={!native || !repository || busy}>
            {output.includes('4321') ? <Square size={13} /> : <Play size={13} />}{' '}
            {output.includes('4321') ? 'Stop preview' : 'Astro preview'}
          </button>
          <button onClick={() => command('check')} disabled={!native || !repository || busy}>
            <Check size={14} /> Check
          </button>
          <button onClick={() => command('build')} disabled={!native || !repository || busy}>
            <Hammer size={14} /> Build
          </button>
        </div>
      </footer>

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {(notice || output) && (
        <div className="notice-panel">
          <div className="notice-header">
            <strong>{notice || 'Command output'}</strong>
            <button onClick={() => { setNotice(''); setOutput(''); }}>×</button>
          </div>
          {output && <pre>{output}</pre>}
        </div>
      )}

      {appearanceDialog && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setAppearanceDialog(false);
          }}
        >
          <section className="appearance-modal">
            <div className="modal-title">
              <div>
                <span className="eyebrow">APPEARANCE</span>
                <h2>App accent color</h2>
              </div>
              <button className="icon-btn" onClick={() => setAppearanceDialog(false)} aria-label="Close appearance settings">
                ×
              </button>
            </div>
            <p className="modal-copy">
              Choose a highlight color for buttons, selection, editor controls, and the Blog Editor mark. Your choice is saved on this device.
            </p>
            <div className="accent-swatches">
              {ACCENT_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  className={`accent-swatch ${appAccent === preset.value ? 'selected' : ''}`}
                  style={{ '--swatch-color': preset.value } as React.CSSProperties}
                  onClick={() => updateAccent(preset.value)}
                  aria-label={`${preset.label} accent`}
                  title={preset.label}
                />
              ))}
            </div>
            <label className="field">
              <span>Custom color</span>
              <div className="color-input accent-input">
                <input type="color" value={appAccent} onChange={e => updateAccent(e.target.value)} />
                <input
                  value={accentDraft}
                  onChange={e => updateAccent(e.target.value)}
                  placeholder="#ff5b36"
                  aria-label="Accent color hex value"
                />
              </div>
            </label>
            <div className="accent-preview-row">
              <span className="accent-preview-dot" style={{ background: appAccent }} /> Current app accent{' '}
              <button className="text-button" onClick={() => updateAccent(DEFAULT_APP_ACCENT)}>
                Reset
              </button>
            </div>
            <div className="modal-actions">
              <button className="button button-primary" onClick={() => setAppearanceDialog(false)}>
                Done
              </button>
            </div>
          </section>
        </div>
      )}

      {newDialog && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setNewDialog(false);
          }}
        >
          <section className="new-document-modal">
            <div className="modal-title">
              <div>
                <span className="eyebrow">CONTENT LIBRARY</span>
                <h2>Create a document</h2>
              </div>
              <button className="icon-btn" onClick={() => setNewDialog(false)}>
                ×
              </button>
            </div>
            <p className="modal-copy">
              Create a draft Markdown file in the site’s existing content folder. You can complete its details and preview it before publishing.
            </p>
            <label className="field">
              <span>Content type</span>
              <select value={newKind} onChange={e => setNewKind(e.target.value as 'writing' | 'projects')}>
                <option value="writing">Writing Post</option>
                <option value="projects">Project</option>
              </select>
            </label>
            <label className="field">
              <span>File format</span>
              <select value={newExtension} onChange={e => setNewExtension(e.target.value as 'md' | 'mdx')}>
                <option value="md">Markdown (.md)</option>
                <option value="mdx">Interactive MDX (.mdx)</option>
              </select>
            </label>
            <label className="field">
              <span>Title</span>
              <input
                autoFocus
                value={newTitle}
                onChange={e => {
                  setNewTitle(e.target.value);
                  setNewSlug(
                    e.target.value
                      .toLowerCase()
                      .normalize('NFKD')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '')
                  );
                }}
                placeholder={newKind === 'writing' ? 'A new technical post' : 'A new engineering project'}
              />
            </label>
            <label className="field">
              <span>Filename <small>without .{newExtension}</small></span>
              <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="lowercase-words" />
            </label>
            <div className="new-document-note">
              <span className="draft-badge">Draft</span> New documents start as drafts. Project drafts start with status Concept and fallback wing artwork.
            </div>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setNewDialog(false)}>
                Cancel
              </button>
              <button
                className="button button-primary"
                onClick={createDocument}
                disabled={busy || !newTitle.trim() || !newSlug.trim()}
              >
                <Plus size={14} />
                {busy ? 'Creating…' : 'Create draft'}
              </button>
            </div>
          </section>
        </div>
      )}

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

      {publishDialog && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setPublishDialog(false);
          }}
        >
          <section className="publish-modal">
            <div className="modal-title">
              <div>
                <span className="eyebrow">GIT PUBLISH</span>
                <h2>Review and publish</h2>
              </div>
              <button className="icon-btn" onClick={() => setPublishDialog(false)}>
                ×
              </button>
            </div>
            <p className="modal-copy">
              Save this document, validate the site, build it, then commit and push the allowed content and public asset changes.
            </p>
            <div className="git-summary">
              <div>
                <span>Branch</span>
                <strong>{git?.branch || '—'}</strong>
              </div>
              <div>
                <span>Remote</span>
                <strong>{git?.upstream || 'No upstream'}</strong>
              </div>
              <div>
                <span>Changed files</span>
                <strong>{git?.changed.length || 0}</strong>
              </div>
              <div>
                <span>Remote state</span>
                <strong>
                  {git?.behind ? `${git.behind} behind` : git?.ahead ? `${git.ahead} ahead` : 'Up to date'}
                </strong>
              </div>
            </div>
            {git?.behind ? (
              <div className="validation">Resolve remote changes before publishing.</div>
            ) : null}
            <label className="field">
              <span>Commit message</span>
              <input value={commitMessage} onChange={e => setCommitMessage(e.target.value)} />
            </label>
            <details className="diff-details">
              <summary>
                Review working diff <ChevronDown size={14} />
              </summary>
              <pre>{git?.diff || 'No unstaged text diff.'}</pre>
            </details>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setPublishDialog(false)}>
                Cancel
              </button>
              <button
                className="button button-primary"
                onClick={publish}
                disabled={busy || Boolean(git?.behind)}
              >
                <Send size={14} />
                {busy ? 'Publishing…' : 'Run checks and publish'}
              </button>
            </div>
            <p className="deploy-note">
              <ExternalLink size={13} /> A successful push triggers GitHub Pages deployment workflow.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
