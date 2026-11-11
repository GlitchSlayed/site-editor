import { Eye, FileCode, PenLine, Save } from 'lucide-react';
import type { Entry } from '../sidebar/ContentSidebar';

export interface EditorToolbarProps {
  selected: Entry;
  dirty: boolean;
  busy: boolean;
  mode: 'edit' | 'preview';
  sourceMode: boolean;
  hasSchemaIssues: boolean;
  onSetMode: (mode: 'edit' | 'preview') => void;
  onToggleSourceMode: () => void;
  onSave: () => void;
}

export function EditorToolbar({
  selected,
  dirty,
  busy,
  mode,
  sourceMode,
  hasSchemaIssues,
  onSetMode,
  onToggleSourceMode,
  onSave,
}: EditorToolbarProps) {
  return (
    <div className="docbar">
      <div className="crumb">
        <span>{selected.kind}</span>
        <span className="slash">/</span>
        <span>{selected.path.split('/').at(-1)}</span>
        {dirty && <span className="unsaved-dot" title="Unsaved changes" />}
      </div>
      <div className="doc-actions">
        <div className="segmented">
          <button className={mode === 'edit' ? 'active' : ''} onClick={() => onSetMode('edit')}>
            <PenLine size={13} /> Edit
          </button>
          <button className={mode === 'preview' ? 'active' : ''} onClick={() => onSetMode('preview')}>
            <Eye size={13} /> Preview
          </button>
        </div>
        <button
          className={`icon-btn ${sourceMode ? 'active' : ''}`}
          title={sourceMode ? 'Switch to rich editor' : 'Switch to raw YAML source (Ctrl+Shift+P)'}
          onClick={onToggleSourceMode}
        >
          <FileCode size={15} />
        </button>
        <button
          className="button button-primary button-sm"
          onClick={onSave}
          disabled={!dirty || busy || hasSchemaIssues}
        >
          <Save size={14} /> Save
        </button>
      </div>
    </div>
  );
}
