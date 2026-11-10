import React, { useState, useRef } from 'react';
import { ChevronDown, AlertCircle, Upload, X, Tag } from 'lucide-react';
import {
  type SiteMetadata,
  PROJECT_STATUSES,
  PROJECT_ART,
  PROJECT_DRAWINGS,
  PROJECT_VISUALS,
  SITE_ACCENT_PRESETS,
} from '@/lib/site-adapter';
import { Entry } from '../sidebar/ContentSidebar';

interface MetadataEditorProps {
  selected: Entry;
  metadata: SiteMetadata;
  isOpen: boolean;
  dropTarget: 'content' | 'visual' | null;
  validation: string[];
  allRepoTags?: string[];
  onToggle: () => void;
  onFieldChange: (key: string, value: unknown) => void;
  onChooseImage: (target: 'content' | 'visual') => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({
  selected,
  metadata,
  isOpen,
  dropTarget,
  validation,
  allRepoTags = [],
  onToggle,
  onFieldChange,
  onChooseImage,
}) => {
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const currentTags: string[] = Array.isArray(metadata.tags)
    ? (metadata.tags as string[])
    : typeof metadata.tags === 'string'
    ? (metadata.tags as string).split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const handleAddTag = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed) return;
    if (!currentTags.includes(trimmed)) {
      onFieldChange('tags', [...currentTags, trimmed]);
    }
    setTagInput('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onFieldChange('tags', currentTags.filter(t => t !== tagToRemove));
  };

  const filteredSuggestions = allRepoTags.filter(
    t => t.toLowerCase().includes(tagInput.toLowerCase().trim()) && !currentTags.includes(t)
  );

  const dateValue = (date: unknown) => {
    if (date instanceof Date) return date.toISOString().slice(0, 10);
    if (typeof date === 'string') return date.slice(0, 10);
    return '';
  };

  return (
    <section className={`metadata-card ${isOpen ? 'open' : 'collapsed'}`}>
      <div
        className="section-title metadata-toggle-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Collapse metadata section' : 'Expand metadata section'}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="section-title-left">
          <span className={`collapse-chevron ${isOpen ? 'open' : ''}`}>
            <ChevronDown size={15} />
          </span>
          <div>
            <span className="eyebrow">DOCUMENT DETAILS</span>
            <h2>Metadata</h2>
          </div>
        </div>

        <div className="section-title-right">
          {validation.length > 0 && !isOpen && (
            <span className="metadata-issue-badge" title={validation.join(' · ')}>
              <AlertCircle size={12} /> {validation.length} {validation.length === 1 ? 'issue' : 'issues'}
            </span>
          )}
          {!isOpen && metadata.title && (
            <span className="metadata-collapsed-title" title={String(metadata.title)}>
              {String(metadata.title)}
            </span>
          )}
          <span className="file-kind">{selected.kind === 'Projects' ? 'PROJECT' : 'ARTICLE'}</span>
          <button
            type="button"
            className="collapse-toggle-btn"
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isOpen ? 'Collapse metadata' : 'Expand metadata'}
          >
            {isOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="metadata-body">
          <label className="field">
            <span>Title</span>
            <input
              value={String(metadata.title || '')}
              onChange={e => onFieldChange('title', e.target.value)}
              placeholder="A concise, technical title"
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows={2}
              value={String(metadata.description || '')}
              onChange={e => onFieldChange('description', e.target.value)}
              placeholder="A short summary shown in previews and search listings"
            />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Publication date</span>
              <input
                type="date"
                value={dateValue(metadata.date)}
                onChange={e => onFieldChange('date', e.target.value)}
              />
            </label>

            <label className="field">
              <span>Category <small>e.g. Operating Systems, Aerospace</small></span>
              <input
                value={String(metadata.category || '')}
                onChange={e => onFieldChange('category', e.target.value || undefined)}
                placeholder="Optional eyebrow category"
              />
            </label>
          </div>

          <div className="field">
            <span>Tags <small>press Enter or comma to add</small></span>
            <div className="tag-chips-wrapper" onClick={() => tagInputRef.current?.focus()}>
              {currentTags.map(tag => (
                <span key={tag} className="tag-chip">
                  <Tag size={10} className="tag-chip-icon" />
                  <span className="tag-chip-label">{tag}</span>
                  <button
                    type="button"
                    className="tag-chip-remove"
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                className="tag-chips-input"
                value={tagInput}
                onChange={e => {
                  setTagInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && currentTags.length > 0) {
                    handleRemoveTag(currentTags[currentTags.length - 1]);
                  }
                }}
                placeholder={currentTags.length === 0 ? "Add tags (e.g. Aerodynamics, Linux)..." : "Add tag..."}
              />
            </div>
            {showSuggestions && tagInput.trim() && filteredSuggestions.length > 0 && (
              <div className="tag-autocomplete-dropdown">
                {filteredSuggestions.slice(0, 8).map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    className="tag-autocomplete-item"
                    onMouseDown={e => {
                      e.preventDefault();
                      handleAddTag(suggestion);
                    }}
                  >
                    <Tag size={10} />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected.kind === 'Projects' && (
            <>
              <div className="field-grid">
                <label className="field">
                  <span>Project Status</span>
                  <select
                    value={String(metadata.status || '')}
                    onChange={e => onFieldChange('status', e.target.value)}
                  >
                    <option value="">Select status</option>
                    {PROJECT_STATUSES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Fallback Artwork</span>
                  <select
                    value={String(metadata.art || '')}
                    onChange={e => onFieldChange('art', e.target.value)}
                  >
                    <option value="">Choose artwork</option>
                    {PROJECT_ART.map(v => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Drawing Blueprint</span>
                  <select
                    value={String(metadata.drawing || '')}
                    onChange={e => onFieldChange('drawing', e.target.value || undefined)}
                  >
                    <option value="">None / Default</option>
                    {PROJECT_DRAWINGS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="engineering-section" style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '10px 12px', marginTop: 10, background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 650, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Engineering Specification
                  </span>
                  <button
                    type="button"
                    className="button button-outline button-sm"
                    style={{ height: 22, padding: '0 8px', fontSize: 10 }}
                    onClick={() => {
                      if (metadata.engineering) {
                        onFieldChange('engineering', undefined);
                      } else {
                        onFieldChange('engineering', {
                          question: '',
                          approach: '',
                          constraint: '',
                          evidence: '',
                          nextCheck: '',
                          methods: [],
                        });
                      }
                    }}
                  >
                    {metadata.engineering ? 'Remove Engineering Spec' : '+ Add Engineering Spec'}
                  </button>
                </div>

                {Boolean(metadata.engineering) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="field">
                      <span>Engineering Question</span>
                      <input
                        value={String(metadata.engineering?.question || '')}
                        onChange={e => onFieldChange('engineering', { ...(metadata.engineering || {}), question: e.target.value })}
                        placeholder="Core hypothesis or feasibility question..."
                      />
                    </label>
                    <label className="field">
                      <span>Approach</span>
                      <input
                        value={String(metadata.engineering?.approach || '')}
                        onChange={e => onFieldChange('engineering', { ...(metadata.engineering || {}), approach: e.target.value })}
                        placeholder="Methodology and design choices..."
                      />
                    </label>
                    <label className="field">
                      <span>Key Constraint</span>
                      <input
                        value={String(metadata.engineering?.constraint || '')}
                        onChange={e => onFieldChange('engineering', { ...(metadata.engineering || {}), constraint: e.target.value })}
                        placeholder="Primary physical/architectural constraints..."
                      />
                    </label>
                    <label className="field">
                      <span>Evidence</span>
                      <input
                        value={String(metadata.engineering?.evidence || '')}
                        onChange={e => onFieldChange('engineering', { ...(metadata.engineering || {}), evidence: e.target.value })}
                        placeholder="Empirical data, test results, benchmarks..."
                      />
                    </label>
                    <label className="field">
                      <span>Next Check</span>
                      <input
                        value={String(metadata.engineering?.nextCheck || '')}
                        onChange={e => onFieldChange('engineering', { ...(metadata.engineering || {}), nextCheck: e.target.value })}
                        placeholder="Upcoming milestone or verification test..."
                      />
                    </label>
                    <label className="field">
                      <span>Methods (comma-separated)</span>
                      <input
                        value={Array.isArray(metadata.engineering?.methods) ? metadata.engineering.methods.join(', ') : ''}
                        onChange={e =>
                          onFieldChange('engineering', {
                            ...(metadata.engineering || {}),
                            methods: e.target.value
                              .split(',')
                              .map(m => m.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="e.g. OpenVSP, dracut, QEMU UEFI"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Visual style</span>
                  <select
                    value={String(metadata.visual || '')}
                    onChange={e => onFieldChange('visual', e.target.value || undefined)}
                  >
                    <option value="">Site default</option>
                    {PROJECT_VISUALS.map(v => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Visual accent</span>
                  <div className="color-input">
                    <input
                      type="color"
                      value={
                        /^#[0-9a-f]{6}$/i.test(String(metadata.visualAccent || ''))
                          ? String(metadata.visualAccent)
                          : '#ff5b36'
                      }
                      onChange={e => onFieldChange('visualAccent', e.target.value)}
                    />
                    <input
                      value={String(metadata.visualAccent || '')}
                      onChange={e => onFieldChange('visualAccent', e.target.value)}
                      placeholder="#ff5b36"
                    />
                  </div>
                  <div className="accent-palette-mini">
                    {SITE_ACCENT_PRESETS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        className="palette-swatch-mini"
                        style={{ backgroundColor: p.value }}
                        title={p.label}
                        onClick={() => onFieldChange('visualAccent', p.value)}
                      />
                    ))}
                  </div>
                </label>
              </div>

              <div
                className={`field visual-image-drop ${dropTarget === 'visual' ? 'image-drop-active' : ''}`}
                data-image-drop="visual"
              >
                <label htmlFor="visual-image-path">Visual image path</label>
                <div className="field-with-action">
                  <input
                    id="visual-image-path"
                    value={String(metadata.visualImage || '')}
                    onChange={e => onFieldChange('visualImage', e.target.value)}
                    placeholder="images/projects/..."
                  />
                  <button
                    type="button"
                    className="tool-button"
                    onClick={() => onChooseImage('visual')}
                    title="Choose a project visual image"
                  >
                    <Upload size={14} /> Upload
                  </button>
                </div>
                {dropTarget === 'visual' && (
                  <small>Drop to use this as the project visual image</small>
                )}
              </div>

              {['visualImageAlt', 'visualLabel'].map(k => (
                <label className="field" key={k}>
                  <span>
                    {
                      (
                        {
                          visualImageAlt: 'Image alt text',
                          visualLabel: 'Visual badge label (e.g. BWB Study)',
                        } as Record<string, string>
                      )[k]
                    }
                  </span>
                  <input
                    value={String(metadata[k] || '')}
                    onChange={e => onFieldChange(k, e.target.value)}
                  />
                </label>
              ))}
            </>
          )}

          <div className="toggle-row">
            {(['draft', 'sample', 'featured', 'visualAnimate'] as const)
              .filter(k => k !== 'visualAnimate' || selected.kind === 'Projects')
              .map(key => (
                <label className="check-field" key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(metadata[key])}
                    onChange={e => onFieldChange(key, e.target.checked)}
                  />
                  <span>
                    {key === 'draft'
                      ? 'Draft'
                      : key === 'sample'
                      ? 'Sample notice'
                      : key === 'featured'
                      ? 'Featured on home'
                      : 'Animate visual shader'}
                  </span>
                </label>
              ))}
          </div>

          {selected.kind === 'Projects' && (
            <p className="hint">
              Draft controls publication, not project maturity. A concept can be published; draft files still need complete metadata.
            </p>
          )}

          {validation.length > 0 && (
            <div className="validation">
              <AlertCircle size={15} />
              <div>
                {validation.map(v => (
                  <div key={v}>{v}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
