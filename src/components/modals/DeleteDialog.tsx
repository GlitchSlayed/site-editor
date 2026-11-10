import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import type { Entry } from '../sidebar/ContentSidebar';

interface DeleteDialogProps {
  entry: Entry;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  entry,
  busy,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="new-document-modal">
        <div className="modal-title">
          <div>
            <span className="eyebrow">FILE OPERATIONS</span>
            <h2>Delete Document</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <p className="modal-copy">
          Are you sure you want to delete <strong>{entry.title}</strong>? This document will be moved to your system trash.
        </p>

        <div className="delete-warning-box">
          <AlertCircle size={15} />
          <div>
            <p><strong>Path:</strong> <code>{entry.path}</code></p>
            {!entry.draft && (
              <p className="danger-text">
                Warning: This document is currently marked as published!
              </p>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="button button-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            <Trash2 size={14} /> {busy ? 'Moving…' : 'Move to trash'}
          </button>
        </div>
      </section>
    </div>
  );
};
