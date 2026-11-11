import React from 'react';
import { Search, Plus, RotateCw, PanelLeftClose, FileText, Layers, AlertCircle, Copy, Edit2, Trash2 } from 'lucide-react';

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
  node_version: string;
  npm_version: string;
  required_node: string;
  dependencies_installed: boolean;
  node_compatible: boolean;
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
  onCollapse,
  onInstallDependencies,
  onRenameClick,
  onDuplicateClick,
  onDeleteClick,
}) => {
  const filtered = entries.filter(
    e =>
      (type === 'All' || e.kind === type) &&
      (stateFilter === 'All' || (stateFilter === 'Drafts' ? e.draft : !e.draft)) &&
      `${e.title} ${e.path}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="library-heading">
          <div className="sidebar-label">CONTENT LIBRARY</div>
          <div className="library-actions">
            <button
              className="icon-btn library-collapse"
              onClick={onCollapse}
              aria-label="Collapse Content Library"
              title="Collapse Content Library"
            >
              <PanelLeftClose size={15} />
            </button>
            <button
              className="new-content-button"
              onClick={onNewClick}
              disabled={!repository || !native}
              title={repository ? 'Create a post or project' : 'Open a repository first'}
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        <div className="search-box">
          <Search size={15} />
          <input
            placeholder="Search files…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          <kbd>⌘ K</kbd>
        </div>

        <div className="filter-tabs">
          {(['All', 'Writing', 'Projects'] as const).map(t => (
            <button
              key={t}
              className={type === t ? 'selected' : ''}
              onClick={() => onTypeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="filter-select">
          <select
            value={stateFilter}
            onChange={e => onStateFilterChange(e.target.value as typeof stateFilter)}
          >
            <option>All</option>
            <option>Drafts</option>
            <option>Published</option>
          </select>
          <span>{filtered.length} files</span>
        </div>

        {schemaIssues.length > 0 && (
          <div className="environment-card">
            <AlertCircle size={14} />
            <div>
              <p>The site’s content schema differs from this adapter. Saving and publishing are disabled.</p>
              {schemaIssues.map(issue => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          </div>
        )}

        {native && environment && environment.messages.length > 0 && (
          <div className="environment-card">
            <AlertCircle size={14} />
            <div>
              {environment.messages.map(m => (
                <p key={m}>{m}</p>
              ))}
              {!environment.dependencies_installed &&
                environment.node_version &&
                (environment.package_manager_version || environment.npm_version) &&
                environment.node_compatible && (
                  <button onClick={onInstallDependencies} disabled={busy}>
                    Install site dependencies
                  </button>
                )}
            </div>
          </div>
        )}
      </div>

      <div className="entry-list">
        {!repository && native ? (
          <div className="list-empty">
            Open a website repository to see its writing and project files.
          </div>
        ) : (
          filtered.map(item => {
            const isSelected = selected?.path === item.path;
            const filename = item.path.split('/').at(-1) || '';
            return (
              <div
                key={item.path}
                className={`entry-row ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectEntry(item)}
              >
                <div className="entry">
                  <span className="entry-icon">
                    {item.kind === 'Writing' ? <FileText size={15} /> : <Layers size={15} />}
                  </span>
                  <span className="entry-copy">
                    <strong>{item.title}</strong>
                    <small>{filename}</small>
                  </span>
                  {item.draft && <span className="draft-badge">Draft</span>}
                  {isSelected && dirty && <span className="dirty-dot" title="Unsaved changes" />}
                </div>

                <div className="entry-row-actions">
                  <button
                    className="entry-action-btn"
                    title="Rename / slug"
                    onClick={e => {
                      e.stopPropagation();
                      onRenameClick(item);
                    }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className="entry-action-btn"
                    title="Duplicate as draft"
                    onClick={e => {
                      e.stopPropagation();
                      onDuplicateClick(item);
                    }}
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    className="entry-action-btn danger"
                    title="Delete document"
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteClick(item);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-bottom">
        <button className="sidebar-item" onClick={onCollapse}>
          <PanelLeftClose size={15} /> Collapse sidebar
        </button>
        <button className="sidebar-item" onClick={onRefresh} disabled={!repository}>
          <RotateCw size={14} /> Refresh library
        </button>
      </div>
    </aside>
  );
};
