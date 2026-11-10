import { describe, expect, it } from 'vitest';
import {
  transformTablePercentBadges,
  preProcessMarkdown,
} from '../src/lib/preview-transformer';

describe('preview transformer parity', () => {
  it('leaves prose percentage annotations untouched outside tables', () => {
    const prose = '<p>Fuel increased by (+5%) over baseline, and drag decreased by (-3.2%). Uncertainty is (±0.05%).</p>';
    const output = transformTablePercentBadges(prose);
    expect(output).toBe(prose);
    expect(output).not.toContain('satteri-percent-badge');
  });

  it('transforms signed and plus/minus percentage values strictly inside <td> and <th> elements', () => {
    const tableHtml = `
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Variance (±0.02%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>L/D Ratio</td>
      <td>(+15.1%)</td>
    </tr>
    <tr>
      <td>Fuel Burn</td>
      <td>(-8.4%)</td>
    </tr>
  </tbody>
</table>
`;
    const transformed = transformTablePercentBadges(tableHtml);

    // <th> cell with plus/minus
    expect(transformed).toContain('<th>Variance <span class="satteri-percent-badge satteri-percent-neutral">(±0.02%)</span></th>');

    // <td> cell with positive
    expect(transformed).toContain('<td><span class="satteri-percent-badge satteri-percent-positive">(+15.1%)</span></td>');

    // <td> cell with negative
    expect(transformed).toContain('<td><span class="satteri-percent-badge satteri-percent-negative">(-8.4%)</span></td>');
  });

  it('pre-processes display math blocks and inline math', () => {
    const md = 'Here is inline $E = mc^2$ and block math:\n\n$$\nq = \\frac{1}{2}\\rho v^2\n$$\n';
    const preprocessed = preProcessMarkdown(md);

    expect(preprocessed).toContain('<code class="math-inline">E = mc^2</code>');
    expect(preprocessed).toContain('<div class="mdx-equation-preview"><div class="mdx-equation-math">q = \\frac{1}{2}\\rho v^2</div></div>');
  });

  it('pre-processes MDX components (EquationBlock, Measurement, EngineeringNote)', () => {
    const mdx = `
<EquationBlock equation="F = ma" description="Newton's second law" />
<Measurement label="Mach" value={0.82} unit="M" />
<EngineeringNote kind="constraint" title="Thermal Limits">Max temperature 1200 K</EngineeringNote>
`;
    const preprocessed = preProcessMarkdown(mdx);

    expect(preprocessed).toContain('class="mdx-equation-preview"');
    expect(preprocessed).toContain('Newton&#39;s second law');
    expect(preprocessed).toContain('class="mdx-measurement-preview"');
    expect(preprocessed).toContain('0.82 M');
    expect(preprocessed).toContain('class="mdx-note-preview mdx-note-constraint"');
    expect(preprocessed).toContain('Thermal Limits');
  });
});
