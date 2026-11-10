import { useEffect, useRef } from 'react';
import { Terminal, X, Square } from 'lucide-react';

export interface OutputPanelProps {
  notice?: string;
  output?: string;
  busy?: boolean;
  onClear: () => void;
  onCancelCommand?: () => void;
}

export function OutputPanel({
  notice,
  output,
  busy = false,
  onClear,
  onCancelCommand,
}: OutputPanelProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [output]);

  if (!notice && !output) {
    return null;
  }

  return (
    <div className="notice-panel">
      <div className="notice-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} />
          <strong>{notice || 'Command output'}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {busy && onCancelCommand && (
            <button
              className="button button-outline button-xs"
              onClick={onCancelCommand}
              style={{ color: '#ff5b36', borderColor: '#ff5b36' }}
              title="Cancel running command"
            >
              <Square size={12} /> Cancel
            </button>
          )}
          <button className="icon-btn" onClick={onClear} title="Close output panel" aria-label="Close">
            <X size={14} />
          </button>
        </div>
      </div>
      {output && (
        <pre ref={preRef} style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {output}
        </pre>
      )}
    </div>
  );
}
