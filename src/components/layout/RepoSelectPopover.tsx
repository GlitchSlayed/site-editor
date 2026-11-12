import React, { useEffect, useRef } from 'react';
import { FolderGit2, FolderOpen, Check } from 'lucide-react';

interface RepoSelectPopoverProps {
  open: boolean;
  currentRepo: string;
  recentRepos: string[];
  onSelect: (repoPath: string) => void;
  onOpenAnother: () => void;
  onClose: () => void;
}

export const RepoSelectPopover: React.FC<RepoSelectPopoverProps> = ({
  open,
  currentRepo,
  recentRepos,
  onSelect,
  onOpenAnother,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="studio-popover repo-popover" ref={popoverRef} role="menu">
      <div className="popover-section-label">RECENT REPOSITORIES</div>
      <div className="repo-list">
        {recentRepos.length === 0 ? (
          <div className="popover-empty">No recent repositories</div>
        ) : (
          recentRepos.map(path => {
            const isSelected = path === currentRepo;
            const name = path.split('/').filter(Boolean).at(-1) || path;
            return (
              <button
                key={path}
                type="button"
                className={`repo-item ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  onSelect(path);
                  onClose();
                }}
              >
                <FolderGit2 size={14} className="repo-icon" />
                <div className="repo-info">
                  <span className="repo-title">{name}</span>
                  <span className="repo-path" title={path}>{path}</span>
                </div>
                {isSelected && <Check size={14} className="repo-check" />}
              </button>
            );
          })
        )}
      </div>
      <div className="popover-divider" />
      <button
        type="button"
        className="popover-action-btn"
        onClick={() => {
          onClose();
          onOpenAnother();
        }}
      >
        <FolderOpen size={14} />
        <span>Open another repository…</span>
      </button>
    </div>
  );
};
