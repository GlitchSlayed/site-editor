import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseSiteDocument,
  replaceMarkdownBody,
  serializeSiteDocument,
  validateMetadata,
  extractSchemaFromContentConfig,
  validateExtractedSchema,
  PROJECT_STATUSES,
  PROJECT_DRAWINGS,
} from '../src/lib/site-adapter';

const source = `---\r\ntitle: "Flight notes"\r\ndescription: "A test article."\r\ndate: 2026-10-24\r\ntags: [Aerospace, "Open Source"]\r\ndraft: false\r\ncustom: {keep: true}\r\n---\r\n\r\n# Heading\r\n\r\n\tindented code\r\n\n$\\alpha$ and $$\nq = mc^2\n$$\n`;

describe('site adapter preservation', () => {
  it('changes the Markdown body without touching original frontmatter bytes', () => {
    const changed = replaceMarkdownBody(source, '# Changed\n\n```rust\nfn main() {}\n```\n');
    const header = source.match(/^(---\r?\n[\s\S]*?\r?\n---)/)?.[1];
    expect(header).toBeTruthy();
    expect(changed.startsWith(header!)).toBe(true);
    expect(parseSiteDocument(changed).metadata.custom).toEqual({ keep: true });
    expect(parseSiteDocument(changed).body).toContain('```rust');
  });

  it('round-trips untouched Markdown, dates, lists, math, and unknown metadata byte-for-byte', () => {
    const document = parseSiteDocument(source);
    expect(serializeSiteDocument(source, document.metadata, document.body)).toBe(source);
    expect(document.metadata.tags).toEqual(['Aerospace', 'Open Source']);
    expect(document.body).toContain('\tindented code');
    expect(document.body).toContain('$$');
  });

  it('retains unknown metadata when a supported field is edited', () => {
    const metadata = { ...parseSiteDocument(source).metadata, title: 'Updated title' };
    const output = serializeSiteDocument(source, metadata, parseSiteDocument(source).body);
    const result = parseSiteDocument(output);
    expect(result.metadata.title).toBe('Updated title');
    expect(result.metadata.custom).toEqual({ keep: true });
    expect(result.body).toBe(parseSiteDocument(source).body);
  });

  it('validates actual project schema fields and calendar dates', () => {
    const valid = { title: 'Study', description: 'Summary', date: '2026-10-24', tags: ['Aerospace'], status: 'Concept', art: 'orbit', visual: 'mesh', visualAccent: '#Aa12f0' };
    expect(validateMetadata('projects', valid)).toEqual([]);
    expect(validateMetadata('projects', { ...valid, date: '2026-02-31', art: 'unsupported' })).toContain('Enter a valid publication date.');
    expect(validateMetadata('projects', { ...valid, art: 'unsupported' }).some(e => e.includes('Project artwork'))).toBe(true);
    expect(validateMetadata('projects', { ...valid, status: 'Pre-release / In development' }).some(e => e.includes('Project status'))).toBe(true);
    expect(validateMetadata('projects', { ...valid, status: '' }).some(e => e.includes('Project status'))).toBe(true);
  });

  it('supports "Released" status and drawing/engineering metadata fields', () => {
    expect(PROJECT_STATUSES).toContain('Released');
    expect(PROJECT_DRAWINGS).toContain('uki');
    const projectWithReleased = {
      title: 'RustyUKI',
      description: 'UKI manager',
      date: '2026-11-05',
      tags: ['Linux', 'Rust'],
      status: 'Released',
      art: 'code',
      drawing: 'uki',
      engineering: {
        question: 'Can maintaining a direct UKI boot path be manageable?',
        approach: 'Decouple generation and staging',
        constraint: 'UEFI firmware only',
        evidence: 'CI validation and RPM packages',
        nextCheck: 'Measure firmware handover duration',
        methods: ['Rust CLI', 'dracut'],
      },
    };
    expect(validateMetadata('projects', projectWithReleased)).toEqual([]);
  });

  it('extracts schema from real content.config.ts fixture without errors', () => {
    const fixturePath = path.resolve(__dirname, 'fixtures/content.config.ts');
    const source = fs.readFileSync(fixturePath, 'utf8');
    const extracted = extractSchemaFromContentConfig(source);
    expect(extracted.projectStatuses).toContain('Released');
    expect(extracted.projectDrawings).toContain('airfoils');
    expect(extracted.projectArt).toContain('wing');
    expect(extracted.projectVisuals).toContain('dither');
    expect(extracted.commonFields).toContain('title');
    expect(extracted.projectFields).toContain('engineering');

    const issues = validateExtractedSchema(extracted);
    expect(issues).toEqual([]);
  });

  it('fails loudly when schema source is invalid or missing required structures', () => {
    expect(() => extractSchemaFromContentConfig('')).toThrow(/empty/);
    expect(() => extractSchemaFromContentConfig('const notAConfig = true;')).toThrow(/missing/);
  });

  it('validates every document in the fixtures directory cleanly', () => {
    const docsDir = path.resolve(__dirname, 'fixtures/documents');
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
    expect(files.length).toBeGreaterThan(5);

    for (const file of files) {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
      const doc = parseSiteDocument(content);
      expect(doc.hasFrontmatter).toBe(true);
      const isProject = typeof doc.metadata.status === 'string';
      const kind = isProject ? 'projects' : 'writing';
      const validationErrors = validateMetadata(kind, doc.metadata);
      expect(
        validationErrors,
        `Document ${file} failed validation: ${validationErrors.join(', ')}`
      ).toEqual([]);
    }
  });
});
