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
            <strong>Interactive MDX Article</strong>
            <p>
              Markdown and math equations ($/$$) render below. Interactive React visualization islands
              (uPlot, Parameter Sliders, Three.js) run inside the live Astro preview server.
            </p>
          </div>
        )}

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
