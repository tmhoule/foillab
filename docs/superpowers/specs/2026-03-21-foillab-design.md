# FoilLab — Windsurf Foil Shape Analyzer

## Overview

FoilLab is a browser-based tool for analyzing and improving windsurf hydrofoil cross-section profiles. It serves two audiences: foil designers who want to iterate on shapes with engineering feedback, and riders who want to understand how foil shape affects performance and get improvement suggestions.

The app runs entirely client-side (Vue 3, no backend) with educational/directional accuracy — good enough to show trends and relative comparisons using simplified aerodynamic models.

## Architecture

### Layout: Split-Pane Workbench + Guided Mode

- **Left panel (55%)** — Foil editor, always visible. Two modes:
  - **Draw mode**: SVG canvas with draggable Bezier control points, grid snap, mirror symmetry, undo/reset
  - **Library mode**: Searchable, categorized list of known foil profiles (NACA, Eppler, windsurf-specific) that load into the editor as editable control points
- **Right panel (45%)** — Three tabs:
  - **Analysis**: Live coefficients (CL, CD, L/D), CL vs AoA polar, pressure distribution (Cp) plot, rider performance estimates
  - **Compare**: Overlay two profiles on the same axes with a performance delta table
  - **Suggest**: Goal-based optimization recommendations with Apply/Preview actions
- **Top bar** — App title, Guided Mode toggle
- **Guided Mode** — Step-by-step overlay for riders: choose shape → enter riding details → see performance → explore improvements → compare options. Same components, rider-friendly language, progressive disclosure.

### Foil Editor

**Draw Mode:**
- SVG canvas with grid background and chord/camber reference lines
- Profile defined by draggable control points with cubic Bezier curves
- Bezier handles visible on selected point for curvature control
- Toolbar: Select, Add Point, Delete Point, Undo, Reset
- Undo: linear stack (unlimited depth) covering control point moves, point add/delete, library loads, and Apply from Suggest tab. Each operation is one undo step. Reset clears the undo stack.
- Constraints: snap-to-grid, mirror symmetry (top/bottom linked), show/hide camber line
- Status bar: chord length, thickness ratio, camber %, control point count
- Coordinate tooltip on hover (normalized x, y)

**Library Mode:**
- Search with text input and category filter chips (Windsurf, Kitefoil, NACA, Eppler)
- Each profile shows: SVG thumbnail, name, one-line description
- Selecting a profile loads it into Draw mode as editable control points
- Profiles bundled as static coordinate data (NACA parametric generation + curated hydrofoil set)

### Analysis Tab

- **AoA slider** — drag to change angle of attack, all results update live
- **Coefficient cards** — CL, CD, L/D displayed prominently with color coding
- **CL vs AoA polar** — lift curve with current operating point marked
- **Pressure distribution (Cp)** — upper and lower surface curves, shaded area between showing pressure difference
- **Rider performance estimates** — speed range (kts), wind range (kts), ideal rider weight (kg), character summary (e.g., "Stable, forgiving, early takeoff") with visual range bars. Settings popover for foil area (m²), rider weight (kg), and water type (salt/fresh)

### Compare Tab

- **Shape overlay** — two profiles on same axes, solid vs dashed, color-coded with legend
- **Performance delta table** — side-by-side CL, CD, L/D with percentage deltas, color-coded green (better) / red (worse)
- Compare current editor shape against any library profile or a saved baseline snapshot
- "Save as baseline" button stores the current profile in-session for comparison (named "Baseline 1", "Baseline 2", etc.)

### Suggest Tab

- **Goal selector** — chips: Max L/D, Max Lift, Min Drag, Stability, Early Takeoff
- **Suggestion cards** ranked by estimated impact (High/Medium/Low):
  - Description of what to change and why
  - Estimated performance impact
  - **Apply** — modifies specific control points in the editor (not a full profile replacement). Multiple suggestions can be applied in sequence. Each Apply is a single undo step. Analysis recomputes immediately after Apply.
  - **Preview** — ghosted overlay of the suggested shape on the editor canvas. Editor remains interactive during preview. Click "Apply" to commit or "Dismiss" to remove the ghost.

### Guided Mode

Activated via toggle in top bar. Wraps existing components with a step-by-step overlay:

1. **Choose a starting shape** — library with plain-language descriptions
2. **Tell us about your riding** — rider weight, wind conditions, skill level
3. **See how it performs** — rider-friendly language, raw coefficients behind "Show details"
4. **Explore improvements** — suggestions worded for riders ("Make it easier to get up on foil")
5. **Compare options** — simplified comparison view

Progress indicator shows current step. Not a separate app — `GuidedMode.vue` controls visibility and language of existing components.

## Computation

### Physics Engine (client-side JavaScript)

**Thin airfoil theory (real-time, < 1ms):**
- Used while dragging control points for instant feedback
- CL = 2π(α + α_L0) where α_L0 is the zero-lift angle computed from the camber line
- Provides CL only — no drag or pressure distribution

**Hess-Smith panel method (on release, ~10-50ms):**
- Triggered when the user releases a control point or changes AoA
- Discretization: 80–120 panels, cosine-clustered at leading and trailing edges (finer spacing where curvature is highest, coarser mid-chord)
- Profile is interpolated from Bezier curves into panel endpoints
- Standard Kutta condition at trailing edge (γ_TE = 0). For blunt trailing edges (thickness > 1% chord at TE), the two TE panels are treated as a single point — acceptable for educational accuracy
- Computes: CL (from circulation), pressure drag CD_p (from surface pressure integration), and Cp distribution
- **CD is pressure drag only** — viscous drag is not modeled. This is stated clearly in the UI: "Pressure drag only — total drag will be higher in practice." L/D values are noted as optimistic estimates
- AoA slider range: -10° to +20°, step 0.5°

**Input validation / edge cases:**
- Self-intersecting profiles: detected by checking for crossing segments before running the panel method. If detected, show a warning badge on the editor ("Self-intersecting profile — fix to see analysis") and freeze analysis at last valid state
- Extreme AoA: if the panel method fails to converge (CL diverges), clamp the display and show "Stalled — results unreliable above this AoA" on the polar chart
- Zero-thickness profiles: minimum thickness ratio enforced at 0.5% — control points are constrained to prevent collapse

**Performance translator** — maps aero coefficients to rider outputs:
- Lift equation (L = 0.5 × ρ × V² × S × CL) solved for speed/wind ranges
- **ρ = 1025 kg/m³** (saltwater default, toggle for freshwater 1000 kg/m³)
- **S (foil planform area)** and **rider weight**: user-configurable inputs in a settings popover on the Analysis tab (defaults: S = 0.12 m², weight = 80 kg). Also prompted during Guided Mode step 2
- Stability heuristics from camber distribution, thickness, pitching moment
- Character classification from shape metrics

### Suggestion Engine

Rule-based system using established hydrofoil design heuristics:
- Camber magnitude/position vs. lift and drag
- Thickness distribution vs. drag and structural considerations
- Leading edge radius vs. stall behavior
- Trailing edge thickness vs. drag

For each optimization goal, applies relevant rules to current shape, ranks by estimated impact. Not ML — codified design knowledge appropriate for educational accuracy.

## Data Model

### Foil Profile Structure

A profile is a single closed loop defined as two curves (upper and lower surface) that share leading edge (x=0) and trailing edge (x=1) points:

```typescript
interface FoilProfile {
  name: string;
  upper: BezierPoint[];  // leading edge → trailing edge
  lower: BezierPoint[];  // leading edge → trailing edge
}

interface BezierPoint {
  x: number;            // 0–1 normalized chord position
  y: number;            // normalized distance from chord line
  handleIn: { dx: number; dy: number };   // incoming tangent handle offset
  handleOut: { dx: number; dy: number };  // outgoing tangent handle offset
}
```

- Upper and lower surfaces are separate curves joined at LE (x=0) and TE (x=1)
- "Mirror symmetry" constraint links upper/lower points at the same x position — dragging an upper point mirrors the y-offset (negated) to the corresponding lower point
- Library profiles (stored as coordinate arrays) are converted to Bezier control points using cubic spline fitting with ~8-12 points per surface, cosine-clustered at leading and trailing edges for better resolution where curvature is highest

### Snapshots for Comparison

In-session snapshot mechanism: a "Save as baseline" action in the Compare tab stores the current profile in memory. Multiple baselines can be saved per session (named automatically: "Baseline 1", "Baseline 2", etc.). These are lost on page refresh — the export/import JSON flow is for longer-term persistence.

### Export Format

```typescript
interface FoilExport {
  version: 1;
  name: string;
  upper: Array<{ x: number; y: number; hix: number; hiy: number; hox: number; hoy: number }>;
  lower: Array<{ x: number; y: number; hix: number; hiy: number; hox: number; hoy: number }>;
}
```

- **Library profiles**: Static JSON files bundled with the app
- **No persistence layer** — profiles live in memory. Export/import as JSON for saving work.

## Tech Stack

- **Vue 3** with Composition API
- **Pinia** for state management
- **TypeScript**
- **SVG** for foil rendering and charts (no Canvas or WebGL needed)
- **Vite** for build tooling
- No backend, no external APIs

## Project Structure

```
src/
  components/
    TopBar.vue            — app header, guided mode toggle
    FoilEditor.vue        — SVG canvas, control points, draw/library toggle
    FoilLibrary.vue       — searchable profile list
    AnalysisPanel.vue     — coefficients, charts, rider performance
    ComparePanel.vue      — overlay + delta table
    SuggestPanel.vue      — goal selector + suggestion cards
    GuidedMode.vue        — step-by-step overlay
  composables/
    useFoilGeometry.ts    — profile math, Bezier interpolation, metrics
    useThinAirfoil.ts     — thin airfoil theory (real-time CL approximation)
    usePanelMethod.ts     — Hess-Smith panel method solver
    usePerformance.ts     — aero-to-rider performance translator
    useSuggestions.ts     — rule-based optimization engine
  data/
    profiles/             — bundled foil coordinate JSON files
  stores/
    foilStore.ts          — Pinia store for current profile + analysis state
```

## Testing Strategy

- **Panel method validation**: unit tests against known NACA results (e.g., NACA 0012 at 0° AoA → CL ≈ 0, symmetric Cp; NACA 2412 at 5° → CL ≈ 0.85 ± 15%)
- **Thin airfoil theory**: unit tests for CL = 2πα on symmetric profiles, correct α_L0 for cambered profiles
- **Bezier interpolation**: unit tests for curve fitting accuracy, endpoint continuity, and library profile round-trip conversion
- **Geometry validation**: unit tests for self-intersection detection, thickness ratio calculation, camber computation
- **Vue components**: component tests for editor interactions (drag, add/delete point, undo), tab switching, and guided mode step progression using Vitest + Vue Test Utils

## Out of Scope

- 3D visualization or planform analysis
- CFD-grade accuracy or turbulence modeling
- User accounts, cloud storage, or backend services
- Mobile-optimized layout (desktop-first, responsive is a future concern)
- Real-time collaboration
