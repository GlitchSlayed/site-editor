import type { Entry } from '../components/sidebar/ContentSidebar';

export const MOCK_BWB_MDX = `---
title: "Blended Wing Body Aircraft: Aerodynamic Efficiency vs. Structural Weight"
description: A conceptual engineering investigation into whether the aerodynamic advantages of blended wing body aircraft can outweigh pressurization and structural penalties to reduce mission fuel consumption.
date: 2026-10-25
category: Aerospace
tags:
  - Aircraft Design
  - Aerodynamics
  - Simulation
status: Concept
art: wing
drawing: wing
featured: true
draft: false
sample: false
visual: mesh
visualAccent: "#33d17a"
engineering:
  question: "Can reduced aerodynamic drag outweigh a heavier pressurized center body?"
  approach: "Compare a BWB and tube-and-wing reference under the same mission assumptions."
  constraint: "Cabin structural mass remains an assumption, not a validated prediction."
  evidence: "A conceptual study with an interactive, simplified steady-flight demonstration."
  nextCheck: "Define the reference mission and validate baseline."
  methods: ["Parabolic drag polar", "Steady level flight", "Structural mass sensitivity"]
---

import { FunctionPlot, ParamPlayground, MetricCard, MetricGrid, DataTable, EngineeringNote, EquationBlock, Measurement } from '../../components/mdx';

Blended wing body (BWB) aircraft have always fascinated me. Their shape is so different from conventional tube-and-wing aircraft that it raises a fundamental engineering tradeoff: does aerodynamic efficiency outweigh structural weight penalties?

<EngineeringNote kind="decision" title="Baseline Reference Configuration">
The baseline reference is calibrated to a Mach 0.82 transcontinental mission profile with a 240-passenger payload class.
</EngineeringNote>

<EquationBlock
  equation="L/D = \\frac{C_L}{C_{D0} + K C_L^2}"
  label="Parabolic Drag Polar"
  description="Lift-to-drag estimation for blended wing body planforms."
  variables={[
    { symbol: "C_L", name: "Lift coefficient", unit: "-" },
    { symbol: "C_{D0}", name: "Zero-lift drag coefficient", unit: "-" },
    { symbol: "K", name: "Induced drag factor", unit: "-" }
  ]}
/>

<Measurement
  label="Wing Root Bending Moment"
  value={48.2}
  unit="MN·m"
  uncertainty="±1.5"
  method="Finite element beam idealization under 2.5g gust load limit"
/>

## Preliminary Performance Comparison

| Configuration | Cruise L/D | OEW / MTOW | Mission Fuel (kg) | Delta |
| :--- | :--- | :--- | :--- | :--- |
| Tube & Wing Reference | 18.2 | 0.52 | 24,500 | (0.0%) |
| BWB Nominal | 21.4 | 0.55 | 20,800 | (-15.1%) |
| BWB Heavy Structural Case | 21.4 | 0.59 | 22,600 | (-7.8%) |

## Aerodynamic Tradeoff

The wide center body creates substantial internal volume. In steady flight, weight can be distributed across a wider span fraction:

$$W = L = \\frac{1}{2} \\rho V^2 S C_L$$

Further testing will examine transonic pitch trim and cabin structural rib designs.
`;

export const MOCK_ENTRIES: Entry[] = [
  {
    path: 'src/content/projects/bwb-aircraft-feasibility.mdx',
    kind: 'Projects',
    title: 'Blended Wing Body Aircraft: Aerodynamic Efficiency vs. Structural Weight',
    draft: false,
    modified: '2026-10-25',
  },
  {
    path: 'src/content/writing/hofstra-wind-tunnel-airfoil-testing.md',
    kind: 'Writing',
    title: 'Wind Tunnel Calibration: NACA 0012 Subsonic Surface Pressure',
    draft: false,
    modified: '2026-10-18',
  },
  {
    path: 'src/content/writing/rustyuki.md',
    kind: 'Writing',
    title: 'RustyUKI: Unified Kernel Images with Rust Bootloader',
    draft: false,
    modified: '2026-10-12',
  },
];
