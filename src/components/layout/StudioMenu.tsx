import React, { useEffect, useRef } from 'react';
import {
  ListTree,
  FileCode,
  Sun,
  Moon,
  Palette,
  Command,
  WrapText,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface StudioMenuProps {
  open: boolean;
  theme: 'light' | 'dark';
  sourceMode: boolean;
  outlineOpen: boolean;
  wordWrap: boolean;
  liveSiteUrl: string;
  onClose: () => void;
  onToggleTheme: () => void;
  onToggleSourceMode: () => void;
  onToggleOutline: () => void;
  onToggleWordWrap: () => void;
  onOpenAppearance: () => void;
  onOpenShortcuts: () => void;
  onFixEmDashes?: () => void;
}

export const StudioMenu: React.FC<StudioMenuProps> = ({
  open,
  theme,
  sourceMode,
  outlineOpen,
  wordWrap,
  liveSiteUrl,
  onClose,
  onToggleTheme,
  onToggleSourceMode,
  onToggleOutline,
  onToggleWordWrap,
  onOpenAppearance,
  onOpenShortcuts,
  onFixEmDashes,
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
    <div className="studio-popover studio-menu-popover" ref={menuRef} role="menu">
      <div className="popover-section-label">STUDIO CONTROLS</div>

      <button
        type="button"
        className={`popover-item ${outlineOpen ? 'active' : ''}`}
        onClick={() => {
          onToggleOutline();
          onClose();
        }}
      >
        <ListTree size={15} />
        <span>Document Outline</span>
        <kbd className="popover-kbd">Ctrl+Shift+O</kbd>
      </button>

      <button
        type="button"
        className={`popover-item ${sourceMode ? 'active' : ''}`}
        onClick={() => {
          onToggleSourceMode();
          onClose();
        }}
      >
        <FileCode size={15} />
        <span>{sourceMode ? 'Rich Editor Mode' : 'Raw YAML Source'}</span>
        <kbd className="popover-kbd">Ctrl+Shift+P</kbd>
      </button>

      <button
        type="button"
        className={`popover-item ${wordWrap ? 'active' : ''}`}
        onClick={() => {
          onToggleWordWrap();
          onClose();
        }}
      >
        <WrapText size={15} />
        <span>Word Wrap: {wordWrap ? 'On' : 'Off'}</span>
        <kbd className="popover-kbd">Ctrl+Shift+W</kbd>
      </button>

      {onFixEmDashes && (
        <button
          type="button"
          className="popover-item"
          onClick={() => {
            onFixEmDashes();
            onClose();
          }}
        >
          <Sparkles size={15} />
          <span>Fix Forbidden Em-Dashes</span>
          <kbd className="popover-kbd">Ctrl+Shift+E</kbd>
        </button>
      )}

      <div className="popover-divider" />
      <div className="popover-section-label">PREFERENCES</div>

      <button
        type="button"
        className="popover-item"
        onClick={() => {
          onToggleTheme();
          onClose();
        }}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        <span>Appearance: {theme === 'dark' ? 'Dark Edition' : 'Book Paper (Light)'}</span>
        <kbd className="popover-kbd">Ctrl+Shift+T</kbd>
      </button>

      <button
        type="button"
        className="popover-item"
        onClick={() => {
          onOpenAppearance();
          onClose();
        }}
      >
        <Palette size={15} />
        <span>Accent Palette…</span>
      </button>

      <button
        type="button"
        className="popover-item"
        onClick={() => {
          onOpenShortcuts();
          onClose();
        }}
      >
        <Command size={15} />
        <span>Keyboard Shortcuts</span>
        <kbd className="popover-kbd">?</kbd>
      </button>

      <div className="popover-divider" />

      <a
        href={liveSiteUrl}
        target="_blank"
        rel="noreferrer"
        className="popover-item"
        onClick={() => onClose()}
      >
        <ExternalLink size={15} />
        <span>Visit Live Website</span>
        <ExternalLink size={12} className="popover-ext-icon" />
      </a>
    </div>
  );
};
