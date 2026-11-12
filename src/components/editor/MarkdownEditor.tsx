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
