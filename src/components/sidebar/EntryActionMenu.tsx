import React, { useEffect, useRef } from 'react';
import { Edit2, Copy, Trash2 } from 'lucide-react';
import type { Entry } from './ContentSidebar';

interface EntryActionMenuProps {
  entry: Entry;
  open: boolean;
  anchorRect: DOMRect | null;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const EntryActionMenu: React.FC<EntryActionMenuProps> = ({
  entry,
  open,
  anchorRect,
  onRename,
  onDuplicate,
  onDelete,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

  if (!open || !anchorRect) return null;

  const top = Math.min(window.innerHeight - 140, Math.max(10, anchorRect.bottom + 4));
  const left = Math.min(window.innerWidth - 180, Math.max(10, anchorRect.left - 120));

  return (
    <div
      className="studio-popover entry-context-popover"
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 1000,
      }}
    >
      <div className="popover-section-label" title={entry.path}>
        {entry.title || entry.path.split('/').at(-1)}
      </div>

      <button
        type="button"
        className="popover-item"
        onClick={() => {
          onClose();
          onRename();
        }}
      >
        <Edit2 size={13} />
        <span>Rename Document…</span>
      </button>

      <button
        type="button"
        className="popover-item"
        onClick={() => {
          onClose();
          onDuplicate();
        }}
      >
        <Copy size={13} />
        <span>Duplicate as Draft</span>
      </button>

      <div className="popover-divider" />

      <button
        type="button"
        className="popover-item popover-item-danger"
        onClick={() => {
          onClose();
          onDelete();
        }}
      >
        <Trash2 size={13} />
        <span>Move to Trash</span>
      </button>
    </div>
  );
};
