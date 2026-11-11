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
  dropTarget: 'content' | 'visual' | null;
  editorialIssues: EditorialIssue[];
  bodyEditorRef: React.RefObject<HTMLTextAreaElement | null>;
  sourceEditorRef: React.RefObject<HTMLTextAreaElement | null>;
  onSourceChange: (val: string) => void;
  onBodyChange: (val: string) => void;
  onToggleWordWrap: () => void;
  onToggleSourceMode: () => void;
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
  dropTarget,
  editorialIssues,
  bodyEditorRef,
  sourceEditorRef,
  onSourceChange,
  onBodyChange,
  onToggleWordWrap,
  onToggleSourceMode,
  onUpdateCursorPos,
  onInsertMarkdown,
  onInsertTable,
  onInsertSnippet,
  onFixEmDashes,
}: MarkdownEditorProps) {
  const isRaw = sourceMode;

  return (
    <section
      className={`markdown-section ${dropTarget === 'content' ? 'image-drop-active' : ''}`}
      data-image-drop="content"
    >
      <div className="section-title">
        <div>
          <span className="eyebrow">CONTENT</span>
          <h2>{isMdx ? 'MDX Source & Components' : 'Markdown Body'}</h2>
        </div>
        <div className="markdown-tools">
          <button
            type="button"
            className={`tool-button ${wordWrap ? 'active' : ''}`}
            onClick={onToggleWordWrap}
            title={wordWrap ? 'Word wrap is ON (lines wrap cleanly)' : 'Word wrap is OFF (lines do not wrap)'}
          >
            {wordWrap ? 'Wrap: On' : 'Wrap: Off'}
          </button>
          <button className="tool-button" onClick={onToggleSourceMode}>
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
          placeholder="Write your article in Markdown…"
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
            ? 'MDX source · Interactive components preview in live Astro server'
            : 'Markdown · math equations preview approximated via KaTeX'}
        </span>
        <span>Autosave draft recovery enabled</span>
      </div>
    </section>
  );
}
