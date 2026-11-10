---
title: "Three Airfoils in Hofstra's Wind Tunnel"
description: "A proposed wind tunnel investigation comparing lift measurements for the NACA 0012, NACA 4412, and a flat plate with thin airfoil theory and XFOIL."
date: "2026-11-02"
tags: [Aerospace, Simulation, Manufacturing]
status: Concept
art: wing
featured: false
draft: false
sample: false
drawing: airfoils
engineering:
  question: "How closely can a student-built test reproduce predicted airfoil lift curves?"
  approach: "Compare NACA 0012, NACA 4412, and a flat plate at comparable Reynolds numbers."
  constraint: "Tunnel speed range, balance resolution, and model mounting remain unconfirmed."
  evidence: "Test proposal only. No manufactured models, simulations, or tunnel measurements yet."
  nextCheck: "Review access, instrumentation, and mounting feasibility with the lab."
  methods: ["Thin airfoil theory", "XFOIL planned", "Repeated angle sweeps", "Uncertainty analysis"]
---

I want to use Hofstra's new wind tunnel to investigate how closely a student-built experiment can reproduce the lift characteristics predicted for familiar airfoil shapes. The proposed study compares a symmetric NACA 0012, a cambered NACA 4412, and a flat plate under the same nominal test conditions, using thin airfoil theory and XFOIL as analytical and numerical references.

The tunnel is the custom Engineering Laboratory Design (ELD Inc.) subsonic research tunnel in the Aerodynamics Research Facility, located in the Adams Hall Solarium [5, 6]. Spearheaded and led by Dr. David M. Rooney and Dr. John C. Vaccaro, this is a dedicated research tunnel, distinct from Hofstra's instructional tunnels, with a test section measuring $1.5\text{ ft} \times 1.5\text{ ft}$ ($18\text{ in} \times 18\text{ in}$) [5].

These are well-studied geometries. Their value here is that they give the experiment a clear starting point. By measuring their behavior, I can evaluate the models, mounting arrangement, instrumentation, and data reduction together, then investigate where the measurements and predictions separate.

## Current status

This project is a theoretical proposal. No models have been manufactured, no simulations have been run, and no wind tunnel measurements have been collected.

Facility specifications move several key items from speculation into confirmed parameters, while operational details remain open:
- **Confirmed facility parameters:** Custom ELD Inc. subsonic research tunnel in the Aerodynamics Research Facility, Adams Hall Solarium; dedicated research tunnel led by Dr. Rooney and Dr. Vaccaro, distinct from Hofstra's instructional tunnels; test section dimensions of $1.5\text{ ft} \times 1.5\text{ ft}$ ($18\text{ in} \times 18\text{ in}$) [5, 6].
- **Still unconfirmed:** Usable speed range and achievable Reynolds number envelope, balance configuration and instrumentation resolution, mounting options, and the formal approval and training process.

This page defines the intended scope and test plan. If the project proceeds, I will update it with the final setup, measured results, and supporting files. Separate blog posts will document the design decisions, testing, and analysis as they happen.

## Project objectives

The main question is how well thin airfoil theory and XFOIL describe the measured lift curves within the operating range of the available tunnel. Answering that requires more than plotting three curves together. I need to establish whether the experiment is repeatable, whether the physical and computational models represent comparable conditions, and whether any disagreement exceeds the measurement uncertainty.

The initial scope is lift as a function of angle of attack and Reynolds number. I plan to extract the lift curve slope, the angle of zero lift, and, if the permitted angle range captures it, the maximum lift coefficient and stall behavior. Drag and pitching moment would be useful additions if the instrumentation supports them, but they are outside the minimum scope.

## Why these three geometries

| Test article | Geometry | Role in the comparison |
| --- | --- | --- |
| NACA 0012 | Symmetric section with a maximum thickness of 12% of chord | Baseline for zero-lift alignment and lift curve slope |
| NACA 4412 | Maximum camber of 4% of chord at 40% chord, with a maximum thickness of 12% | Comparison showing the effect of camber at the same nominal thickness |
| Flat plate | Constant thickness, with edge geometry to be specified | Simple reference for comparison with the shaped sections |

The 0012 provides a useful first test because symmetry gives a clear expectation: under symmetric flow conditions, lift should be close to zero at zero angle of attack. An offset would prompt checks of alignment, balance zero, model geometry, and flow direction before I interpret the rest of the sweep.

The 4412 introduces camber while keeping the same nominal thickness ratio. I expect its attached-flow lift curve to be shifted toward greater positive lift, with zero lift occurring at a negative angle. That gives the experiment a second feature to resolve beyond the slope of a symmetric section.

The flat plate provides a deliberately simple geometry, but its performance should remain an experimental question. I will not assume that it produces less lift at every angle or always stalls first. Its thickness, edge shape, Reynolds number, and mounting arrangement all need to be recorded before the comparison is meaningful.

## Analytical and numerical references

### Thin airfoil theory

For a two-dimensional section in incompressible, attached flow, thin airfoil theory gives

$$
c_l = 2\pi\left(\alpha - \alpha_{L=0}\right)
$$

where $c_l$ is the section lift coefficient, $\alpha$ is angle of attack, and $\alpha_{L=0}$ is the angle of zero lift. Both angles are in radians. The predicted slope is $2\pi$ per radian, or approximately $0.110$ per degree. This is a small-angle, inviscid reference and does not predict stall. [1]

For the 0012, the theoretical zero-lift angle is zero. For the 4412, I will calculate it from the prescribed camber line before testing. The theoretical line will be compared with the measured region that is approximately linear, rather than extended through stall as though it remains valid.

### XFOIL

XFOIL adds the actual section geometry and a coupled boundary-layer model, including transition and limited separation. That makes it a useful next level of comparison, although its accuracy deteriorates near and beyond stall. [2]

I plan to generate NACA-section predictions at the selected Reynolds numbers before testing, then rerun at the measured conditions if necessary. I will retain the software version, geometry files, panel settings, transition assumptions, solver settings, and convergence records. Changes made after seeing the measurements will be identified separately from the original predictions.

The flat plate will remain an experimental reference even if its sharp edges or separated flow prevent a useful XFOIL comparison. Unconverged cases will be marked as missing predictions.

### Making the comparison physically consistent

Thin airfoil theory and XFOIL describe two-dimensional sections. A finite-span model with exposed tips develops three-dimensional flow, including downwash that reduces the lift curve slope. A lower measured slope would therefore not, by itself, demonstrate a problem with either the tunnel or the prediction. [3]

Before manufacturing, I need to establish whether the tunnel supports a suitable wall-spanning arrangement or end plates. If the setup approximates two-dimensional flow, I will document the end conditions and remaining limitations. If exposed tips are unavoidable, I will report finite-wing coefficients and include an appropriate finite-span reference in the attached-flow region. The two-dimensional curves will still provide context, with that distinction made explicit.

## Model design and manufacturing

All three models will share the same nominal chord and span. With the confirmed $18\text{ in} \times 18\text{ in}$ ($1.5\text{ ft} \times 1.5\text{ ft}$) test section cross-sectional area ($324\text{ in}^2$), model sizing can move from open-ended speculation to concrete estimates.

Maintaining aerodynamic blockage below a 5% target at the highest planned test angle ($\alpha \approx 16^\circ$) establishes a projected frontal area budget of approximately $16\text{ in}^2$ ($0.05 \times 324\text{ in}^2 \approx 16.2\text{ in}^2$). At $\alpha = 16^\circ$, the projected frontal height of a 12% thick section is roughly $c \sin(16^\circ) + 0.12 c \cos(16^\circ) \approx 0.39 c$:
- Sizing for a chord around 4 inches ($c \approx 4\text{ in}$) and a span around 10 to 12 inches ($b \approx 10\text{ to }12\text{ in}$) with end plates yields a projected frontal area of roughly $15.6\text{ to }18.7\text{ in}^2$, landing right near that 16-square-inch budget.
- By comparison, a 6-inch chord ($c \approx 6\text{ in}$) produces a projected frontal height over $2.3\text{ in}$, resulting in $23\text{ to }28\text{ in}^2$ of frontal area (over 7% to 8.5% blockage) and clearly exceeding the 5% threshold.

These dimensions are estimates pending the lab's formal guidance on mounting hardware, support rigidity, and wall boundary layers, but establishing a 4-inch chord gives the proposal an initial baseline that balances force signal strength against tunnel blockage.

The proposed manufacturing approach is 3D printing with a common material and consistent process settings, followed by a documented finishing procedure. The flat plate thickness and edge treatment will be specified as part of its geometry.

Before testing, I will inspect the chord, span, section shape, straightness, and mounting alignment. I will also check that the models and supports remain sufficiently rigid under the expected loads. Surface finishing needs particular care around the leading edge, where sanding could alter the intended shape.

Low Reynolds number experiments are sensitive to boundary-layer behavior and test conditions. Consistent finishing helps control one source of variation, but it does not establish a known aerodynamic roughness. The manufacturing and finishing process will therefore be included with the final results. [4]

## Proposed test procedure

The initial angle sweep is $-4^\circ$ to $16^\circ$ in $2^\circ$ increments, with smaller increments near changes in slope or a possible lift maximum. This range is a starting plan, not a prediction that stall must occur within it. Any extension will depend on the facility's operating limits. If the 4412 does not cross zero lift within the negative-angle range, I will seek permission to extend that range as well.

I plan to use two or three speeds, selected after confirming the tunnel's usable range and the balance's measurement resolution. At each nominal speed, all three models will be tested at comparable chord Reynolds numbers.

The intended sequence is:

1. **Calibrate and align.** Check the balance with known loads across the expected measurement range. Verify angle indication against the chord reference and account for any known difference between tunnel flow direction and mechanical level.
2. **Establish baseline readings.** Record tunnel-off zeros, model weight effects where relevant, and support-only readings at speed across the planned angles where feasible. Repeat zero checks during and after testing to track drift.
3. **Run the 0012 first.** Use the symmetric section to assess alignment, signal quality, and repeatability before testing the other geometries.
4. **Complete repeated sweeps.** Target at least three independent measurements of each condition, allowing the flow and readings to settle. Remove and remount each model at least once to assess setup repeatability.
5. **Check changing behavior.** Where practical, repeat selected conditions while decreasing angle to look for hysteresis. Retain fluctuating readings and investigate them before deciding whether a condition needs a longer acquisition period or a rerun.

A support-only measurement can estimate the support's own aerodynamic load. It cannot fully remove the interaction between the support and an installed model, so that limitation will remain in the analysis.

The required instrumentation is a suitable force balance, a verifiable angle indicator, and a calibrated dynamic-pressure or airspeed measurement. I also need room temperature and atmospheric pressure. If the balance measures forces in model axes, I will establish the required transformation into lift perpendicular to the incoming flow. A single normal-force reading cannot generally be treated as lift at nonzero angle without accounting for the other force component.

## Data reduction and evaluation

For each recorded condition, I will calculate chord Reynolds number as

$$
Re_c = \frac{\rho Vc}{\mu}
$$

where $\rho$ is air density, $V$ is freestream speed, $c$ is chord, and $\mu$ is dynamic viscosity. Density will be calculated from measured room conditions, with viscosity evaluated at the measured temperature.

The measured lift coefficient will use

$$
C_L = \frac{L}{qS}, \qquad q = \frac{1}{2}\rho V^2, \qquad S = bc
$$

Here, $L$ is the tare-corrected lift in newtons, $q$ is dynamic pressure in pascals, and $S$ is the common rectangular planform area in square metres, using span $b$ and chord $c$. Where calibrated differential pressure is available, it will provide $q$ directly. I will use $c_l$ for section predictions and $C_L$ for integrated model measurements, explaining when their direct comparison is justified by the setup.

The planned analysis includes:

- Lift coefficient against angle of attack at each Reynolds number, with uncertainty bars and clearly identified prediction curves.
- Fitted lift curve slopes and zero-lift angles, with the fitting intervals reported.
- Differences between repeated sweeps and between measurements before and after remounting.
- Measured peak lift and stall behavior only where the sweep actually captures them.

I will estimate uncertainty from force calibration, zero drift, dynamic pressure, model dimensions, and angle setting. Repeat scatter will be reported separately from systematic effects that repeating a run cannot remove. Near zero lift, absolute coefficient uncertainty will be more useful than percentage error.

The comparison should establish which differences the experiment can resolve. A small separation between curves has limited meaning if it is smaller than the uncertainty in the measurements.

## Limitations to investigate

| Source | Planned treatment |
| --- | --- |
| Wall interference and blockage | Record projected blockage and use facility-appropriate corrections or estimates, retaining the original measurements |
| Finite span and end conditions | Document aspect ratio, tip gaps, and end plates; match the interpretation to the actual setup |
| Support interference and force coupling | Use baseline measurements and calibration checks, while retaining interaction effects as a limitation |
| Geometry and surface finish | Inspect the manufactured models and record finishing methods and visible defects |
| Transition and separation | Examine Reynolds number sensitivity and document XFOIL transition assumptions |
| Flow quality | Request characterization results (pressure, velocity uniformity, and turbulence intensity) planned or underway by Dr. Vaccaro, interpreting airfoil measurements directly against baseline findings |

I will not infer flow quality from the tunnel's age or assume that turbulence shifts stall in a particular direction. According to Dr. Vaccaro, the facility's first research projects will characterize pressure distribution, velocity uniformity, and turbulence intensity in the test section [5]. Characterization work is planned or underway, and I will request those results from the lab so that measured airfoil data can be interpreted against whatever flow quality that characterization establishes. Published experimental data will be selected for comparable Reynolds numbers, geometry, surface condition, and end conditions. Where those do not match, the reference will be used to discuss trends rather than treated as an exact target.

## Roadmap

The schedule below assumes access is granted and the required equipment is available. All experimental work remains planned.

| Stage | Intended work | Completion criterion |
| --- | --- | --- |
| Weeks 1 to 2 | Confirm access and specifications, finalize the setup, manufacture models, and prepare predictions | Approved test plan, inspected models, and saved baseline predictions |
| Week 3 | Calibrate, establish baseline readings, and test the 0012 | Usable first sweep with documented repeatability and measurement limits |
| Week 4 | Test the 4412 and flat plate, including repeated and remounted runs | Recorded measurements across the agreed test matrix |
| Week 5 | Reduce data, assess uncertainty, compare references, and investigate discrepancies | Traceable analysis and a results write-up, with a targeted rerun if needed and available |

## Planned deliverables

The project files will retain raw measurements, run conditions, calibration records, model geometry, XFOIL inputs and outputs, and analysis scripts. The reduced data will remain traceable to the original readings and any corrections applied.

This project page will become the durable overview of the setup and findings. A companion blog series will cover the proposal, preparation and first runs, results, and investigation of discrepancies. If useful to the lab, I will also prepare a one-page summary, with facility credit included in published material.

Success means producing a repeatable, well-documented comparison whose limits are clear. Agreement would support the method within the tested conditions. Disagreement would identify questions to investigate, whether they concern the predictions, manufactured models, flow conditions, or measurement system.

## Next steps

The immediate task is to review feasibility with the lab. With test section dimensions established at $1.5\text{ ft} \times 1.5\text{ ft}$, the operational questions to resolve are:
- Usable speed range and achievable dynamic pressures.
- Balance configuration, axis orientation, capacity, and measurement resolution.
- Mounting options and provisions for wall mounts or end plates.
- Approval and training requirements: identifying who approves student projects, required safety training, and scheduling availability outside normal class periods.
- Coordination on characterization data to incorporate baseline velocity and turbulence intensity readings as they become available.

Those answers will determine the final model dimensions, mounting fabrication, and test matrix. Until then, this remains a proposed investigation with a defined method and open facility requirements.

## References

1. Tom Benson, NASA Glenn Research Center. [Inclination Effects on Lift](https://www.grc.nasa.gov/www/k-12/VirtualAero/BottleRocket/airplane/incline.html).
2. Mark Drela and Harold Youngren. [XFOIL 6.9 User Primer](https://web.mit.edu/drela/Public/web/xfoil/xfoil_doc.txt).
3. Shigeo Hayashibara, Embry-Riddle Aeronautical University. [D-1: Aerodynamics of Wings (1)](https://eaglepubs.erau.edu/compsimforaero/chapter/d-1/), *Computer Simulations for Aerodynamics*.
4. Michael S. Selig, Robert W. Deters, and Gregory A. Williamson. [Wind Tunnel Testing Airfoils at Low Reynolds Numbers](https://m-selig.ae.illinois.edu/pubs/SeligDetersWilliamson-2011-AIAA-2011-875-LRN-AirfoilWindTunnelTesting.pdf). AIAA Paper 2011-875, 2011.
5. Hofstra University. [New Wind Tunnel Expands Research and Hands-On Learning at Hofstra Engineering](https://news.hofstra.edu/2026/05/19/new-wind-tunnel-expands-research-and-hands-on-learning-at-hofstra-engineering/). *Hofstra News*, May 19, 2026.
6. Hofstra University. [Alumnus Michael Delaney Supports New Aerodynamics Research Facility](https://news.hofstra.edu/2026/10/23/alumnus-michael-delaney-supports-new-aerodynamics-research-facility/). *Hofstra News*, October 23, 2026.
