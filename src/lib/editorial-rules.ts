/**
 * Editorial Style & Compliance Rules for Glitchy's Technical Blog
 * Source of truth: docs/writing-playbook.md & docs/editor-reference.md
 */

export interface EditorialIssue {
  id: string;
  type: 'em-dash' | 'buzzword' | 'mdx-import' | 'format';
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  line?: number;
  match?: string;
  replacement?: string;
}

// Strictly forbidden by writing-playbook.md & editor-reference.md: "The site style specifically avoids em dashes (—). Use parentheticals, colons, or clean separate sentences instead."

// Marketing buzzwords & corporate fluff forbidden by editorial guidelines
const PROHIBITED_BUZZWORDS = [
  { pattern: /\bgame[- ]changer\b/gi, suggestion: 'significant shift / development' },
  { pattern: /\brevolutionize\b/gi, suggestion: 'transform / improve' },
  { pattern: /\brevolutionary\b/gi, suggestion: 'substantial / novel' },
  { pattern: /\bcutting[- ]edge\b/gi, suggestion: 'modern / contemporary' },
  { pattern: /\bparadigm shift\b/gi, suggestion: 'methodological change' },
  { pattern: /\bdisruptive\b/gi, suggestion: 'distinct / alternative' },
  { pattern: /\bgroundbreaking\b/gi, suggestion: 'first-order / foundational' },
  { pattern: /\bseamlessly\b/gi, suggestion: 'directly / cleanly' },
  { pattern: /\bbest[- ]in[- ]class\b/gi, suggestion: 'effective / established' },
  { pattern: /\bstate[- ]of[- ]the[- ]art\b/gi, suggestion: 'current standard' },
];

export function auditEditorialText(text: string, isMdx = false): EditorialIssue[] {
  const issues: EditorialIssue[] = [];
  const lines = text.split('\n');

  // Check 1: Em dashes
  lines.forEach((line, lineIdx) => {
    let match: RegExpExecArray | null;
    const emDashRegex = /—/g;
    while ((match = emDashRegex.exec(line)) !== null) {
      issues.push({
        id: `em-dash-${lineIdx}-${match.index}`,
        type: 'em-dash',
        severity: 'error',
        line: lineIdx + 1,
        match: '—',
        message: 'Em dashes (—) are explicitly forbidden in site style. Use a hyphen or colon instead.',
        replacement: ' - ',
      });
    }

    // Double hyphen used as em dash
    const doubleDashRegex = /(?<=\S)\s*--\s*(?=\S)/g;
    while ((match = doubleDashRegex.exec(line)) !== null) {
      issues.push({
        id: `double-dash-${lineIdx}-${match.index}`,
        type: 'em-dash',
        severity: 'warning',
        line: lineIdx + 1,
        match: match[0],
        message: 'Double-hyphens used as dashes should be written as a clean hyphen or colon.',
        replacement: ' - ',
      });
    }

    // Check 2: Buzzwords
    for (const buzzword of PROHIBITED_BUZZWORDS) {
      buzzword.pattern.lastIndex = 0;
      let bMatch: RegExpExecArray | null;
      while ((bMatch = buzzword.pattern.exec(line)) !== null) {
        issues.push({
          id: `buzzword-${lineIdx}-${bMatch.index}`,
          type: 'buzzword',
          severity: 'warning',
          line: lineIdx + 1,
          match: bMatch[0],
          message: `Avoid corporate fluff "${bMatch[0]}". Consider "${buzzword.suggestion}".`,
        });
      }
    }
  });

  // Check 3: MDX imports
  if (isMdx) {
    const knownMdxComponents = [
      'LinePlot',
      'ScatterPlot',
      'FunctionPlot',
      'HeatmapPlot',
      'ParamSlider',
      'ParamPlayground',
      'MetricCard',
      'MetricGrid',
      'DataTable',
      'NotebookCell',
      'Tooltip',
    ];

    const hasMdxComponent = knownMdxComponents.some(comp => new RegExp(`<${comp}\\b`).test(text));
    const hasMdxImport = /import\s+.*?\s+from\s+['"](@components\/mdx|.*?components\/mdx)['"]/.test(text);

    if (hasMdxComponent && !hasMdxImport) {
      issues.push({
        id: 'mdx-import-missing',
        type: 'mdx-import',
        severity: 'warning',
        message: 'MDX components are used but missing import from "@components/mdx" or "../../components/mdx".',
      });
    }
  }

  return issues;
}

/** Replaces all em dashes (—) with standard hyphens surrounded by spaces. */
export function fixAllEmDashes(text: string): string {
  return text
    .replace(/—/g, ' - ')
    .replace(/\s+-\s+/g, ' - ') // normalize spacing
    .replace(/(?<=\S)\s*--\s*(?=\S)/g, ' - ');
}
