import { AlertCircle, Save, Trash2, X } from 'lucide-react';

export interface CloseConfirmDialogProps {
  fileName: string;
  busy?: boolean;
  onSaveAndClose: () => void;
  onDiscardAndClose: () => void;
  onCancel: () => void;
}

export function CloseConfirmDialog({
  fileName,
  busy = false,
  onSaveAndClose,
  onDiscardAndClose,
  onCancel,
}: CloseConfirmDialogProps) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <section className="close-confirm-modal modal-card" style={{ maxWidth: '520px', width: '90%' }}>
        <div className="modal-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} color="#ff5b36" />
            <div>
              <span className="eyebrow" style={{ color: '#ff5b36' }}>UNSAVED EDITS</span>
              <h2>Unsaved Changes</h2>
            </div>
          </div>
          <button className="icon-btn" onClick={onCancel} disabled={busy} aria-label="Cancel">
            <X size={16} />
          </button>
        </div>

        <p className="modal-copy">
          You have unsaved changes in <strong>{fileName}</strong>. If you close now without saving, your edits will be discarded.
        </p>

        <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            type="button"
            className="button button-outline"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-outline"
            onClick={onDiscardAndClose}
            disabled={busy}
            style={{ color: '#ff5b36' }}
          >
            <Trash2 size={14} />
            Discard and Close
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={onSaveAndClose}
            disabled={busy}
          >
            <Save size={14} />
            {busy ? 'Saving…' : 'Save and Close'}
          </button>
        </div>
      </section>
    </div>
  );
}
