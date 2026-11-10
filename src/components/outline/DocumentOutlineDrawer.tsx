import React from 'react';
import { ListTree, X, ChevronRight } from 'lucide-react';

export interface HeadingItem {
  level: number;
  text: string;
  id: string;
  line: number;
}

interface DocumentOutlineDrawerProps {
  open: boolean;
  headings: HeadingItem[];
  onClose: () => void;
  onSelectHeading: (item: HeadingItem) => void;
}

export const DocumentOutlineDrawer: React.FC<DocumentOutlineDrawerProps> = ({
  open,
  headings,
  onClose,
  onSelectHeading,
}) => {
  if (!open) return null;

  return (
    <aside className="outline-drawer" aria-label="Document Outline">
      <div className="outline-header">
        <div className="outline-title">
          <ListTree size={14} className="outline-icon" />
          <span>DOCUMENT OUTLINE</span>
        </div>
        <button
          className="icon-btn outline-close-btn"
          onClick={onClose}
          aria-label="Close outline"
          title="Close outline (Ctrl+Shift+O)"
        >
          <X size={15} />
        </button>
      </div>

      <div className="outline-content">
        {headings.length === 0 ? (
          <div className="outline-empty">
            <p>No headings detected.</p>
            <small>Add Markdown headings (# H1, ## H2, ### H3) to populate the table of contents.</small>
          </div>
        ) : (
          <nav className="outline-list">
            {headings.map((item, index) => (
              <button
                key={`${item.id}-${index}`}
                className={`outline-item outline-level-${item.level}`}
                onClick={() => onSelectHeading(item)}
                title={`Jump to line ${item.line + 1}: ${item.text}`}
              >
                <span className="outline-level-indicator">
                  <ChevronRight size={11} />
                  <span className="outline-level-tag">H{item.level}</span>
                </span>
                <span className="outline-text">{item.text}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="outline-footer">
        <span>{headings.length} {headings.length === 1 ? 'section' : 'sections'}</span>
        <kbd>Ctrl+Shift+O</kbd>
      </div>
    </aside>
  );
};
