import { Plus, X } from 'lucide-react';

export interface NewDocumentDialogProps {
  open: boolean;
  busy: boolean;
  kind: 'writing' | 'projects';
  extension: 'md' | 'mdx';
  title: string;
  slug: string;
  onClose: () => void;
  onKindChange: (kind: 'writing' | 'projects') => void;
  onExtensionChange: (ext: 'md' | 'mdx') => void;
  onTitleChange: (title: string) => void;
  onSlugChange: (slug: string) => void;
  onCreate: () => void;
}

export function NewDocumentDialog({
  open,
  busy,
  kind,
  extension,
  title,
  slug,
  onClose,
  onKindChange,
  onExtensionChange,
  onTitleChange,
  onSlugChange,
  onCreate,
}: NewDocumentDialogProps) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section className="new-document-modal modal-card">
        <div className="modal-title">
          <div>
            <span className="eyebrow">CONTENT LIBRARY</span>
            <h2>Create a document</h2>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className="modal-copy">
          Create a draft Markdown file in the site’s existing content folder. You can complete its details and preview it before publishing.
        </p>
        <label className="field">
          <span>Content type</span>
          <select value={kind} onChange={e => onKindChange(e.target.value as 'writing' | 'projects')}>
            <option value="writing">Writing Post</option>
            <option value="projects">Project</option>
          </select>
        </label>
        <label className="field">
          <span>File format</span>
          <select value={extension} onChange={e => onExtensionChange(e.target.value as 'md' | 'mdx')}>
            <option value="md">Markdown (.md)</option>
            <option value="mdx">Interactive MDX (.mdx)</option>
          </select>
        </label>
        <label className="field">
          <span>Title</span>
          <input
            autoFocus
            value={title}
            onChange={e => {
              onTitleChange(e.target.value);
              onSlugChange(
                e.target.value
                  .toLowerCase()
                  .normalize('NFKD')
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')
              );
            }}
            placeholder={kind === 'writing' ? 'A new technical post' : 'A new engineering project'}
          />
        </label>
        <label className="field">
          <span>Filename <small>without .{extension}</small></span>
          <input value={slug} onChange={e => onSlugChange(e.target.value)} placeholder="lowercase-words" />
        </label>
        <div className="new-document-note">
          <span className="draft-badge">Draft</span> New documents start as drafts. Project drafts start with status Concept and fallback wing artwork.
        </div>
        <div className="modal-actions">
          <button className="button button-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="button button-primary"
            onClick={onCreate}
            disabled={busy || !title.trim() || !slug.trim()}
          >
            <Plus size={14} />
            {busy ? 'Creating…' : 'Create draft'}
          </button>
        </div>
      </section>
    </div>
  );
}
