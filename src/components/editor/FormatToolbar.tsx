import React, { useState, useEffect, useRef } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Bold,
  Italic,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  ListTodo,
  Link,
  Image,
  Code,
  CodeXml,
  Minus,
  Table,
  Sigma,
  Component,
  ChevronDown,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { MDX_COMPONENTS_CATALOG, MdxComponentSnippet } from '@/lib/mdx-components-catalog';

interface FormatToolbarProps {
  isMdx: boolean;
  onInsertMarkdown: (before: string, after?: string, linePrefix?: string, placeholder?: string) => void;
  onInsertTable: () => void;
  onInsertSnippet: (snippet: string, importStatement?: string) => void;
}

export const FormatToolbar: React.FC<FormatToolbarProps> = ({
  isMdx,
  onInsertMarkdown,
  onInsertTable,
  onInsertSnippet,
}) => {
  const [mdxMenuOpen, setMdxMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!mdxMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMdxMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMdxMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    // Focus search input when menu opens
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
    <div className="format-toolbar" role="toolbar" aria-label="Markdown and MDX formatting">
      <div className="format-group" aria-label="Headings">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('# ', '')}
          title="Heading 1"
          aria-label="Heading 1"
        >
          <Heading1 />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('## ', '')}
          title="Heading 2"
          aria-label="Heading 2"
        >
          <Heading2 />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('### ', '')}
          title="Heading 3"
          aria-label="Heading 3"
        >
          <Heading3 />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('#### ', '')}
          title="Heading 4"
          aria-label="Heading 4"
        >
          <Heading4 />
        </button>
      </div>

      <span className="format-divider" />

      <div className="format-group" aria-label="Text style">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('**', '**')}
          title="Bold"
          aria-label="Bold"
        >
          <Bold />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('*', '*')}
          title="Italic"
          aria-label="Italic"
        >
          <Italic />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('~~', '~~')}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('> ', '', '> ')}
          title="Blockquote"
          aria-label="Blockquote"
        >
          <Quote />
        </button>
      </div>

      <span className="format-divider" />

      <div className="format-group" aria-label="Lists">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('- ', '', '- ')}
          title="Bulleted list"
          aria-label="Bulleted list"
        >
          <List />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('1. ', '', '1. ')}
          title="Numbered list"
          aria-label="Numbered list"
        >
          <ListOrdered />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('- [ ] ', '', '- [ ] ')}
          title="Task list"
          aria-label="Task list"
        >
          <ListTodo />
        </button>
      </div>

      <span className="format-divider" />

      <div className="format-group" aria-label="Insert content">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('[', '](https://example.com)')}
          title="Link"
          aria-label="Link"
        >
          <Link />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('![alt text](', ')')}
          title="Image reference"
          aria-label="Image"
        >
          <Image />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('`', '`')}
          title="Inline code"
          aria-label="Inline code"
        >
          <Code />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('```text\n', '\n```')}
          title="Code block"
          aria-label="Code block"
        >
          <CodeXml />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('$', '$')}
          title="Inline math"
          aria-label="Inline math"
        >
          <Sigma />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('\n$$\n', '\n$$\n')}
          title="Display math equation"
          aria-label="Display math"
        >
          <Sigma size={17} />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsertMarkdown('\n---\n', '', '', '')}
          title="Horizontal rule"
          aria-label="Horizontal rule"
        >
          <Minus />
        </button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={onInsertTable}
          title="Table"
          aria-label="Table"
        >
          <Table />
        </button>
      </div>

      <span className="format-divider" />

      {/* MDX Component Catalog dropdown */}
      <div className="format-group mdx-menu-wrapper" ref={menuRef} aria-label="MDX Interactive Components">
        <button
          type="button"
          className={`mdx-dropdown-trigger ${mdxMenuOpen ? 'active' : ''} ${!isMdx ? 'non-mdx' : ''}`}
          onClick={() => setMdxMenuOpen(prev => !prev)}
          title={isMdx ? 'Insert Interactive MDX Component' : 'MDX components (requires renaming document to .mdx for Astro interactivity)'}
        >
          <Component size={14} className="mdx-trigger-icon" />
          <span className="mdx-trigger-text">MDX Components</span>
          <ChevronDown size={12} className={`mdx-trigger-chevron ${mdxMenuOpen ? 'open' : ''}`} />
        </button>

        {mdxMenuOpen && (
          <div className="mdx-dropdown-menu" role="menu">
            <div className="mdx-dropdown-header">
              <div className="mdx-header-title">
                <Sparkles size={12} className="mdx-header-icon" />
                <span>INTERACTIVE MDX COMPONENTS</span>
              </div>
              <span className="mdx-header-count">{filteredCatalog.length} available</span>
            </div>

            {!isMdx && (
              <div className="mdx-non-mdx-hint">
                <strong>Note:</strong> Active file is <code>.md</code>. Interactive widgets require <code>.mdx</code> in Astro.
              </div>
            )}

            <div className="mdx-dropdown-search">
              <Search size={13} className="mdx-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search components (plot, slider, card, table)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setMdxMenuOpen(false);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="mdx-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="mdx-items-container">
              {filteredCatalog.length === 0 ? (
                <div className="mdx-empty-results">
                  No components match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredCatalog.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="mdx-dropdown-item"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelectSnippet(item)}
                    role="menuitem"
                  >
                    <div className="mdx-item-title">
                      <strong>{item.name}</strong>
                      <span className="mdx-item-badge">{item.category}</span>
                    </div>
                    <div className="mdx-item-desc">{item.description}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
