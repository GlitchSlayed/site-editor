import React, { useState } from 'react';
import { slugify } from '@/lib/site-adapter';
import { Entry } from '../sidebar/ContentSidebar';

interface DuplicateDialogProps {
  entry: Entry;
  busy: boolean;
  onClose: () => void;
  onConfirm: (newSlug: string, newTitle: string) => void;
}

export const DuplicateDialog: React.FC<DuplicateDialogProps> = ({
  entry,
  busy,
  onClose,
  onConfirm,
}) => {
  const currentSlug = entry.path.split('/').at(-1)?.replace(/\.[^.]+$/, '') || '';
  const [slug, setSlug] = useState(`${currentSlug}-copy`);
  const [title, setTitle] = useState(`${entry.title} (Copy)`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim() && title.trim()) {
      onConfirm(slug.trim(), title.trim());
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="new-document-modal">
        <div className="modal-title">
          <div>
            <span className="eyebrow">FILE OPERATIONS</span>
            <h2>Duplicate Document</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <p className="modal-copy">
          Creates a new copy as a <b>Draft</b> in the same collection, preserving all metadata and Markdown formatting.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>New Title</span>
            <input
              autoFocus
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                setSlug(slugify(e.target.value));
              }}
              placeholder="Duplicated document title"
            />
          </label>

          <label className="field">
            <span>New Filename / Slug</span>
            <input
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
              disabled={busy || !slug.trim() || !title.trim()}
            >
              {busy ? 'Cloning…' : 'Duplicate as Draft'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
