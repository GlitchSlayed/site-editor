import React, { useState, useEffect } from 'react';
import {
  Feather,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Save,
  MoreHorizontal,
  PenLine,
  Columns2,
  Eye,
  FolderOpen,
} from 'lucide-react';
import { RepoSelectPopover } from './RepoSelectPopover';
import { StudioMenu } from './StudioMenu';

interface StudioBarProps {
  repository: string;
  recent: string[];
  sidebar: boolean;
  selectedTitle?: string;
  selectedKind?: 'Writing' | 'Projects';
  selectedPath?: string;
  selectedDraft?: boolean;
  dirty: boolean;
  busy: boolean;
  schemaIssuesCount: number;
  native: boolean;
  liveSiteUrl: string;
  theme: 'light' | 'dark';
  mode: 'edit' | 'split' | 'preview';
  sourceMode: boolean;
  outlineOpen: boolean;
  wordWrap: boolean;
  onSetMode: (m: 'edit' | 'split' | 'preview') => void;
  onSave: () => void;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onToggleSourceMode: () => void;
  onToggleOutline: () => void;
  onToggleWordWrap: () => void;
  onOpenShortcuts: () => void;
  onSelectRecent: (path: string) => void;
  onChooseRepository: () => void;
  onOpenAppearance: () => void;
  onOpenPublish: () => void;
  onFixEmDashes?: () => void;
}

export const StudioBar: React.FC<StudioBarProps> = ({
  repository,
  recent,
  sidebar,
  selectedTitle,
  selectedKind,
  selectedPath,
  selectedDraft,
  dirty,
  busy,
  schemaIssuesCount,
  native,
  liveSiteUrl,
  theme,
  mode,
  sourceMode,
  outlineOpen,
  wordWrap,
  onSetMode,
  onSave,
  onToggleSidebar,
  onToggleTheme,
  onToggleSourceMode,
  onToggleOutline,
  onToggleWordWrap,
  onOpenShortcuts,
  onSelectRecent,
  onChooseRepository,
  onOpenAppearance,
  onOpenPublish,
  onFixEmDashes,
}) => {
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [studioMenuOpen, setStudioMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setRepoMenuOpen(false);
      setStudioMenuOpen(false);
    };
    window.addEventListener('purpose:close-all-popovers', handler);
    return () => window.removeEventListener('purpose:close-all-popovers', handler);
  }, []);

  const handleToggleRepoMenu = () => {
    setRepoMenuOpen(o => {
      if (!o) {
        setStudioMenuOpen(false);
        window.dispatchEvent(new CustomEvent('purpose:close-all-popovers'));
      }
      return !o;
    });
  };

  const handleToggleStudioMenu = () => {
    setStudioMenuOpen(o => {
      if (!o) {
        setRepoMenuOpen(false);
        window.dispatchEvent(new CustomEvent('purpose:close-all-popovers'));
      }
      return !o;
    });
  };

  const repoName = repository.split('/').filter(Boolean).at(-1) || 'No Repository';
  const fileName = selectedPath?.split('/').filter(Boolean).at(-1) || '';

  return (
    <header className="studio-bar">
      {/* LEFT: Brand, Repo Switcher & Active Document Breadcrumb */}
      <div className="studio-bar-left">
        <button
          type="button"
          className="studio-icon-btn sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebar ? 'Hide Content Library' : 'Show Content Library'}
          aria-label={sidebar ? 'Hide Content Library' : 'Show Content Library'}
        >
          {sidebar ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <div className="studio-brand" title="Purpose — Archival Technical Monograph Studio">
          <span className="studio-brand-mark">
            <Feather size={15} />
          </span>
          <span className="studio-brand-title">Purpose</span>
        </div>

        <span className="studio-breadcrumb-slash">/</span>

        {/* Repository selector */}
        <div className="studio-repo-container">
          {repository ? (
            <button
              type="button"
              className={`studio-repo-btn ${repoMenuOpen ? 'active' : ''}`}
              onClick={handleToggleRepoMenu}
              title={`Switch repository: ${repository}`}
            >
              <span className="studio-repo-dot" />
              <span className="studio-repo-name">{repoName}</span>
              <ChevronDown size={13} className="studio-repo-chevron" />
            </button>
          ) : (
            <button
              type="button"
              className="studio-btn studio-btn-outline studio-btn-sm"
              onClick={onChooseRepository}
            >
              <FolderOpen size={13} />
              <span>Open Repository</span>
            </button>
          )}

          <RepoSelectPopover
            open={repoMenuOpen}
            currentRepo={repository}
            recentRepos={recent}
            onSelect={onSelectRecent}
            onOpenAnother={onChooseRepository}
            onClose={() => setRepoMenuOpen(false)}
          />
        </div>

        {/* Active file breadcrumb */}
        {selectedPath && (
          <>
            <span className="studio-breadcrumb-slash">/</span>
            <div className="studio-doc-badge" title={selectedPath}>
              <span className="studio-doc-kind">{selectedKind?.toLowerCase()}</span>
              <span className="studio-doc-sep">:</span>
              <span className="studio-doc-name">{fileName || selectedTitle}</span>
              {selectedDraft && <span className="studio-draft-chip">Draft</span>}
            </div>
          </>
        )}
      </div>

      {/* CENTER: View Canvas Mode Segmented Control */}
      <div className="studio-bar-center">
        {selectedPath && (
          <nav className="studio-mode-pill" aria-label="View layout mode">
            <button
              type="button"
              className={`mode-btn ${mode === 'edit' ? 'active' : ''}`}
              onClick={() => onSetMode('edit')}
              title="Edit Mode (Focus writing canvas)"
            >
              <PenLine size={13} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'split' ? 'active' : ''}`}
              onClick={() => onSetMode('split')}
              title="Split Mode (Side-by-side editing and preview)"
            >
              <Columns2 size={13} />
              <span>Split</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'preview' ? 'active' : ''}`}
              onClick={() => onSetMode('preview')}
              title="Preview Mode (Monograph spread approximation)"
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
          </nav>
        )}
      </div>

      {/* RIGHT: Save State, Quick Actions, Studio Menu, Publish Button */}
      <div className="studio-bar-right">
        {selectedPath && (
          <div className="studio-save-indicator" title={dirty ? 'Unsaved edits in buffer' : 'Synchronized with disk'}>
            <span className={`save-status-dot ${dirty ? 'dirty' : 'clean'}`} />
            <span className="save-status-text">
              {dirty ? 'Unsaved' : 'Saved'}
            </span>
          </div>
        )}

        {selectedPath && (
          <button
            type="button"
            className="studio-btn studio-btn-save"
            onClick={onSave}
            disabled={!dirty || busy || schemaIssuesCount > 0}
            title="Save to disk (Ctrl+S)"
          >
            <Save size={13} />
            <span>Save</span>
          </button>
        )}

        {/* Overflow Studio Menu */}
        <div className="studio-menu-container">
          <button
            type="button"
            className={`studio-icon-btn studio-menu-trigger ${studioMenuOpen ? 'active' : ''}`}
            onClick={handleToggleStudioMenu}
            title="Studio Controls & Preferences"
            aria-label="Studio Controls & Preferences"
          >
            <MoreHorizontal size={16} />
          </button>

          <StudioMenu
            open={studioMenuOpen}
            theme={theme}
            sourceMode={sourceMode}
            outlineOpen={outlineOpen}
            wordWrap={wordWrap}
            liveSiteUrl={liveSiteUrl}
            onClose={() => setStudioMenuOpen(false)}
            onToggleTheme={onToggleTheme}
            onToggleSourceMode={onToggleSourceMode}
            onToggleOutline={onToggleOutline}
            onToggleWordWrap={onToggleWordWrap}
            onOpenAppearance={onOpenAppearance}
            onOpenShortcuts={onOpenShortcuts}
            onFixEmDashes={onFixEmDashes}
          />
        </div>

        {/* Primary Publish Action */}
        <button
          type="button"
          className="studio-btn studio-btn-publish"
          onClick={onOpenPublish}
          disabled={!native || !repository || busy || schemaIssuesCount > 0}
          title="Review diff and publish via Git"
        >
          <Send size={13} />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
};
