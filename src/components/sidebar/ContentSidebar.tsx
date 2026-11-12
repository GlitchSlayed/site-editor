import React, { useState } from 'react';
import {
  Search,
  Plus,
  RotateCw,
  FileText,
  Layers,
  AlertCircle,
  MoreVertical,
  X,
} from 'lucide-react';
import { EntryActionMenu } from './EntryActionMenu';

export interface Entry {
  path: string;
  kind: 'Writing' | 'Projects';
  title: string;
  draft: boolean;
  modified: string;
}

export interface Environment {
  package_manager?: string;
  package_manager_version?: string;
  runtime?: string;
  runtime_version?: string;
  required_runtime?: string;
  runtime_compatible?: boolean;
  node_version?: string;
  npm_version?: string;
  required_node?: string;
  dependencies_installed: boolean;
  node_compatible?: boolean;
  messages: string[];
}

interface ContentSidebarProps {
  entries: Entry[];
  selected: Entry | null;
  dirty: boolean;
  search: string;
  type: 'All' | 'Writing' | 'Projects';
  stateFilter: 'All' | 'Drafts' | 'Published';
  repository: string;
  native: boolean;
  busy: boolean;
  schemaIssues: string[];
  environment: Environment | null;
  onSearchChange: (val: string) => void;
  onTypeChange: (val: 'All' | 'Writing' | 'Projects') => void;
  onStateFilterChange: (val: 'All' | 'Drafts' | 'Published') => void;
  onSelectEntry: (item: Entry) => void;
  onNewClick: () => void;
  onRefresh: () => void;
  onCollapse: () => void;
  onInstallDependencies: () => void;
  onRenameClick: (item: Entry) => void;
  onDuplicateClick: (item: Entry) => void;
  onDeleteClick: (item: Entry) => void;
}

export const ContentSidebar: React.FC<ContentSidebarProps> = ({
  entries,
  selected,
  dirty,
  search,
  type,
  stateFilter,
  repository,
  native,
  busy,
  schemaIssues,
  environment,
  onSearchChange,
  onTypeChange,
  onStateFilterChange,
  onSelectEntry,
  onNewClick,
  onRefresh,
  onCollapse: _onCollapse,
  onInstallDependencies,
  onRenameClick,
  onDuplicateClick,
  onDeleteClick,
}) => {
  const [activeMenuEntry, setActiveMenuEntry] = useState<Entry | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);

  const filtered = entries.filter(
    e =>
      (type === 'All' || e.kind === type) &&
      (stateFilter === 'All' || (stateFilter === 'Drafts' ? e.draft : !e.draft)) &&
      `${e.title} ${e.path}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenMenu = (e: React.MouseEvent, entry: Entry) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuAnchorRect(rect);
    setActiveMenuEntry(entry);
  };

  return (
    <aside className="sidebar studio-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-top">
        <div className="library-heading">
          <div className="sidebar-label">CONTENT SHELF</div>
          <div className="library-actions">
            <button
              type="button"
              className="studio-icon-btn refresh-btn"
              onClick={onRefresh}
              disabled={busy || !repository}
              title="Refresh repository files"
              aria-label="Refresh files"
            >
              <RotateCw size={13} className={busy ? 'spin' : ''} />
            </button>
            <button
              type="button"
              className="studio-btn studio-btn-primary studio-btn-sm new-content-button"
              onClick={onNewClick}
              disabled={!repository || !native}
              title={repository ? 'Create a new article or project' : 'Open a repository first'}
            >
              <Plus size={13} />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Search input with clear button */}
        <div className="sidebar-search">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search manuscripts…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className="search-kbd">⌘K</kbd>
          )}
        </div>

        {/* Filter Chip Pills (unified single bar) */}
        <div className="sidebar-filter-chips">
          <button
            type="button"
            className={`filter-chip ${type === 'All' && stateFilter === 'All' ? 'active' : ''}`}
            onClick={() => {
              onTypeChange('All');
              onStateFilterChange('All');
            }}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-chip ${type === 'Writing' ? 'active' : ''}`}
            onClick={() => {
              onTypeChange('Writing');
              if (stateFilter === 'Drafts') onStateFilterChange('All');
            }}
          >
            Writing
          </button>
          <button
            type="button"
            className={`filter-chip ${type === 'Projects' ? 'active' : ''}`}
            onClick={() => {
              onTypeChange('Projects');
              if (stateFilter === 'Drafts') onStateFilterChange('All');
            }}
          >
            Projects
          </button>
          <button
            type="button"
            className={`filter-chip ${stateFilter === 'Drafts' ? 'active' : ''}`}
            onClick={() => {
              onStateFilterChange(stateFilter === 'Drafts' ? 'All' : 'Drafts');
            }}
          >
            Drafts
          </button>
          <span className="filter-count">{filtered.length}</span>
        </div>

        {/* Schema warnings if any */}
        {schemaIssues.length > 0 && (
          <div className="sidebar-alert-card">
            <AlertCircle size={14} className="alert-icon" />
            <div className="alert-body">
              <strong className="alert-title">Schema Warning</strong>
              <p>The site’s content.config schema differs from this adapter.</p>
              {schemaIssues.map(issue => (
                <small key={issue} className="alert-detail">{issue}</small>
              ))}
            </div>
          </div>
        )}

        {/* Environment / Dependencies warning banner */}
        {native && environment && environment.messages.length > 0 && (
          <div className="sidebar-alert-card">
            <AlertCircle size={14} className="alert-icon" />
            <div className="alert-body">
              {environment.messages.map(m => (
                <p key={m}>{m}</p>
              ))}
              {!environment.dependencies_installed &&
                (environment.package_manager_version || environment.runtime_version || environment.npm_version) &&
                (environment.runtime_compatible ?? environment.node_compatible ?? true) && (
                  <button
                    type="button"
                    className="studio-btn studio-btn-outline studio-btn-xs"
                    onClick={onInstallDependencies}
                    disabled={busy}
                  >
                    Install site dependencies
                  </button>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Manuscript List */}
      <div className="entry-list studio-entry-list">
        {!repository && native ? (
          <div className="list-empty">
            Open a website repository to see writing and project manuscripts.
          </div>
        ) : filtered.length === 0 ? (
          <div className="list-empty">
            {search ? 'No manuscripts match your search.' : 'No entries found in this collection.'}
          </div>
        ) : (
          filtered.map(item => {
            const isSelected = selected?.path === item.path;
            const filename = item.path.split('/').at(-1) || '';
            return (
              <div
                key={item.path}
                className={`studio-entry-row ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectEntry(item)}
              >
                <div className="entry-main">
                  <span className="entry-icon">
                    {item.kind === 'Writing' ? <FileText size={14} /> : <Layers size={14} />}
                  </span>
                  <div className="entry-copy">
                    <strong className="entry-title">{item.title}</strong>
                    <span className="entry-filename">{filename}</span>
                  </div>
                  {item.draft && <span className="entry-draft-badge">Draft</span>}
                  {isSelected && dirty && <span className="entry-dirty-dot" title="Unsaved edits" />}
                </div>

                <div className="entry-hover-actions">
                  <button
                    type="button"
                    className="entry-kebab-btn"
                    onClick={e => handleOpenMenu(e, item)}
                    title="Manuscript actions"
                    aria-label="Manuscript actions"
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Contextual Action Popover */}
      {activeMenuEntry && (
        <EntryActionMenu
          entry={activeMenuEntry}
          open={Boolean(activeMenuEntry)}
          anchorRect={menuAnchorRect}
          onRename={() => onRenameClick(activeMenuEntry)}
          onDuplicate={() => onDuplicateClick(activeMenuEntry)}
          onDelete={() => onDeleteClick(activeMenuEntry)}
          onClose={() => {
            setActiveMenuEntry(null);
            setMenuAnchorRect(null);
          }}
        />
      )}
    </aside>
  );
};
