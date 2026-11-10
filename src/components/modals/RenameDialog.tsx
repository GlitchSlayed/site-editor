import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { slugify } from '@/lib/site-adapter';
import type { Entry } from '../sidebar/ContentSidebar';

interface RenameDialogProps {
  entry: Entry;
  busy: boolean;
  onClose: () => void;
  onConfirm: (newSlug: string) => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  entry,
  busy,
  onClose,
  onConfirm,
}) => {
  const currentSlug = entry.path.split('/').at(-1)?.replace(/\.[^.]+$/, '') || '';
  const [slug, setSlug] = useState(currentSlug);
  const [acknowledged, setAcknowledged] = useState(entry.draft);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim() && slug !== currentSlug) {
      if (!entry.draft && !acknowledged) return;
      onConfirm(slug.trim());
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="new-document-modal">
        <div className="modal-title">
          <div>
            <span className="eyebrow">FILE OPERATIONS</span>
            <h2>Rename Document Slug</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <p className="modal-copy">
          Changing the slug renames the file on disk and updates its site URL route.
        </p>

        {!entry.draft && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: 12,
              marginBottom: 14,
              alignItems: 'start',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Published Document Warning</strong>
              <p style={{ margin: '3px 0 6px 0', fontSize: 11.5 }}>
                Renaming this published document will change its live URL and break existing links.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: 'var(--foreground)' }}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                />
                I understand this changes the live URL route.
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Current Path</span>
            <input value={entry.path} disabled />
          </label>

          <label className="field">
            <span>New Filename / Slug <small>URL-safe lowercase</small></span>
            <input
              autoFocus
              value={slug}
              onChange={e => setSlug(slugify(e.target.value))}
              placeholder="new-slug-name"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={busy || !slug.trim() || slug === currentSlug || (!entry.draft && !acknowledged)}
            >
              {busy ? 'Renaming…' : 'Rename'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
