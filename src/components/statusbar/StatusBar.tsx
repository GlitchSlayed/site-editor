import { Play, Square, Check, Hammer } from 'lucide-react';
import type { Entry } from '../sidebar/ContentSidebar';

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
  wordWrap,
  busy,
  native,
  devServerRunning,
  onToggleWordWrap,
  onToggleServer,
  onRunCommand,
}: StatusBarProps) {
  return (
    <footer className="statusbar">
      <div className="status-left">
        <span className="status-dot" />
        {repository ? repository.split('/').filter(Boolean).at(-1) : 'No repository opened'}
        {git && (
          <>
            <span className="status-divider" />
            <span>
              branch <b>{git.branch || 'detached'}</b>
            </span>
            <span className="git-count">
              ↑ {git.ahead} ↓ {git.behind}
            </span>
          </>
        )}
        {selected && (
          <>
            <span className="status-divider" />
            <span title="Word count and estimated reading time">
              {wordsCount} words · ~{readTimeMin} min read
            </span>
            <span className="status-divider" />
            <span title="Cursor position">
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
          </>
        )}
      </div>
      <div className="status-actions">
        <button
          onClick={onToggleWordWrap}
          title="Toggle word wrap (Ctrl+Shift+W)"
          className={wordWrap ? 'status-btn-active' : ''}
        >
          Wrap: {wordWrap ? 'On' : 'Off'}
        </button>
        <button onClick={onToggleServer} disabled={!native || !repository || busy}>
          {devServerRunning ? <Square size={13} /> : <Play size={13} />}{' '}
          {devServerRunning ? 'Stop preview' : 'Astro preview'}
        </button>
        <button onClick={() => onRunCommand('check')} disabled={!native || !repository || busy}>
          <Check size={14} /> Check
        </button>
        <button onClick={() => onRunCommand('build')} disabled={!native || !repository || busy}>
          <Hammer size={14} /> Build
        </button>
      </div>
    </footer>
  );
}
