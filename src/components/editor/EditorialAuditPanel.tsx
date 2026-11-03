import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Wand2, ChevronUp, ChevronDown } from 'lucide-react';
import { EditorialIssue } from '@/lib/editorial-rules';

interface EditorialAuditPanelProps {
  issues: EditorialIssue[];
  wordCount: number;
  onFixEmDashes: () => void;
}

export const EditorialAuditPanel: React.FC<EditorialAuditPanelProps> = ({
  issues,
  wordCount,
  onFixEmDashes,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const emDashCount = issues.filter(i => i.type === 'em-dash').length;
  const buzzwordCount = issues.filter(i => i.type === 'buzzword').length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className={`editorial-audit-bar ${collapsed ? 'collapsed' : ''}`}>
      <div className="audit-bar-summary" onClick={() => setCollapsed(!collapsed)}>
        <div className="audit-summary-left">
          <span className="audit-badge">
            {issues.length === 0 ? (
              <span className="audit-ok"><CheckCircle2 size={13} /> Style clean</span>
            ) : (
              <span className="audit-has-issues">
                <AlertTriangle size={13} /> {issues.length} {issues.length === 1 ? 'guideline note' : 'guideline notes'}
              </span>
            )}
          </span>

          {emDashCount > 0 && (
            <span className="audit-chip error" title="Em dashes forbidden by site style">
              {emDashCount} em dash{emDashCount > 1 ? 'es' : ''}
            </span>
          )}

          {buzzwordCount > 0 && (
            <span className="audit-chip warning" title="Avoid marketing hype">
              {buzzwordCount} buzzword{buzzwordCount > 1 ? 's' : ''}
            </span>
          )}

          <span className="audit-metrics">
            {wordCount} words · ~{readingTimeMinutes} min read
          </span>
        </div>

        <div className="audit-summary-right">
          {emDashCount > 0 && (
            <button
              type="button"
              className="audit-quick-fix-btn"
              onClick={e => {
                e.stopPropagation();
                onFixEmDashes();
              }}
              title="Replace all em dashes and double hyphens with clean hyphens"
            >
              <Wand2 size={12} /> Fix em dashes
            </button>
          )}

          <button
            type="button"
            className="icon-btn-xs"
            aria-label={collapsed ? 'Expand style audit' : 'Collapse style audit'}
          >
            {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && issues.length > 0 && (
        <div className="audit-issues-list">
          {issues.slice(0, 8).map(issue => (
            <div key={issue.id} className={`audit-issue-item ${issue.severity}`}>
              {issue.severity === 'error' ? <AlertCircle size={13} /> : <AlertTriangle size={13} />}
              <span className="issue-msg">
                {issue.line ? <b>L{issue.line}: </b> : null}
                {issue.message}
              </span>
            </div>
          ))}
          {issues.length > 8 && (
            <div className="audit-issue-more">...and {issues.length - 8} more style items.</div>
          )}
        </div>
      )}
    </div>
  );
};
