import { ChevronDown, ExternalLink, Send, X } from 'lucide-react';

export interface PublishGitInfo {
  branch: string;
  upstream: string;
  ahead: number;
  behind: number;
  changed: string[];
}

export interface PublishDialogProps {
  open: boolean;
  busy: boolean;
  git: PublishGitInfo | null;
  commitMessage: string;
  diffText: string;
  diffLoading: boolean;
  onClose: () => void;
  onCommitMessageChange: (msg: string) => void;
  onLoadDiff: () => void;
  onPublish: () => void;
}

export function PublishDialog({
  open,
  busy,
  git,
  commitMessage,
  diffText,
  diffLoading,
  onClose,
  onCommitMessageChange,
  onLoadDiff,
  onPublish,
}: PublishDialogProps) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section className="publish-modal modal-card">
        <div className="modal-title">
          <div>
            <span className="eyebrow">GIT PUBLISH</span>
            <h2>Review and publish</h2>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className="modal-copy">
          Save this document, validate the site, build it, then commit and push the allowed content and public asset changes.
        </p>
        <div className="git-summary">
          <div>
            <span>Branch</span>
            <strong>{git?.branch || '—'}</strong>
          </div>
          <div>
            <span>Remote</span>
            <strong>{git?.upstream || 'No upstream'}</strong>
          </div>
          <div>
            <span>Changed files</span>
            <strong>{git?.changed.length || 0}</strong>
          </div>
          <div>
            <span>Remote state</span>
            <strong>
              {git?.behind ? `${git.behind} behind` : git?.ahead ? `${git.ahead} ahead` : 'Up to date'}
            </strong>
          </div>
        </div>
        {git?.behind ? (
          <div className="validation">Resolve remote changes before publishing.</div>
        ) : null}
        <label className="field">
          <span>Commit message</span>
          <input
            value={commitMessage}
            onChange={e => onCommitMessageChange(e.target.value)}
            placeholder="e.g. Update aerodynamics simulation results"
            disabled={busy}
          />
        </label>
        <details
          className="diff-details"
          onToggle={e => {
            if (e.currentTarget.open && !diffText) onLoadDiff();
          }}
        >
          <summary>
            Review working diff <ChevronDown size={14} />
          </summary>
          <pre>{diffLoading ? 'Loading diff…' : diffText || 'No unstaged text diff.'}</pre>
        </details>
        <div className="modal-actions">
          <button className="button button-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="button button-primary"
            onClick={onPublish}
            disabled={busy || Boolean(git?.behind)}
          >
            <Send size={14} />
            {busy ? 'Publishing…' : 'Run checks and publish'}
          </button>
        </div>
        <p className="deploy-note">
          <ExternalLink size={13} /> A successful push triggers GitHub Pages deployment workflow.
        </p>
      </section>
    </div>
  );
}
