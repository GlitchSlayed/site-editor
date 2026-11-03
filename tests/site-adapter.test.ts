import { describe, expect, it } from 'vitest';
import { parseSiteDocument, replaceMarkdownBody, serializeSiteDocument, validateMetadata } from '../src/lib/site-adapter';

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
});
