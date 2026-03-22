export interface BezierHandle {
  dx: number
  dy: number
}

export interface BezierPoint {
  x: number           // 0–1 normalized chord position
  y: number           // normalized distance from chord line
  handleIn: BezierHandle
  handleOut: BezierHandle
}

export interface FoilProfile {
  name: string
  upper: BezierPoint[] // leading edge (x=0) → trailing edge (x=1)
  lower: BezierPoint[] // leading edge (x=0) → trailing edge (x=1)
}

export interface FoilExport {
  version: 1
  name: string
  upper: Array<{ x: number; y: number; hix: number; hiy: number; hox: number; hoy: number }>
  lower: Array<{ x: number; y: number; hix: number; hiy: number; hox: number; hoy: number }>
}

export interface AnalysisResult {
  cl: number
  cd: number
  ld: number            // lift-to-drag ratio
  aoa: number           // angle of attack in degrees
  cpUpper: Array<{ x: number; cp: number }>
  cpLower: Array<{ x: number; cp: number }>
  converged: boolean
}

export interface RiderPerformance {
  speedRange: [number, number]    // knots
  windRange: [number, number]     // knots
  idealWeight: [number, number]   // kg
  character: string               // e.g., "Stable, forgiving, early takeoff"
  stability: 'low' | 'medium' | 'high'
}

export interface PerformanceSettings {
  riderWeight: number       // kg, default 80
  foilArea: number          // m², default 0.12
  waterType: 'salt' | 'fresh'  // salt=1025, fresh=1000 kg/m³
}

export interface Suggestion {
  id: string
  title: string
  description: string
  riderDescription: string  // plain-language version for guided mode
  impact: 'high' | 'medium' | 'low'
  goal: OptimizationGoal
  apply: (profile: FoilProfile) => FoilProfile
}

export type OptimizationGoal = 'max-ld' | 'max-lift' | 'min-drag' | 'stability' | 'early-takeoff'

export interface Baseline {
  name: string
  profile: FoilProfile
  analysis: AnalysisResult
}

export type EditorMode = 'draw' | 'library'
export type EditorTool = 'select' | 'add-point' | 'delete-point'
export type RightPanelTab = 'analysis' | 'compare' | 'suggest'
