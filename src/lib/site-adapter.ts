import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export type CollectionKind = 'writing' | 'projects';
export type SiteMetadata = Record<string, unknown> & {
  title?: string;
  description?: string;
  date?: string | Date;
  tags?: string[];
  category?: string;
  draft?: boolean;
  sample?: boolean;
  featured?: boolean;
  status?: string;
  art?: string;
  visual?: string;
  visualAccent?: string;
  visualImage?: string;
  visualImageAlt?: string;
  visualLabel?: string;
  visualAnimate?: boolean;
};

export type SiteDocument = {
  metadata: SiteMetadata;
  body: string;
  source: string;
  hasFrontmatter: boolean;
};

export const PROJECT_ART = ['wing', 'orbit', 'code'] as const;
export const PROJECT_VISUALS = ['dither', 'grain', 'mesh', 'grid', 'dots', 'asset', 'screenshot'] as const;
export const PROJECT_STATUSES = ['Concept', 'In Development', 'Prototype', 'Completed'] as const;
export const SITE_ACCENT_PRESETS = [
  { label: 'Orange (Site Default)', value: '#ff5b36' },
  { label: 'Aerospace Green', value: '#33d17a' },
  { label: 'Systems Blue', value: '#739cda' },
  { label: 'Violet', value: '#b18cff' },
  { label: 'Pink', value: '#ff73b7' },
  { label: 'Cyan', value: '#50c9d9' },
] as const;

export function parseSiteDocument(source: string): SiteDocument {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/);
  if (!match) return { metadata: {}, body: source, source, hasFrontmatter: false };
  const parsed = parseYaml(match[1]);
  if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new Error('Markdown frontmatter must be a YAML mapping.');
  }
  return { metadata: (parsed || {}) as SiteMetadata, body: source.slice(match[0].length), source, hasFrontmatter: true };
}

/** Updates only the body span, leaving the frontmatter bytes and delimiters unchanged. */
export function replaceMarkdownBody(source: string, body: string): string {
  const match = source.match(/^(---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?)/);
  return match ? `${match[1]}${body}` : body;
}

/** Keeps the original source byte-for-byte until metadata is explicitly edited. */
export function serializeSiteDocument(source: string, metadata: SiteMetadata, body: string): string {
  const original = parseSiteDocument(source);
  if (JSON.stringify(original.metadata) === JSON.stringify(metadata)) return source;
  const originalHeader = source.match(/^(---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?)/);
  if (!originalHeader) return `---\n${stringifyYaml(metadata).trimEnd()}\n---\n${body}`;
  const formattedHeader = `---\n${stringifyYaml(metadata).trimEnd()}\n---\n`;
  return `${formattedHeader}${source.slice(originalHeader[1].length)}`;
}

export function validateMetadata(kind: CollectionKind, metadata: SiteMetadata): string[] {
  const errors: string[] = [];
  if (typeof metadata.title !== 'string' || !metadata.title.trim()) errors.push('Title is required.');
  if (typeof metadata.description !== 'string' || !metadata.description.trim()) errors.push('Description is required.');
  const date = metadata.date instanceof Date ? metadata.date.toISOString().slice(0, 10) : metadata.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isRealDate(date)) errors.push('Enter a valid publication date.');
  if (!Array.isArray(metadata.tags) || !metadata.tags.every(tag => typeof tag === 'string')) errors.push('Tags must be a list of strings.');
  if (metadata.category !== undefined && typeof metadata.category !== 'string') errors.push('Category must be a string.');

  if (kind === 'projects') {
    if (typeof metadata.status !== 'string' || !metadata.status.trim()) errors.push('Project status is required.');
    else if (!PROJECT_STATUSES.includes(metadata.status as typeof PROJECT_STATUSES[number])) {
      errors.push(`Project status must be one of: ${PROJECT_STATUSES.join(', ')}.`);
    }
    if (!PROJECT_ART.includes(metadata.art as typeof PROJECT_ART[number])) {
      errors.push(`Project artwork must be one of: ${PROJECT_ART.join(', ')}.`);
    }
    if (metadata.visual !== undefined && !PROJECT_VISUALS.includes(metadata.visual as typeof PROJECT_VISUALS[number])) {
      errors.push(`Project visual must be one of: ${PROJECT_VISUALS.join(', ')}.`);
    }
    if (metadata.visualAccent !== undefined && !/^#[0-9a-fA-F]{6}$/.test(metadata.visualAccent)) {
      errors.push('Visual accent must be a six-digit hex color (#RRGGBB).');
    }
  }
  return errors;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
