import React, { useState, useEffect, useRef } from 'react';
import {
  Heading,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Sigma,
  Plus,
  ChevronDown,
  Search,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { MDX_COMPONENTS_CATALOG, MdxComponentSnippet } from '@/lib/mdx-components-catalog';

interface FormatToolbarProps {
  isMdx: boolean;
  zenMode?: boolean;
  onToggleZenMode?: () => void;
  onInsertMarkdown: (before: string, after?: string, linePrefix?: string, placeholder?: string) => void;
  onInsertTable: () => void;
  onInsertSnippet: (snippet: string, importStatement?: string) => void;
}

export const FormatToolbar: React.FC<FormatToolbarProps> = ({
  isMdx,
  zenMode = false,
  onToggleZenMode,
  onInsertMarkdown,
  onInsertTable,
  onInsertSnippet,
}) => {
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const [structureMenuOpen, setStructureMenuOpen] = useState(false);
  const [mdxMenuOpen, setMdxMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const headingRef = useRef<HTMLDivElement>(null);
  const structureRef = useRef<HTMLDivElement>(null);
  const mdxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click or Escape or global close event
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (headingRef.current && !headingRef.current.contains(target)) {
        setHeadingMenuOpen(false);
      }
      if (structureRef.current && !structureRef.current.contains(target)) {
        setStructureMenuOpen(false);
      }
      if (mdxRef.current && !mdxRef.current.contains(target)) {
        setMdxMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setHeadingMenuOpen(false);
        setStructureMenuOpen(false);
        setMdxMenuOpen(false);
      }
    }
    function handleCloseAll() {
      setHeadingMenuOpen(false);
      setStructureMenuOpen(false);
      setMdxMenuOpen(false);
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
  }, []);

  useEffect(() => {
    if (mdxMenuOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [mdxMenuOpen]);

  const handleSelectSnippet = (snippet: MdxComponentSnippet) => {
    onInsertSnippet(snippet.snippet, snippet.importStatement);
    setMdxMenuOpen(false);
    setSearchQuery('');
  };

  const filteredCatalog = MDX_COMPONENTS_CATALOG.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="format-ribbon" role="toolbar" aria-label="Formatting ribbon">
      {/* 1. Headings & Blocks Dropdown */}
      <div className="ribbon-cluster" ref={headingRef}>
        <button
          type="button"
          className={`ribbon-dropdown-btn ${headingMenuOpen ? 'active' : ''}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => {
            setHeadingMenuOpen(o => !o);
            setStructureMenuOpen(false);
            setMdxMenuOpen(false);
          }}
          title="Headings & Paragraph Style"
        >
          <Heading size={14} />
          <span>Style</span>
          <ChevronDown size={11} className="ribbon-chevron" />
        </button>

        {headingMenuOpen && (
          <div className="ribbon-menu headings-menu" role="menu">
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('# ', '');
                setHeadingMenuOpen(false);
              }}
            >
              <span className="heading-preview h1-preview">Heading 1</span>
              <kbd className="ribbon-kbd">#</kbd>
            </button>
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('## ', '');
                setHeadingMenuOpen(false);
              }}
            >
              <span className="heading-preview h2-preview">Heading 2</span>
              <kbd className="ribbon-kbd">##</kbd>
            </button>
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('### ', '');
                setHeadingMenuOpen(false);
              }}
            >
              <span className="heading-preview h3-preview">Heading 3</span>
              <kbd className="ribbon-kbd">###</kbd>
            </button>
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('#### ', '');
                setHeadingMenuOpen(false);
              }}
            >
              <span className="heading-preview h4-preview">Heading 4</span>
              <kbd className="ribbon-kbd">####</kbd>
            </button>
            <div className="ribbon-menu-divider" />
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('> ', '');
                setHeadingMenuOpen(false);
              }}
            >
              <Quote size={13} />
              <span>Blockquote</span>
              <kbd className="ribbon-kbd">&gt;</kbd>
            </button>
          </div>
        )}
      </div>

      <div className="ribbon-divider" />

      {/* 2. Inline Text Styles */}
      <div className="ribbon-cluster inline-styles">
        <button
          type="button"
          className="ribbon-icon-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('**', '**', undefined, 'bold text')}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          className="ribbon-icon-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('*', '*', undefined, 'italic text')}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic size={13} />
        </button>
        <button
          type="button"
          className="ribbon-icon-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('~~', '~~', undefined, 'strikethrough text')}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={13} />
        </button>
        <button
          type="button"
          className="ribbon-icon-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('`', '`', undefined, 'code')}
          title="Inline Code"
          aria-label="Inline Code"
        >
          <Code size={13} />
        </button>
      </div>

      <div className="ribbon-divider" />

      {/* 3. Lists & Structure Dropdown */}
      <div className="ribbon-cluster" ref={structureRef}>
        <button
          type="button"
          className={`ribbon-dropdown-btn ${structureMenuOpen ? 'active' : ''}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => {
            setStructureMenuOpen(o => !o);
            setHeadingMenuOpen(false);
            setMdxMenuOpen(false);
          }}
          title="Lists & Structural Elements"
        >
          <List size={14} />
          <span>List</span>
          <ChevronDown size={11} className="ribbon-chevron" />
        </button>

        {structureMenuOpen && (
          <div className="ribbon-menu structure-menu" role="menu">
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('- ', '', '- ', 'list item');
                setStructureMenuOpen(false);
              }}
            >
              <List size={14} />
              <span>Bullet List</span>
              <kbd className="ribbon-kbd">-</kbd>
            </button>
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('1. ', '', '1. ', 'first item');
                setStructureMenuOpen(false);
              }}
            >
              <ListOrdered size={14} />
              <span>Numbered List</span>
              <kbd className="ribbon-kbd">1.</kbd>
            </button>
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('- [ ] ', '', '- [ ] ', 'task');
                setStructureMenuOpen(false);
              }}
            >
              <ListTodo size={14} />
              <span>Task List</span>
              <kbd className="ribbon-kbd">[ ]</kbd>
            </button>
            <div className="ribbon-menu-divider" />
            <button
              type="button"
              className="ribbon-menu-item"
              onClick={() => {
                onInsertMarkdown('\n---\n\n', '');
                setStructureMenuOpen(false);
              }}
            >
              <Minus size={14} />
              <span>Horizontal Rule</span>
              <kbd className="ribbon-kbd">---</kbd>
            </button>
          </div>
        )}
      </div>

      <div className="ribbon-divider" />

      {/* 4. Media & Insert Primitives */}
      <div className="ribbon-cluster media-styles">
        <button
          type="button"
          className="ribbon-icon-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('[', '](https://example.com)', undefined, 'link title')}
          title="Insert Link (Ctrl+K)"
          aria-label="Insert Link"
        >
          <LinkIcon size={13} />
        </button>
        <button
          type="button"
          className="ribbon-icon-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('![', '](/images/filename.png)', undefined, 'alt text')}
          title="Insert Image"
          aria-label="Insert Image"
        >
          <ImageIcon size={13} />
        </button>
        <button
          type="button"
          className="ribbon-icon-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertTable()}
          title="Insert Markdown Table"
          aria-label="Insert Table"
        >
          <TableIcon size={13} />
        </button>
        <button
          type="button"
          className="ribbon-icon-btn"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('$', '$', undefined, 'E = mc^2')}
          title="Insert KaTeX Math ($...$)"
          aria-label="Insert Math"
        >
          <Sigma size={13} />
        </button>
      </div>

      {/* 5. MDX Component Dropdown */}
      {isMdx && (
        <>
          <div className="ribbon-divider" />
          <div className="ribbon-cluster" ref={mdxRef}>
            <button
              type="button"
              className={`ribbon-insert-mdx-btn ${mdxMenuOpen ? 'active' : ''}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                setMdxMenuOpen(o => !o);
                setHeadingMenuOpen(false);
                setStructureMenuOpen(false);
              }}
              title="Insert Interactive MDX Component"
            >
              <Plus size={13} />
              <span>Insert Component</span>
              <ChevronDown size={11} className="ribbon-chevron" />
            </button>

            {mdxMenuOpen && (
              <div className="ribbon-menu mdx-palette-menu" role="dialog" aria-label="Insert Component Palette">
                <div className="mdx-palette-search">
                  <Search size={14} className="search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search 13 scientific & interactive components…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setMdxMenuOpen(false);
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="mdx-palette-list">
                  {filteredCatalog.length === 0 ? (
                    <div className="mdx-palette-empty">No components matching "{searchQuery}"</div>
                  ) : (
                    filteredCatalog.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className="mdx-palette-item"
                        onClick={() => handleSelectSnippet(item)}
                      >
                        <div className="item-header">
                          <span className="item-name">&lt;{item.name} /&gt;</span>
                          <span className="item-category">{item.category}</span>
                        </div>
                        <p className="item-description">{item.description}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 6. Zen / Focus Mode Toggle */}
      {onToggleZenMode && (
        <div className="ribbon-cluster ribbon-cluster-right">
          <button
            type="button"
            className={`ribbon-icon-btn zen-btn ${zenMode ? 'active' : ''}`}
            onClick={onToggleZenMode}
            title={zenMode ? 'Exit Zen Mode (Show toolbars)' : 'Zen Mode (Distraction-free focus)'}
            aria-label={zenMode ? 'Exit Zen Mode' : 'Enter Zen Mode'}
          >
            {zenMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      )}
    </div>
  );
};
