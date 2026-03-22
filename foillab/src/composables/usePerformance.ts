import type { AnalysisResult, FoilProfile, PerformanceSettings, RiderPerformance } from '../types/foil'
import { computeThicknessRatio, computeMaxCamber } from './useFoilGeometry'

const KTS_PER_MS = 1.94384

export function computeRiderPerformance(
  analysis: AnalysisResult,
  profile: FoilProfile,
  settings: PerformanceSettings,
): RiderPerformance {
  const rho = settings.waterType === 'salt' ? 1025 : 1000
  const S = settings.foilArea
  const W = settings.riderWeight * 9.81

  const cl = Math.max(analysis.cl, 0.1)
  const vMin = Math.sqrt((2 * W) / (rho * S * cl))
  const vMax = vMin * 2.5

  const speedRange: [number, number] = [vMin * KTS_PER_MS, vMax * KTS_PER_MS]
  const windRange: [number, number] = [speedRange[0] / 0.8, speedRange[1] / 0.5]
  const idealWeight: [number, number] = [settings.riderWeight * 0.85, settings.riderWeight * 1.15]

  const thickness = computeThicknessRatio(profile)
  const camber = computeMaxCamber(profile)
  const traits: string[] = []

  if (camber > 0.04) traits.push('early takeoff')
  else if (camber > 0.02) traits.push('balanced')
  else traits.push('speed-oriented')

  if (thickness > 0.14) traits.push('stable')
  else if (thickness < 0.10) traits.push('fast')

  if (analysis.ld > 50) traits.push('efficient')
  if (camber > 0.03) traits.push('forgiving')

  let stability: 'low' | 'medium' | 'high'
  if (thickness > 0.13 && camber > 0.03) stability = 'high'
  else if (thickness > 0.10 || camber > 0.02) stability = 'medium'
  else stability = 'low'

  return { speedRange, windRange, idealWeight, character: traits.join(', '), stability }
}
