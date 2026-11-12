import { describe, it, expect } from 'vitest';
import { auditEditorialText, fixAllEmDashes } from '../src/lib/editorial-rules';

describe('Editorial Rules & Audit Engine', () => {
  it('flags em dashes as errors according to site guidelines', () => {
    const text = 'This is a test—with an em dash.';
    const issues = auditEditorialText(text);
    expect(issues.some(i => i.type === 'em-dash' && i.severity === 'error')).toBe(true);
  });

  it('flags prohibited marketing buzzwords', () => {
    const text = 'Our game-changer approach will revolutionize aerospace with a paradigm shift.';
    const issues = auditEditorialText(text);
    expect(issues.filter(i => i.type === 'buzzword').length).toBe(3);
  });

  it('detects missing MDX imports when MDX components are used', () => {
    const text = '<LinePlot title="Test" series={[]} />';
    const issues = auditEditorialText(text, true);
    expect(issues.some(i => i.type === 'mdx-import')).toBe(true);
  });

  it('detects missing imports for newly added engineering monograph components', () => {
    const text = '<EngineeringNote kind="decision" title="Airfoil">Choice</EngineeringNote>';
    const issues = auditEditorialText(text, true);
    expect(issues.some(i => i.type === 'mdx-import' && i.replacement?.includes('EngineeringNote'))).toBe(true);
  });

  it('does not flag missing MDX imports when properly imported', () => {
    const text = `import { LinePlot } from '@components/mdx';\n\n<LinePlot title="Test" series={[]} />`;
    const issues = auditEditorialText(text, true);
    expect(issues.some(i => i.type === 'mdx-import')).toBe(false);
  });

  it('correctly handles multi-line relative imports from components/mdx', () => {
    const text = `import {
  FunctionPlot,
  ParamPlayground,
  MetricCard,
  MetricGrid,
  DataTable,
} from '../../components/mdx';

<FunctionPlot title="Lift" />
<ParamPlayground />
<MetricCard title="Thrust" />
<MetricGrid />
<DataTable headers={[]} rows={[]} />
`;
    const issues = auditEditorialText(text, true);
    expect(issues.some(i => i.type === 'mdx-import')).toBe(false);
  });

  it('identifies only the unimported components when partial imports exist', () => {
    const text = `import { LinePlot } from '@components/mdx';\n\n<LinePlot title="Test" />\n<DataTable />`;
    const issues = auditEditorialText(text, true);
    const mdxIssue = issues.find(i => i.type === 'mdx-import');
    expect(mdxIssue).toBeDefined();
    expect(mdxIssue?.message).toContain('DataTable');
    expect(mdxIssue?.message).not.toContain('LinePlot');
  });

  it('does not flag missing MDX imports when using namespace imports', () => {
    const text = `import * as MDX from '@components/mdx';\n\n<FunctionPlot />`;
    const issues = auditEditorialText(text, true);
    expect(issues.some(i => i.type === 'mdx-import')).toBe(false);
  });

  it('replaces all em dashes and double hyphens with clean hyphens', () => {
    const text = 'Airfoil testing—lift curve--stall region.';
    const fixed = fixAllEmDashes(text);
    expect(fixed).not.toContain('—');
    expect(fixed).not.toContain('--');
    expect(fixed).toBe('Airfoil testing - lift curve - stall region.');
  });
});
