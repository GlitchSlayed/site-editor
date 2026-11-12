import React, { useEffect, useRef } from 'react';
import { Check, Hammer } from 'lucide-react';

interface BuildMenuPopoverProps {
  open: boolean;
  busy: boolean;
  onRunCommand: (op: 'check' | 'build') => void;
  onClose: () => void;
}

export const BuildMenuPopover: React.FC<BuildMenuPopoverProps> = ({
  open,
  busy,
  onRunCommand,
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
    function handleCloseAll() {
      onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('purpose:close-all-popovers', handleCloseAll);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('purpose:close-all-popovers', handleCloseAll);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="studio-popover build-menu-popover" ref={popoverRef} role="menu">
      <div className="popover-section-label">PROJECT WORKFLOWS</div>

      <button
        type="button"
        className="popover-item"
        disabled={busy}
        onClick={() => {
          onClose();
          onRunCommand('check');
        }}
      >
        <Check size={14} />
        <span>Run Astro Check</span>
        <kbd className="popover-kbd">astro check</kbd>
      </button>

      <button
        type="button"
        className="popover-item"
        disabled={busy}
        onClick={() => {
          onClose();
          onRunCommand('build');
        }}
      >
        <Hammer size={14} />
        <span>Run Production Build</span>
        <kbd className="popover-kbd">astro build</kbd>
      </button>
    </div>
  );
};
