import { generateNACA4Digit } from './naca'
import type { FoilProfile } from '../types/foil'

export interface LibraryEntry {
  profile: FoilProfile
  category: 'windsurf' | 'kitefoil' | 'naca' | 'eppler'
  description: string
}

export const profileLibrary: LibraryEntry[] = [
  { profile: generateNACA4Digit('0012'), category: 'naca',      description: 'Symmetric — good for stabilizer/tail foils' },
  { profile: generateNACA4Digit('2412'), category: 'naca',      description: 'Light camber — balanced lift and drag' },
  { profile: generateNACA4Digit('4412'), category: 'naca',      description: 'High camber — high lift, forgiving' },
  { profile: generateNACA4Digit('6412'), category: 'windsurf',  description: 'Very high camber — easy takeoff, light wind' },
  { profile: generateNACA4Digit('2415'), category: 'windsurf',  description: 'Thick profile — structural, stable, lower speed' },
  { profile: generateNACA4Digit('2409'), category: 'kitefoil',  description: 'Thin profile — low drag, high speed' },
  { profile: generateNACA4Digit('1410'), category: 'kitefoil',  description: 'Low camber thin — fast, less forgiving' },
  { profile: generateNACA4Digit('4415'), category: 'windsurf',  description: 'Thick high-camber — maximum lift, beginner-friendly' },
]
