import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'General' | 'Navigation' | 'Formatting' | 'Editorial';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'S'], description: 'Save current document to disk', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'T'], description: 'Toggle Light / Dark mode', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'O'], description: 'Toggle Document Outline drawer', category: 'Navigation' },
  { keys: ['Ctrl', 'Shift', 'P'], description: 'Toggle Full Source YAML / Visual Form mode', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'W'], description: 'Toggle Word Wrap on/off', category: 'General' },
  { keys: ['Ctrl', 'B'], description: 'Format selection as **bold** text', category: 'Formatting' },
  { keys: ['Ctrl', 'I'], description: 'Format selection as *italic* text', category: 'Formatting' },
  { keys: ['Ctrl', 'K'], description: 'Insert markdown link', category: 'Formatting' },
  { keys: ['Ctrl', 'Shift', 'E'], description: 'Fix all forbidden em dashes in document', category: 'Editorial' },
  { keys: ['Middle Click'], description: 'Autoscroll view in any direction on Linux/desktop', category: 'Navigation' },
  { keys: ['?'], description: 'Open this Keyboard Shortcuts cheat sheet', category: 'General' },
  { keys: ['Esc'], description: 'Close any active dialog or drawer', category: 'General' },
];

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({ open, onClose }) => {
  if (!open) return null;

  const categories = ['General', 'Formatting', 'Navigation', 'Editorial'] as const;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="shortcuts-modal" role="dialog" aria-label="Keyboard Shortcuts">
        <div className="modal-title">
          <div className="shortcuts-title-left">
            <Command size={18} className="shortcuts-icon" />
            <div>
              <h2>Keyboard Shortcuts</h2>
              <span className="shortcuts-subtitle">Purpose Monograph Editor</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close shortcuts dialog">
            <X size={16} />
          </button>
        </div>

        <div className="shortcuts-content">
          {categories.map(category => {
            const items = SHORTCUTS.filter(s => s.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="shortcuts-group">
                <div className="shortcuts-group-label">{category}</div>
                <div className="shortcuts-list">
                  {items.map((shortcut, idx) => (
                    <div key={idx} className="shortcut-row">
                      <span className="shortcut-desc">{shortcut.description}</span>
                      <div className="shortcut-keys">
                        {shortcut.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd>{k}</kbd>
                            {kIdx < shortcut.keys.length - 1 && <span className="key-plus">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="shortcuts-footer">
          <span>Press <kbd>Esc</kbd> or click outside to dismiss</span>
        </div>
      </div>
    </div>
  );
};
