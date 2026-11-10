import { useState } from 'react';
import { AlertTriangle, RefreshCw, Save, X, Eye } from 'lucide-react';

export interface ConflictDialogProps {
  filePath: string;
  localText: string;
  diskText: string;
  busy?: boolean;
  onClose: () => void;
  onReloadFromDisk: () => void;
  onOverwriteDisk: () => void;
}

export function ConflictDialog({
  filePath,
  localText,
  diskText,
  busy = false,
  onClose,
  onReloadFromDisk,
  onOverwriteDisk,
}: ConflictDialogProps) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section className="conflict-modal modal-card" style={{ maxWidth: '680px', width: '92%' }}>
        <div className="modal-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#ff5b36" />
            <div>
              <span className="eyebrow" style={{ color: '#ff5b36' }}>EXTERNAL MODIFICATION CONFLICT</span>
              <h2>File Changed on Disk</h2>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        <p className="modal-copy">
          <strong>{filePath.split('/').at(-1)}</strong> was modified on disk or by another program since you opened it.
          Saving now would overwrite those external changes.
        </p>

        {showDiff && (
          <div className="diff-details-block" style={{ margin: '16px 0', maxHeight: '260px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Disk Version:</strong>
                <pre style={{ background: 'var(--bg-canvas)', padding: '8px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '200px' }}>
                  {diskText}
                </pre>
              </div>
              <div>
                <strong style={{ color: 'var(--orange-accent)' }}>Your Unsaved Version:</strong>
                <pre style={{ background: 'var(--bg-canvas)', padding: '8px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '200px' }}>
                  {localText}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
          <div>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setShowDiff(s => !s)}
              disabled={busy}
            >
              <Eye size={14} />
              {showDiff ? 'Hide Comparison' : 'Compare Changes'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={onReloadFromDisk}
              disabled={busy}
              style={{ color: '#ff5b36' }}
            >
              <RefreshCw size={14} />
              Reload Disk Version
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={onOverwriteDisk}
              disabled={busy}
            >
              <Save size={14} />
              {busy ? 'Overwriting…' : 'Overwrite Anyway'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
