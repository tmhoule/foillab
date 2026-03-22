import type { FoilProfile, AnalysisResult, Suggestion, OptimizationGoal } from '../types/foil'
import { computeThicknessRatio, computeMaxCamber } from './useFoilGeometry'

function cloneProfile(p: FoilProfile): FoilProfile {
  return structuredClone(p)
}

function makeIncreaseCamber(profile: FoilProfile): FoilProfile {
  const result = cloneProfile(profile)
  for (const pt of result.upper) {
    if (pt.x > 0.15 && pt.x < 0.5) {
      pt.y += 0.01 * (1 - Math.abs(pt.x - 0.3) / 0.2)
    }
  }
  return result
}

function makeDecreaseCamber(profile: FoilProfile): FoilProfile {
  const result = cloneProfile(profile)
  for (const pt of result.upper) {
    if (pt.x > 0.15 && pt.x < 0.5) {
      pt.y -= 0.008 * (1 - Math.abs(pt.x - 0.3) / 0.2)
    }
  }
  return result
}

function makeMoveCamberForward(profile: FoilProfile): FoilProfile {
  const result = cloneProfile(profile)
  for (const pt of result.upper) {
    if (pt.x > 0.05 && pt.x < 0.6) {
      const shiftFactor = pt.x < 0.25 ? 0.008 : -0.005
      pt.y += shiftFactor
    }
  }
  return result
}

function makeThinTrailingEdge(profile: FoilProfile): FoilProfile {
  const result = cloneProfile(profile)
  for (const pt of result.upper) {
    if (pt.x > 0.75) pt.y *= 0.7
  }
  for (const pt of result.lower) {
    if (pt.x > 0.75) pt.y *= 0.7
  }
  return result
}

function makeIncreaseLERadius(profile: FoilProfile): FoilProfile {
  const result = cloneProfile(profile)
  for (const pt of result.upper) {
    if (pt.x > 0 && pt.x < 0.15) pt.y *= 1.15
  }
  for (const pt of result.lower) {
    if (pt.x > 0 && pt.x < 0.15) pt.y *= 1.15
  }
  return result
}

function makeReduceThickness(profile: FoilProfile): FoilProfile {
  const result = cloneProfile(profile)
  for (const pt of result.upper) { pt.y *= 0.9 }
  for (const pt of result.lower) { pt.y *= 0.9 }
  return result
}

function makeIncreaseThickness(profile: FoilProfile): FoilProfile {
  const result = cloneProfile(profile)
  for (const pt of result.upper) { pt.y *= 1.1 }
  for (const pt of result.lower) { pt.y *= 1.1 }
  return result
}

interface Rule {
  id: string
  title: string
  description: string
  riderDescription: string
  applicableGoals: OptimizationGoal[]
  isApplicable: (profile: FoilProfile, analysis: AnalysisResult) => boolean
  impact: (profile: FoilProfile, analysis: AnalysisResult) => 'high' | 'medium' | 'low'
  applyFn: (profile: FoilProfile) => FoilProfile
}

const rules: Rule[] = [
  {
    id: 'increase-camber',
    title: 'Increase camber at 30% chord',
    description: 'Shift max camber up by ~1% to increase lift coefficient.',
    riderDescription: 'Make it easier to get up on foil and ride in lighter wind.',
    applicableGoals: ['max-lift', 'early-takeoff'],
    isApplicable: (p) => computeMaxCamber(p) < 0.06,
    impact: () => 'high',
    applyFn: makeIncreaseCamber,
  },
  {
    id: 'decrease-camber',
    title: 'Reduce camber',
    description: 'Decrease camber by ~0.8% to reduce pressure drag.',
    riderDescription: 'Trade some easy takeoff for more top-end speed.',
    applicableGoals: ['min-drag', 'max-ld'],
    isApplicable: (p) => computeMaxCamber(p) > 0.02,
    impact: () => 'medium',
    applyFn: makeDecreaseCamber,
  },
  {
    id: 'move-camber-forward',
    title: 'Move max camber forward',
    description: 'Redistribute camber toward LE for better L/D at moderate AoA.',
    riderDescription: 'Improve efficiency in normal riding conditions.',
    applicableGoals: ['max-ld'],
    isApplicable: () => true,
    impact: () => 'high',
    applyFn: makeMoveCamberForward,
  },
  {
    id: 'thin-trailing-edge',
    title: 'Thin trailing edge',
    description: 'Reduce TE thickness to decrease pressure drag.',
    riderDescription: 'A thinner trailing edge means less drag at speed.',
    applicableGoals: ['min-drag', 'max-ld'],
    isApplicable: (p) => {
      const lastUpper = p.upper[p.upper.length - 2]?.y ?? 0
      const lastLower = p.lower[p.lower.length - 2]?.y ?? 0
      return Math.abs(lastUpper - lastLower) > 0.01
    },
    impact: () => 'medium',
    applyFn: makeThinTrailingEdge,
  },
  {
    id: 'increase-le-radius',
    title: 'Increase leading edge radius',
    description: 'Smoother LE improves stall behavior and stability at high AoA.',
    riderDescription: 'More forgiving when you hit choppy water or gusts.',
    applicableGoals: ['stability', 'early-takeoff'],
    isApplicable: () => true,
    impact: () => 'medium',
    applyFn: makeIncreaseLERadius,
  },
  {
    id: 'reduce-thickness',
    title: 'Reduce overall thickness',
    description: 'Scale thickness down 10% to reduce form drag.',
    riderDescription: 'Go faster with less resistance through the water.',
    applicableGoals: ['min-drag'],
    isApplicable: (p) => computeThicknessRatio(p) > 0.10,
    impact: () => 'medium',
    applyFn: makeReduceThickness,
  },
  {
    id: 'increase-thickness',
    title: 'Increase overall thickness',
    description: 'Scale thickness up 10% for better structural margin and stability.',
    riderDescription: 'More stability and a more forgiving ride feel.',
    applicableGoals: ['stability'],
    isApplicable: (p) => computeThicknessRatio(p) < 0.15,
    impact: () => 'low',
    applyFn: makeIncreaseThickness,
  },
]

export function generateSuggestions(
  profile: FoilProfile,
  analysis: AnalysisResult,
  goal: OptimizationGoal,
): Suggestion[] {
  return rules
    .filter(r => r.applicableGoals.includes(goal) && r.isApplicable(profile, analysis))
    .map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      riderDescription: r.riderDescription,
      impact: r.impact(profile, analysis),
      goal,
      apply: (p: FoilProfile) => r.applyFn(p),
    }))
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.impact] - order[b.impact]
    })
}
