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
- **Rider performance estimates** — speed range (kts), wind range (kts), ideal rider weight (kg), character summary (e.g., "Stable, forgiving, early takeoff") with visual range bars

### Compare Tab

- **Shape overlay** — two profiles on same axes, solid vs dashed, color-coded with legend
- **Performance delta table** — side-by-side CL, CD, L/D with percentage deltas, color-coded green (better) / red (worse)
- Compare current editor shape against any library profile or previously saved shape

### Suggest Tab

- **Goal selector** — chips: Max L/D, Max Lift, Min Drag, Stability, Early Takeoff
- **Suggestion cards** ranked by estimated impact (High/Medium/Low):
  - Description of what to change and why
  - Estimated performance impact
  - **Apply** — modifies control points in the editor
  - **Preview** — ghosted overlay of suggested shape before committing

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

- **Thin airfoil theory** — fast approximate CL while dragging control points (< 1ms, real-time feedback)
- **Hess-Smith panel method** — more accurate CL, CD, Cp on control point release or AoA change (~10-50ms for typical point counts)
- **Performance translator** — maps aero coefficients to rider outputs:
  - Lift equation (L = 0.5 × ρ × V² × S × CL) solved for speed/wind ranges given foil area and rider weight
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

- **Foil profile**: Array of `{x, y}` coordinates (normalized 0–1 on chord) plus Bezier control handle offsets
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
    usePanelMethod.ts     — Hess-Smith panel method solver
    usePerformance.ts     — aero-to-rider performance translator
    useSuggestions.ts     — rule-based optimization engine
  data/
    profiles/             — bundled foil coordinate JSON files
  stores/
    foilStore.ts          — Pinia store for current profile + analysis state
```

## Out of Scope

- 3D visualization or planform analysis
- CFD-grade accuracy or turbulence modeling
- User accounts, cloud storage, or backend services
- Mobile-optimized layout (desktop-first, responsive is a future concern)
- Real-time collaboration
