import React from 'react';
import { FormatToolbar } from './FormatToolbar';
import { EditorialAuditPanel } from './EditorialAuditPanel';
import type { Entry } from '../sidebar/ContentSidebar';
import type { EditorialIssue } from '../../lib/editorial-rules';

export interface MarkdownEditorProps {
  selected: Entry;
  source: string;
  body: string;
  sourceMode: boolean;
  isMdx: boolean;
  wordWrap: boolean;
  wordsCount: number;
  zenMode?: boolean;
  dropTarget: 'content' | 'visual' | null;
  editorialIssues: EditorialIssue[];
  bodyEditorRef: React.RefObject<HTMLTextAreaElement | null>;
  sourceEditorRef: React.RefObject<HTMLTextAreaElement | null>;
  onSourceChange: (val: string) => void;
  onBodyChange: (val: string) => void;
  onToggleWordWrap: () => void;
  onToggleSourceMode: () => void;
  onToggleZenMode?: () => void;
  onUpdateCursorPos: (el: HTMLTextAreaElement | null) => void;
  onInsertMarkdown: (before: string, after?: string, linePrefix?: string, placeholder?: string) => void;
  onInsertTable: () => void;
  onInsertSnippet: (snippet: string, importStatement?: string) => void;
  onFixEmDashes: () => void;
}

export function MarkdownEditor({
  selected: _selected,
  source,
  body,
  sourceMode,
  isMdx,
  wordWrap,
  wordsCount,
  zenMode = false,
  dropTarget,
  editorialIssues,
  bodyEditorRef,
  sourceEditorRef,
  onSourceChange,
  onBodyChange,
  onToggleWordWrap: _onToggleWordWrap,
  onToggleSourceMode: _onToggleSourceMode,
  onToggleZenMode,
  onUpdateCursorPos,
  onInsertMarkdown,
  onInsertTable,
  onInsertSnippet,
  onFixEmDashes,
}: MarkdownEditorProps) {
  const isRaw = sourceMode;

  const handleEditorKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    val: string,
    onChange: (next: string) => void
  ) => {
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // 1. Tab / Shift+Tab for 2-space indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey) {
        if (start === end) {
          const next = val.slice(0, start) + '  ' + val.slice(end);
          onChange(next);
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = start + 2;
            onUpdateCursorPos(el);
          });
        } else {
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          const lineEndIdx = val.indexOf('\n', end);
          const lineEnd = lineEndIdx < 0 ? val.length : lineEndIdx;
          const lines = val.slice(lineStart, lineEnd).split('\n');
          const indented = lines.map(l => '  ' + l).join('\n');
          const next = val.slice(0, lineStart) + indented + val.slice(lineEnd);
          onChange(next);
          requestAnimationFrame(() => {
            el.selectionStart = start + 2;
            el.selectionEnd = end + lines.length * 2;
            onUpdateCursorPos(el);
          });
        }
      } else {
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const lineEndIdx = val.indexOf('\n', end);
        const lineEnd = lineEndIdx < 0 ? val.length : lineEndIdx;
        const lines = val.slice(lineStart, lineEnd).split('\n');
        let removedFirst = 0;
        let totalRemoved = 0;
        const outdented = lines
          .map((l, i) => {
            let count = 0;
            if (l.startsWith('  ')) count = 2;
            else if (l.startsWith(' ') || l.startsWith('\t')) count = 1;
            if (i === 0) removedFirst = count;
            totalRemoved += count;
            return l.slice(count);
          })
          .join('\n');
        const next = val.slice(0, lineStart) + outdented + val.slice(lineEnd);
        onChange(next);
        requestAnimationFrame(() => {
          el.selectionStart = Math.max(lineStart, start - removedFirst);
          el.selectionEnd = Math.max(lineStart, end - totalRemoved);
          onUpdateCursorPos(el);
        });
      }
      return;
    }

    // 2. Enter on lists
    if (e.key === 'Enter') {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.slice(lineStart, start);

      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const marker = bulletMatch[2];
        const content = bulletMatch[3];
        if (content.trim() === '') {
          const next = val.slice(0, lineStart) + val.slice(start);
          onChange(next);
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = lineStart;
            onUpdateCursorPos(el);
          });
        } else {
          const prefix = `\n${indent}${marker} `;
          const next = val.slice(0, start) + prefix + val.slice(end);
          onChange(next);
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = start + prefix.length;
            onUpdateCursorPos(el);
          });
        }
        return;
      }

      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        e.preventDefault();
        const indent = numMatch[1];
        const num = parseInt(numMatch[2], 10);
        const content = numMatch[3];
        if (content.trim() === '') {
          const next = val.slice(0, lineStart) + val.slice(start);
          onChange(next);
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = lineStart;
            onUpdateCursorPos(el);
          });
        } else {
          const prefix = `\n${indent}${num + 1}. `;
          const next = val.slice(0, start) + prefix + val.slice(end);
          onChange(next);
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = start + prefix.length;
            onUpdateCursorPos(el);
          });
        }
        return;
      }
    }

    // 3. Auto-close pairs & selection wrap
    const PAIRS: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '`': '`',
      '"': '"',
      "'": "'",
      '$': '$',
      '*': '*',
    };

    if (PAIRS[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (start !== end) {
        e.preventDefault();
        const open = e.key;
        const close = PAIRS[e.key];
        const selectedText = val.slice(start, end);
        const next = val.slice(0, start) + open + selectedText + close + val.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          el.selectionStart = start + 1;
          el.selectionEnd = end + 1;
          onUpdateCursorPos(el);
        });
        return;
      } else if (e.key === '`' || e.key === '$' || e.key === '(' || e.key === '[') {
        e.preventDefault();
        const open = e.key;
        const close = PAIRS[e.key];
        const next = val.slice(0, start) + open + close + val.slice(start);
        onChange(next);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 1;
          onUpdateCursorPos(el);
        });
        return;
      }
    }
  };

  return (
    <section
      className={`markdown-section ${dropTarget === 'content' ? 'image-drop-active' : ''} ${zenMode ? 'zen-active' : ''}`}
      data-image-drop="content"
    >
      {dropTarget === 'content' && (
        <div className="image-drop-message">Drop image to add it to this document</div>
      )}

      <FormatToolbar
        isMdx={isMdx}
        zenMode={zenMode}
        onToggleZenMode={onToggleZenMode}
        onInsertMarkdown={onInsertMarkdown}
        onInsertTable={onInsertTable}
        onInsertSnippet={onInsertSnippet}
      />

      {isRaw ? (
        <textarea
          ref={sourceEditorRef}
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
          onKeyDown={e => handleEditorKeyDown(e, source, onSourceChange)}
          onKeyUp={e => onUpdateCursorPos(e.currentTarget)}
          onClick={e => onUpdateCursorPos(e.currentTarget)}
          onSelect={e => onUpdateCursorPos(e.currentTarget)}
          onChange={e => onSourceChange(e.target.value)}
          aria-label="Markdown source"
        />
      ) : (
        <textarea
          ref={bodyEditorRef}
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
          onKeyDown={e => handleEditorKeyDown(e, body, onBodyChange)}
          onKeyUp={e => onUpdateCursorPos(e.currentTarget)}
          onClick={e => onUpdateCursorPos(e.currentTarget)}
          onSelect={e => onUpdateCursorPos(e.currentTarget)}
          onChange={e => onBodyChange(e.target.value)}
          aria-label="Markdown content"
          placeholder="Begin writing your monograph in Markdown…"
        />
      )}

      <EditorialAuditPanel
        issues={editorialIssues}
        wordCount={wordsCount}
        onFixEmDashes={onFixEmDashes}
      />

      <div className="editor-foot">
        <span>
          {isMdx
            ? 'MDX active · Interactive site components preview via Astro server'
            : 'Markdown active · Math equations formatted via KaTeX'}
        </span>
        <span>Autosave recovery active</span>
      </div>
    </section>
  );
}
