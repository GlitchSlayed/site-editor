/**
 * Catalog of Interactive MDX Components for Glitchy's Technical Blog
 * Source: docs/mdx-components-guide.md
 */

export interface MdxComponentSnippet {
  id: string;
  name: string;
  category: 'Scientific Plot' | 'Control' | 'Metric & KPI' | 'Data Table' | 'Code & Exec' | 'Overlay';
  description: string;
  snippet: string;
  importStatement: string;
}

export const MDX_COMPONENTS_CATALOG: MdxComponentSnippet[] = [
  {
    id: 'line-plot',
    name: 'LinePlot',
    category: 'Scientific Plot',
    description: 'High-performance interactive 2D scientific curve plot (uPlot)',
    importStatement: "import { LinePlot } from '@components/mdx';",
    snippet: `<LinePlot
  title="Lift Coefficient vs. Angle of Attack ($C_L$ vs. $\\alpha$)"
  description="Comparison of clean airfoil vs. vortex-generator configuration"
  xLabel="Angle of Attack (\\alpha)"
  xUnit="deg"
  yLabel="Lift Coefficient (C_L)"
  height={360}
  series={[
    {
      id: "baseline",
      label: "Baseline Airfoil",
      color: "#739cda",
      x: [0, 2, 4, 6, 8, 10, 12, 14, 16],
      y: [0.1, 0.32, 0.54, 0.75, 0.95, 1.12, 1.25, 1.28, 1.15]
    },
    {
      id: "modified",
      label: "Vortex Generators Added",
      color: "#ff5b36",
      x: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
      y: [0.08, 0.30, 0.52, 0.74, 0.96, 1.16, 1.34, 1.45, 1.48, 1.39]
    }
  ]}
/>`,
  },
  {
    id: 'function-plot',
    name: 'FunctionPlot',
    category: 'Scientific Plot',
    description: 'Real-time mathematical expression curve sweeper with parameter sliders',
    importStatement: "import { FunctionPlot, ParamSlider } from '@components/mdx';",
    snippet: `<ParamSlider
  scopeId="lift-demo"
  paramId="velocity"
  label="Free Stream Velocity"
  unit="m/s"
  min={10}
  max={120}
  step={5}
  defaultValue={60}
/>

<FunctionPlot
  scopeId="lift-demo"
  title="Dynamic Pressure vs Velocity ($q = \\frac{1}{2}\\rho v^2$)"
  xLabel="Velocity (v)"
  xUnit="m/s"
  yLabel="Dynamic Pressure (q)"
  yUnit="Pa"
  fn={(v, params) => 0.5 * 1.225 * Math.pow(v, 2)}
  xRange={[0, 120]}
  samples={100}
/>`,
  },
  {
    id: 'scatter-plot',
    name: 'ScatterPlot',
    category: 'Scientific Plot',
    description: 'Multi-series scatter points with confidence regions',
    importStatement: "import { ScatterPlot } from '@components/mdx';",
    snippet: `<ScatterPlot
  title="Wind Tunnel Boundary Layer Sensor Readings"
  xLabel="Chord Station (x/c)"
  yLabel="Total Pressure Ratio"
  series={[
    {
      label: "Sensor Array A",
      color: "#33d17a",
      points: [
        [0.1, 0.98], [0.2, 0.96], [0.3, 0.94], [0.4, 0.91],
        [0.5, 0.88], [0.6, 0.82], [0.7, 0.76], [0.8, 0.69]
      ]
    }
  ]}
/>`,
  },
  {
    id: 'metric-grid',
    name: 'MetricGrid & MetricCard',
    category: 'Metric & KPI',
    description: 'Responsive KPI metrics cards with delta comparisons',
    importStatement: "import { MetricGrid, MetricCard } from '@components/mdx';",
    snippet: `<MetricGrid columns={3}>
  <MetricCard
    label="Maximum L/D Ratio"
    value="18.4"
    delta="+12.2%"
    deltaDirection="positive"
    description="Optimized blended wing body configuration"
  />
  <MetricCard
    label="Cruising Mach"
    value="0.82"
    description="Transonic design cruise regime"
  />
  <MetricCard
    label="Fuel Burn Reduction"
    value="21.5%"
    delta="-4.5%"
    deltaDirection="positive"
    description="Compared to tube-and-wing baseline"
  />
</MetricGrid>`,
  },
  {
    id: 'param-playground',
    name: 'ParamPlayground',
    category: 'Control',
    description: 'Interactive parameter dashboard with presets',
    importStatement: "import { ParamPlayground } from '@components/mdx';",
    snippet: `<ParamPlayground
  scopeId="aircraft-design"
  title="Aircraft Sizing Parameters"
  parameters={[
    { id: 'wingspan', label: 'Wingspan (b)', unit: 'm', min: 10, max: 60, step: 1, defaultValue: 34 },
    { id: 'aspectRatio', label: 'Aspect Ratio (AR)', min: 6, max: 15, step: 0.5, defaultValue: 9.5 },
    { id: 'taperRatio', label: 'Taper Ratio (\\lambda)', min: 0.1, max: 1.0, step: 0.05, defaultValue: 0.28 }
  ]}
  presets={{
    regional: { wingspan: 28, aspectRatio: 8.5, taperRatio: 0.3 },
    longRange: { wingspan: 60, aspectRatio: 11.0, taperRatio: 0.22 }
  }}
/>`,
  },
  {
    id: 'data-table',
    name: 'DataTable',
    category: 'Data Table',
    description: 'Sortable, searchable engineering data table with CSV export',
    importStatement: "import { DataTable } from '@components/mdx';",
    snippet: `<DataTable
  title="Aerodynamic Coefficients Test Matrix"
  columns={[
    { key: "runId", label: "Run #" },
    { key: "alpha", label: "AoA (deg)", numeric: true },
    { key: "mach", label: "Mach", numeric: true },
    { key: "cL", label: "C_L", numeric: true },
    { key: "cD", label: "C_D", numeric: true }
  ]}
  data={[
    { runId: "001", alpha: 0.0, mach: 0.2, cL: 0.12, cD: 0.015 },
    { runId: "002", alpha: 2.0, mach: 0.2, cL: 0.35, cD: 0.019 },
    { runId: "003", alpha: 4.0, mach: 0.2, cL: 0.58, cD: 0.026 },
    { runId: "004", alpha: 6.0, mach: 0.2, cL: 0.79, cD: 0.038 }
  ]}
/>`,
  },
  {
    id: 'notebook-cell',
    name: 'NotebookCell',
    category: 'Code & Exec',
    description: 'Jupyter-style computational notebook cell with input and output',
    importStatement: "import { NotebookCell } from '@components/mdx';",
    snippet: `<NotebookCell
  executionCount={1}
  language="python"
  code={\`import numpy as np

rho = 1.225 # kg/m^3 (sea-level density)
V = 50.0    # m/s (freestream velocity)
q = 0.5 * rho * V**2
print(f"Dynamic pressure q = {q:.2f} Pa")\`}
  output="Dynamic pressure q = 1531.25 Pa"
/>`,
  },
  {
    id: 'tooltip',
    name: 'Tooltip',
    category: 'Overlay',
    description: 'Glassmorphic tooltip overlay for engineering terms and acronyms',
    importStatement: "import { Tooltip } from '@components/mdx';",
    snippet: `<Tooltip text="Geometric Dimensioning and Tolerancing: standard ANSI/ISO framework for communicating engineering tolerances">GD&T</Tooltip>`,
  },
];
