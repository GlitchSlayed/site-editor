export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/**
 * Transforms percentage changes (e.g. (+15.1%), (-8.4%), (±0.03%)) strictly inside
 * <td> and <th> table cell elements, leaving normal prose text completely untouched.
 */
export function transformTablePercentBadges(html: string): string {
  const replaceInCell = (inner: string): string => {
    return inner
      .replace(/\(\+([0-9.]+%?)\)/g, '<span class="satteri-percent-badge satteri-percent-positive">(+$1)</span>')
      .replace(/\(-([0-9.]+%?)\)/g, '<span class="satteri-percent-badge satteri-percent-negative">(-$1)</span>')
      .replace(/\((?:±|\+-)([0-9.]+%?)\)/g, '<span class="satteri-percent-badge satteri-percent-neutral">(±$1)</span>');
  };

  return html.replace(/(<(?:td|th)\b[^>]*>)([\s\S]*?)(<\/(?:td|th)>)/gi, (_all, open, inner, close) => {
    return `${open}${replaceInCell(inner)}${close}`;
  });
}

/**
 * Pre-processes Markdown before feeding to Marked.
 * Formats math blocks ($$ and $) and MDX custom components into safe HTML preview blocks.
 */
export function preProcessMarkdown(source: string): string {
  let md = source;

  // Strip ESM imports and exports so they don't render as raw paragraphs in the preview
  md = md.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  md = md.replace(/^export\s+[\s\S]*?;?\s*$/gm, '');

  // Display math blocks $$ ... $$
  md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_m, eq: string) => {
    const trimmed = eq.trim();
    return `<div class="mdx-equation-preview"><div class="mdx-equation-math">${escapeHtml(trimmed)}</div></div>`;
  });

  // Inline math $ ... $ (excluding newline or double $)
  md = md.replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, (_m, eq: string) => {
    return `<code class="math-inline">${escapeHtml(eq.trim())}</code>`;
  });

  // EngineeringNote visual cards
  md = md.replace(
    /<EngineeringNote\s+kind="([^"]*)"(?:\s+title="([^"]*)")?>([\s\S]*?)<\/EngineeringNote>/g,
    (_m, kind: string, title: string, content: string) =>
      `<aside class="mdx-note-preview mdx-note-${escapeHtml(kind)}"><div class="mdx-note-kicker">${escapeHtml(kind)}</div>${title ? `<h4>${escapeHtml(title)}</h4>` : ''}<div>${content}</div></aside>`
  );

  // EquationBlock visual cards
  md = md.replace(
    /<EquationBlock[\s\S]*?equation="([^"]*)"[\s\S]*?description="([^"]*)"[\s\S]*?\/>/g,
    (_m, eq: string, desc: string) =>
      `<div class="mdx-equation-preview"><div class="mdx-equation-math">${escapeHtml(eq)}</div><div class="mdx-equation-desc">${escapeHtml(desc)}</div></div>`
  );

  // Measurement visual cards
  md = md.replace(
    /<Measurement[\s\S]*?label="([^"]*)"[\s\S]*?value=\{?([0-9.]+)\}?[\s\S]*?unit="([^"]*)"[\s\S]*?\/>/g,
    (_m, label: string, value: string, unit: string) =>
      `<div class="mdx-measurement-preview"><span class="mdx-measurement-lbl">${escapeHtml(label)}</span><span class="mdx-measurement-val">${escapeHtml(value)} ${escapeHtml(unit)}</span></div>`
  );

  // Other interactive components (FunctionPlot, ParamPlayground, MetricCard, DataTable, etc.)
  md = md.replace(
    /<([A-Z][a-zA-Z0-9]+)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g,
    (match, componentName: string) => {
      if (['EngineeringNote', 'EquationBlock', 'Measurement'].includes(componentName)) {
        return match;
      }
      return `<div class="mdx-component-card"><div class="mdx-card-badge">INTERACTIVE COMPONENT</div><div class="mdx-card-title">&lt;${escapeHtml(componentName)} /&gt;</div></div>`;
    }
  );

  return md;
}
