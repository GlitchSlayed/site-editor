import React from 'react';
import { Rocket, ChevronDown, FolderOpen, PanelLeftOpen, Palette, ExternalLink, Send } from 'lucide-react';
import { Button as ShadButton } from '@/components/ui/button';

interface AppHeaderProps {
  repository: string;
  recent: string[];
  sidebar: boolean;
  dirty: boolean;
  selectedTitle?: string;
  appAccent: string;
  busy: boolean;
  schemaIssuesCount: number;
  native: boolean;
  liveSiteUrl: string;
  onSelectRecent: (path: string) => void;
  onChooseRepository: () => void;
  onOpenSidebar: () => void;
  onOpenAppearance: () => void;
  onOpenPublish: () => void;
  onNotice: (msg: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  repository,
  recent,
  sidebar,
  dirty,
  selectedTitle,
  appAccent: _appAccent,
  busy,
  schemaIssuesCount,
  native,
  liveSiteUrl,
  onSelectRecent,
  onChooseRepository,
  onOpenSidebar,
  onOpenAppearance,
  onOpenPublish,
  onNotice: _onNotice,
}) => {
  const repoName = repository.split('/').filter(Boolean).at(-1) || '';

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <Rocket size={19} />
        </div>
        <div>
          <strong>Blog Editor</strong>
          <span>Vansh’s Technical Blog</span>
        </div>
      </div>

      <div className="repo-switcher">
        {repository ? (
          <>
            <span className="repo-indicator" />
            <span className="repo-name" title={repository}>{repoName}</span>
            <select
              className="recent-select"
              aria-label="Recent repositories"
              value=""
              onChange={e => e.target.value && onSelectRecent(e.target.value)}
            >
              <option value="">Recent</option>
              {recent.map(path => (
                <option key={path} value={path}>
                  {path.split('/').filter(Boolean).at(-1)}
                </option>
              ))}
            </select>
            <button className="icon-btn" onClick={onChooseRepository} title="Open another repository">
              <ChevronDown size={15} />
            </button>
          </>
        ) : (
          <ShadButton variant="outline" size="sm" onClick={onChooseRepository}>
            <FolderOpen size={14} /> Open repository
          </ShadButton>
        )}
      </div>

      <div className="top-actions">
        {!sidebar && (
          <button
            className="icon-btn topbar-sidebar-toggle"
            onClick={onOpenSidebar}
            aria-label="Expand Content Library"
            title="Expand Content Library"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        <span className="save-state">
          {dirty ? (
            <>
              <span className="unsaved-dot" /> Unsaved changes
            </>
          ) : selectedTitle ? (
            'All changes saved'
          ) : (
            ''
          )}
        </span>
        <button
          className="button button-outline button-sm appearance-trigger"
          onClick={onOpenAppearance}
          aria-label="Customize app accent color"
          title="Customize app accent color"
        >
          <Palette size={14} />
          <span>Accent</span>
        </button>
        <button
          className="button button-outline button-sm live-site-button"
          onClick={() => window.open(liveSiteUrl, '_blank')}
          title="Open live site in your default browser"
        >
          <ExternalLink size={14} /> Live site
        </button>
        <button
          className="button button-primary button-sm"
          onClick={onOpenPublish}
          disabled={!native || !repository || busy || schemaIssuesCount > 0}
        >
          <Send size={14} /> Publish
        </button>
      </div>
    </header>
  );
};
