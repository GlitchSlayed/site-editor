import React, { useState } from 'react';
import { slugify } from '@/lib/site-adapter';
import { Entry } from '../sidebar/ContentSidebar';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim() && slug !== currentSlug) {
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
              disabled={busy || !slug.trim() || slug === currentSlug}
            >
              {busy ? 'Renaming…' : 'Rename'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
