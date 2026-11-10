import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export type CollectionKind = 'writing' | 'projects';

export type EngineeringMetadata = {
  question?: string;
  approach?: string;
  constraint?: string;
  evidence?: string;
  nextCheck?: string;
  methods?: string[];
};

export type SiteMetadata = Record<string, unknown> & {
  title?: string;
  description?: string;
  date?: string | Date;
  updated?: string | Date;
  tags?: string[];
  category?: string;
  draft?: boolean;
  sample?: boolean;
  featured?: boolean;
  status?: string;
  art?: string;
  drawing?: string;
  engineering?: EngineeringMetadata;
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
export const PROJECT_DRAWINGS = [
  'airfoils',
  'bwb',
  'uki',
  'gofr',
  'rocket',
  'wing',
  'orbit',
  'code',
] as const;
export const PROJECT_VISUALS = ['dither', 'grain', 'mesh', 'grid', 'dots', 'asset', 'screenshot'] as const;
export const PROJECT_STATUSES = ['Concept', 'In Development', 'Prototype', 'Completed', 'Released'] as const;
export const SITE_ACCENT_PRESETS = [
  { label: 'Orange (Site Default)', value: '#ff5b36' },
  { label: 'Aerospace Green', value: '#33d17a' },
  { label: 'Systems Blue', value: '#739cda' },
  { label: 'Violet', value: '#b18cff' },
  { label: 'Pink', value: '#ff73b7' },
  { label: 'Cyan', value: '#50c9d9' },
] as const;

export interface ExtractedSiteSchema {
  projectStatuses: string[];
  projectArt: string[];
  projectDrawings: string[];
  projectVisuals: string[];
  commonFields: string[];
  projectFields: string[];
  engineeringFields: string[];
}

/** Parses and extracts all enum literals and declared schema field names from src/content.config.ts */
export function extractSchemaFromContentConfig(configSource: string): ExtractedSiteSchema {
  if (!configSource || typeof configSource !== 'string' || !configSource.trim()) {
    throw new Error('Failed to parse site schema from src/content.config.ts: file is empty.');
  }

  const extractEnum = (pattern: RegExp, name: string): string[] => {
    const match = configSource.match(pattern);
    if (!match) {
      throw new Error(`Failed to parse site schema from src/content.config.ts: missing ${name} z.enum declaration.`);
    }
    const inner = match[1] ?? match[2] ?? '';
    const items = Array.from(inner.matchAll(/['"]([^'"]+)['"]/g), m => m[1]);
    if (items.length === 0) {
      throw new Error(`Failed to parse site schema from src/content.config.ts: ${name} enum is empty.`);
    }
    return items;
  };

  const projectStatuses = extractEnum(
    /(?:ProjectStatus\s*=\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\)|status\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\))/,
    'ProjectStatus'
  );
  const projectArt = extractEnum(/art\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\)/, 'art');
  const projectDrawings = extractEnum(/drawing\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\)/, 'drawing');
  const projectVisuals = extractEnum(/visual\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\)/, 'visual');

  const commonMatch = configSource.match(/const\s+common\s*=\s*\{([\s\S]*?)\};/);
  if (!commonMatch) {
    throw new Error('Failed to parse site schema from src/content.config.ts: missing common fields declaration.');
  }
  const commonFields = Array.from(commonMatch[1].matchAll(/(\w+)\s*:\s*z\./g), m => m[1]);

  const projectMatch = configSource.match(/projects\s*:\s*defineCollection\(\{[\s\S]*?schema\s*:\s*z\.object\(\{([\s\S]*?)\}\s*\)\s*\}\)/);
  if (!projectMatch) {
    throw new Error('Failed to parse site schema from src/content.config.ts: missing projects collection schema.');
  }
  const projectFields = Array.from(projectMatch[1].matchAll(/(\w+)\s*:\s*(?:z\.|ProjectStatus)/g), m => m[1]);

  const engMatch = configSource.match(/engineering\s*:\s*z\.object\(\{([\s\S]*?)\}\)/);
  const engineeringFields = engMatch ? Array.from(engMatch[1].matchAll(/(\w+)\s*:\s*z\./g), m => m[1]) : [];

  return {
    projectStatuses,
    projectArt,
    projectDrawings,
    projectVisuals,
    commonFields,
    projectFields,
    engineeringFields,
  };
}

/** Validates that an extracted site schema contains all fields and enums required by the editor. */
export function validateExtractedSchema(extracted: ExtractedSiteSchema): string[] {
  const issues: string[] = [];
  const requiredCommon = ['title', 'description', 'date', 'tags', 'draft', 'sample', 'featured'];
  for (const field of requiredCommon) {
    if (!extracted.commonFields.includes(field)) {
      issues.push(`The site schema does not declare expected common field '${field}'.`);
    }
  }

  const requiredProject = ['status', 'art', 'drawing', 'engineering', 'visual', 'visualAccent', 'visualImage', 'visualImageAlt', 'visualLabel', 'visualAnimate'];
  for (const field of requiredProject) {
    if (!extracted.projectFields.includes(field)) {
      issues.push(`The site schema does not declare expected project field '${field}'.`);
    }
  }

  for (const status of PROJECT_STATUSES) {
    if (!extracted.projectStatuses.includes(status)) {
      issues.push(`The site schema does not contain expected project status '${status}'.`);
    }
  }

  for (const art of PROJECT_ART) {
    if (!extracted.projectArt.includes(art)) {
      issues.push(`The site schema does not contain expected project art '${art}'.`);
    }
  }

  for (const visual of PROJECT_VISUALS) {
    if (!extracted.projectVisuals.includes(visual)) {
      issues.push(`The site schema does not contain expected project visual '${visual}'.`);
    }
  }

  for (const drawing of PROJECT_DRAWINGS) {
    if (!extracted.projectDrawings.includes(drawing)) {
      issues.push(`The site schema does not contain expected project drawing '${drawing}'.`);
    }
  }

  return issues;
}

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
  if (metadata.updated !== undefined && metadata.updated !== null && metadata.updated !== '') {
    const updated = metadata.updated instanceof Date ? metadata.updated.toISOString().slice(0, 10) : metadata.updated;
    if (typeof updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updated) || !isRealDate(updated)) {
      errors.push('Enter a valid update date (YYYY-MM-DD).');
    }
  }
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
    if (metadata.drawing !== undefined && metadata.drawing !== null && metadata.drawing !== '') {
      if (!PROJECT_DRAWINGS.includes(metadata.drawing as typeof PROJECT_DRAWINGS[number])) {
        errors.push(`Project drawing must be one of: ${PROJECT_DRAWINGS.join(', ')}.`);
      }
    }
    if (metadata.visual !== undefined && !PROJECT_VISUALS.includes(metadata.visual as typeof PROJECT_VISUALS[number])) {
      errors.push(`Project visual must be one of: ${PROJECT_VISUALS.join(', ')}.`);
    }
    if (metadata.visualAccent !== undefined && !/^#[0-9a-fA-F]{6}$/.test(metadata.visualAccent)) {
      errors.push('Visual accent must be a six-digit hex color (#RRGGBB).');
    }
    if (metadata.engineering !== undefined && metadata.engineering !== null) {
      if (typeof metadata.engineering !== 'object') {
        errors.push('Engineering metadata must be an object.');
      } else {
        const eng = metadata.engineering as Record<string, unknown>;
        if (eng.question !== undefined && typeof eng.question !== 'string') errors.push('Engineering question must be a string.');
        if (eng.approach !== undefined && typeof eng.approach !== 'string') errors.push('Engineering approach must be a string.');
        if (eng.constraint !== undefined && typeof eng.constraint !== 'string') errors.push('Engineering constraint must be a string.');
        if (eng.evidence !== undefined && typeof eng.evidence !== 'string') errors.push('Engineering evidence must be a string.');
        if (eng.nextCheck !== undefined && typeof eng.nextCheck !== 'string') errors.push('Engineering nextCheck must be a string.');
        if (eng.methods !== undefined && (!Array.isArray(eng.methods) || !eng.methods.every(m => typeof m === 'string'))) {
          errors.push('Engineering methods must be a list of strings.');
        }
      }
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
