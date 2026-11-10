import React from 'react';
import { Entry } from '../sidebar/ContentSidebar';
import { SiteMetadata } from '@/lib/site-adapter';

interface ArticlePreviewPaneProps {
  selected: Entry;
  metadata: SiteMetadata;
  renderedHtml: string;
  isMdx: boolean;
  previewWidth: number;
  previewAssets: Record<string, string>;
}

export const ArticlePreviewPane: React.FC<ArticlePreviewPaneProps> = ({
  selected,
  metadata,
  renderedHtml,
  isMdx,
  previewWidth,
  previewAssets,
}) => {
  const visualImg = metadata.visualImage ? String(metadata.visualImage) : '';
  const resolvedVisualSrc = visualImg && previewAssets[visualImg] ? previewAssets[visualImg] : visualImg;

  return (
    <aside className="preview-column" style={{ width: previewWidth }}>
      <div className="preview-head">
        <div>
          <span className="eyebrow">LIVE PREVIEW</span>
          <h3>{String(metadata.title || 'Untitled')}</h3>
        </div>
        <span className="approx">APPROXIMATION</span>
      </div>

      <div className="preview-scroll">
        {selected.kind === 'Projects' && visualImg && resolvedVisualSrc && (
          <img
            className="project-image-preview"
            src={resolvedVisualSrc}
            alt={String(metadata.visualImageAlt || '')}
          />
        )}

        {isMdx && (
          <div className="mdx-notice-banner">
            <div className="mdx-banner-header">
              <span className="mdx-banner-tag">MDX INTERACTIVE MONOGRAPH</span>
            </div>
            <p>
              Markdown, KaTeX mathematical equations ($/$$), and Satteri engineering annotations render below. Interactive React data plots (uPlot, Parameter Sliders, Heatmaps) run inside the live Astro preview.
            </p>
          </div>
        )}

        <header className="monograph-preview-header">
          <div className="monograph-kicker-strip">
            <span className="monograph-category">
              {metadata.category
                ? String(metadata.category).toUpperCase()
                : selected.kind === 'Projects'
                ? 'TECHNICAL PROJECT'
                : 'MONOGRAPH DISPATCH'}
            </span>
            {metadata.date && (
              <span className="monograph-date">
                {new Date(String(metadata.date)).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
          <h1 className="monograph-preview-title">{String(metadata.title || 'Untitled')}</h1>
          {metadata.description && (
            <p className="monograph-preview-abstract">{String(metadata.description)}</p>
          )}
          {Array.isArray(metadata.tags) && metadata.tags.length > 0 && (
            <div className="monograph-preview-tags">
              {(metadata.tags as string[]).map(t => (
                <span key={t} className="preview-tag-pill">
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>

        <article
          className="prose-preview"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>

      <div className="preview-foot">
        Actual Astro preview uses your site’s own components, KaTeX, and CSS.
      </div>
    </aside>
  );
};
