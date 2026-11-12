import { useState } from 'react';
import { Play, Square, Hammer, ChevronUp, GitBranch } from 'lucide-react';
import type { Entry } from '../sidebar/ContentSidebar';
import { BuildMenuPopover } from './BuildMenuPopover';

export interface StatusBarGitInfo {
  branch: string;
  ahead: number;
  behind: number;
}

export interface StatusBarProps {
  repository: string;
  git: StatusBarGitInfo | null;
  selected: Entry | null;
  wordsCount: number;
  readTimeMin: number;
  cursorPos: { line: number; col: number };
  wordWrap: boolean;
  busy: boolean;
  native: boolean;
  devServerRunning: boolean;
  onToggleWordWrap: () => void;
  onToggleServer: () => void;
  onRunCommand: (op: 'check' | 'build') => void;
}

export function StatusBar({
  repository,
  git,
  selected,
  wordsCount,
  readTimeMin,
  cursorPos,
  wordWrap: _wordWrap,
  busy,
  native,
  devServerRunning,
  onToggleWordWrap: _onToggleWordWrap,
  onToggleServer,
  onRunCommand,
}: StatusBarProps) {
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);

  return (
    <footer className="statusbar studio-statusbar">
      {/* LEFT: Editorial Metrics */}
      <div className="status-left">
        {selected ? (
          <>
            <span className="status-coord">
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
            <span className="status-dot-sep">·</span>
            <span className="status-metric" title="Total word count">
              {wordsCount.toLocaleString()} words
            </span>
            <span className="status-dot-sep">·</span>
            <span className="status-metric" title="Estimated reading time">
              ~{readTimeMin} min read
            </span>
          </>
        ) : (
          <span className="status-idle-text">
            {repository ? repository.split('/').filter(Boolean).at(-1) : 'No repository active'}
          </span>
        )}
      </div>

      {/* CENTER: Version Control State */}
      <div className="status-center">
        {git ? (
          <div className="status-git-badge" title={`Branch: ${git.branch}`}>
            <GitBranch size={12} className="git-branch-icon" />
            <span className="git-branch-name">{git.branch || 'detached'}</span>
            <span className="git-sync-arrows" title="Commits ahead / behind upstream">
              ↑{git.ahead} ↓{git.behind}
            </span>
          </div>
        ) : null}
      </div>

      {/* RIGHT: Astro Dev Server Pill & Project Workflows */}
      <div className="status-right">
        {/* Astro Runner Pill */}
        <button
          type="button"
          className={`astro-runner-pill ${devServerRunning ? 'running' : 'offline'}`}
          onClick={onToggleServer}
          disabled={!native || !repository || busy}
          title={
            devServerRunning
              ? 'Astro dev server is running on http://127.0.0.1:4321. Click to stop.'
              : 'Start local Astro dev server'
          }
        >
          {devServerRunning ? (
            <>
              <span className="astro-pulse-dot" />
              <span className="astro-pill-text">Astro :4321</span>
              <Square size={10} className="astro-stop-icon" />
            </>
          ) : (
            <>
              <Play size={10} className="astro-play-icon" />
              <span className="astro-pill-text">Astro Dev</span>
            </>
          )}
        </button>

        {/* Project Workflows Menu */}
        <div className="status-workflows-container">
          <button
            type="button"
            className={`status-workflows-btn ${buildMenuOpen ? 'active' : ''}`}
            onClick={() => {
              if (!buildMenuOpen) {
                window.dispatchEvent(new CustomEvent('purpose:close-all-popovers'));
              }
              setBuildMenuOpen(o => !o);
            }}
            disabled={!repository || busy}
            title="Run Astro Check or Build"
          >
            <Hammer size={12} />
            <span>Workflows</span>
            <ChevronUp size={10} className="workflows-chevron" />
          </button>

          <BuildMenuPopover
            open={buildMenuOpen}
            busy={busy}
            onRunCommand={onRunCommand}
            onClose={() => setBuildMenuOpen(false)}
          />
        </div>
      </div>
    </footer>
  );
}
