import type { FoilProfile, AnalysisResult } from '../types/foil'
import { discretizeProfile } from './useFoilGeometry'

/**
 * Hess-Smith panel method for inviscid, incompressible flow around an airfoil.
 *
 * Steps:
 *   1. Discretize airfoil into N panels
 *   2. Compute panel geometry (midpoints, lengths, normals, tangents, angles)
 *   3. Build influence coefficient matrices (source + vortex)
 *   4. Assemble (N+1)×(N+1) linear system: N no-penetration eqs + Kutta condition
 *   5. Solve via Gaussian elimination with partial pivoting
 *   6. Compute tangential velocities, Cp, CL, CD
 */

interface Panel {
  x1: number; y1: number
  x2: number; y2: number
  midX: number; midY: number
  len: number
  sinB: number; cosB: number
  beta: number  // panel angle from positive x-axis
  nx: number; ny: number  // outward normal
  tx: number; ty: number  // tangent
}

function buildPanels(nodes: Array<{ x: number; y: number }>): Panel[] {
  const panels: Panel[] = []
  for (let i = 0; i < nodes.length - 1; i++) {
    const x1 = nodes[i].x, y1 = nodes[i].y
    const x2 = nodes[i + 1].x, y2 = nodes[i + 1].y
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    const cosB = dx / len
    const sinB = dy / len
    const beta = Math.atan2(dy, dx)

    panels.push({
      x1, y1, x2, y2,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2,
      len,
      sinB, cosB,
      beta,
      // Outward normal: for counterclockwise traversal (standard convention),
      // outward normal points to the LEFT of the panel direction.
      // If panel direction is (cosB, sinB), left normal is (-sinB, cosB).
      nx: -sinB,
      ny: cosB,
      tx: cosB,
      ty: sinB,
    })
  }
  return panels
}

/**
 * Compute the velocity influence of a constant-strength source (sigma=1) and
 * constant-strength vortex (gamma=1) on panel j, evaluated at the control
 * point of panel i.
 *
 * Returns: { sn, st, vn, vt }
 *   sn, st = source contribution projected onto panel i's normal and tangent
 *   vn, vt = vortex contribution projected onto panel i's normal and tangent
 */
function influence(pi: Panel, pj: Panel): { sn: number; st: number; vn: number; vt: number } {
  // Transform control point of panel i into panel j's local frame
  const dxc = pi.midX - pj.x1
  const dyc = pi.midY - pj.y1

  // Rotate into panel j's local coordinate system
  const x0 = dxc * pj.cosB + dyc * pj.sinB
  const y0 = -dxc * pj.sinB + dyc * pj.cosB

  const sj = pj.len  // panel j length

  // Distances from the two endpoints in local coords
  const r1sq = x0 * x0 + y0 * y0
  const r2sq = (x0 - sj) * (x0 - sj) + y0 * y0

  // Angles
  const theta1 = Math.atan2(y0, x0)
  const theta2 = Math.atan2(y0, x0 - sj)

  const dtheta = theta2 - theta1
  const logr = 0.5 * Math.log(r2sq / r1sq)

  // Source panel local velocities (per unit sigma, in panel j's frame)
  // u_s = (1/2pi) * ln(r1/r2) = -(1/2pi) * logr
  // v_s = (1/2pi) * (theta2 - theta1)
  const uSource = -(1 / (2 * Math.PI)) * logr
  const vSource = (1 / (2 * Math.PI)) * dtheta

  // Vortex panel local velocities (per unit gamma, in panel j's frame)
  // u_v = (1/2pi) * (theta2 - theta1)
  // v_v = (1/2pi) * ln(r2/r1) = (1/2pi) * logr
  const uVortex = (1 / (2 * Math.PI)) * dtheta
  const vVortex = (1 / (2 * Math.PI)) * logr

  // Rotate source velocity back to global frame
  const uSg = uSource * pj.cosB - vSource * pj.sinB
  const vSg = uSource * pj.sinB + vSource * pj.cosB

  // Rotate vortex velocity back to global frame
  const uVg = uVortex * pj.cosB - vVortex * pj.sinB
  const vVg = uVortex * pj.sinB + vVortex * pj.cosB

  // Project onto panel i's normal and tangent
  const sn = uSg * pi.nx + vSg * pi.ny
  const st = uSg * pi.tx + vSg * pi.ty
  const vn = uVg * pi.nx + vVg * pi.ny
  const vt = uVg * pi.tx + vVg * pi.ty

  return { sn, st, vn, vt }
}

/**
 * Solve a linear system Ax = b using Gaussian elimination with partial pivoting.
 * Modifies A and b in place.
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length
  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxVal = Math.abs(A[col][col])
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > maxVal) {
        maxVal = Math.abs(A[row][col])
        maxRow = row
      }
    }
    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]]
      ;[b[col], b[maxRow]] = [b[maxRow], b[col]]
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = A[row][col] / A[col][col]
      for (let j = col; j < n; j++) {
        A[row][j] -= factor * A[col][j]
      }
      b[row] -= factor * b[col]
    }
  }

  // Back substitution
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i]
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * x[j]
    }
    x[i] = sum / A[i][i]
  }
  return x
}

export function solvePanelMethod(
  profile: FoilProfile,
  aoaDegrees: number,
  numPanels: number = 100,
): AnalysisResult {
  const alphaRad = aoaDegrees * Math.PI / 180
  const cosA = Math.cos(alphaRad)
  const sinA = Math.sin(alphaRad)

  // 1. Discretize — discretizeProfile returns clockwise order (upper TE→LE, lower LE→TE).
  // Reverse to get counterclockwise order (lower TE→LE, upper LE→TE), which is the standard
  // convention for Hess-Smith: outward normal to the LEFT of traversal direction.
  const nodes = discretizeProfile(profile, numPanels).reverse()
  const N = nodes.length - 1  // number of panels

  // 2. Build panels
  const panels = buildPanels(nodes)

  // 3. Build influence coefficient matrices
  // An[i][j] = source j influence on panel i's normal velocity
  // At[i][j] = source j influence on panel i's tangential velocity
  // Bn[i]    = sum of vortex j influences on panel i's normal velocity (single gamma)
  // Bt[i]    = sum of vortex j influences on panel i's tangential velocity (single gamma)

  const An: number[][] = Array.from({ length: N }, () => new Array(N).fill(0))
  const At: number[][] = Array.from({ length: N }, () => new Array(N).fill(0))
  const Bn: number[] = new Array(N).fill(0)
  const Bt: number[] = new Array(N).fill(0)

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        // Self-influence: source normal = 0.5, vortex tangent = 0.5
        An[i][j] = 0.5
        Bt[i] += 0.5
      } else {
        const inf = influence(panels[i], panels[j])
        An[i][j] = inf.sn
        At[i][j] = inf.st
        Bn[i] += inf.vn
        Bt[i] += inf.vt
      }
    }
  }

  // 4. Assemble (N+1)×(N+1) system
  // Unknowns: [sigma_0, sigma_1, ..., sigma_{N-1}, gamma]
  // Equations:
  //   i = 0..N-1: sum_j An[i][j]*sigma_j + Bn[i]*gamma = -V_inf . n_i
  //   i = N (Kutta): tangential velocity at panel 0 + tangential velocity at panel N-1 = 0

  const M = N + 1
  const A: number[][] = Array.from({ length: M }, () => new Array(M).fill(0))
  const rhs: number[] = new Array(M).fill(0)

  // No-penetration equations
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      A[i][j] = An[i][j]
    }
    A[i][N] = Bn[i]
    // RHS = -V_inf dot n_i
    rhs[i] = -(cosA * panels[i].nx + sinA * panels[i].ny)
  }

  // Kutta condition: V_t(panel 0) + V_t(panel N-1) = 0
  // V_t(i) = sum_j At[i][j]*sigma_j + Bt[i]*gamma + V_inf . t_i
  // So: sum_j (At[0][j] + At[N-1][j])*sigma_j + (Bt[0]+Bt[N-1])*gamma = -(V_inf.t_0 + V_inf.t_{N-1})
  for (let j = 0; j < N; j++) {
    A[N][j] = At[0][j] + At[N - 1][j]
  }
  A[N][N] = Bt[0] + Bt[N - 1]
  rhs[N] = -(cosA * panels[0].tx + sinA * panels[0].ty
           + cosA * panels[N - 1].tx + sinA * panels[N - 1].ty)

  // 5. Solve
  const solution = gaussianElimination(A, rhs)
  const sigma = solution.slice(0, N)
  const gamma = solution[N]

  // 6. Compute tangential velocities and Cp
  const Vt: number[] = new Array(N).fill(0)
  const Cp: number[] = new Array(N).fill(0)

  for (let i = 0; i < N; i++) {
    let vt = cosA * panels[i].tx + sinA * panels[i].ty
    for (let j = 0; j < N; j++) {
      vt += At[i][j] * sigma[j]
    }
    vt += Bt[i] * gamma
    Vt[i] = vt
    Cp[i] = 1 - vt * vt
  }

  // 7. Compute CL and CD from pressure integration
  // Force coefficients: integrate Cp * panel_length * normal components
  // CL = force perpendicular to freestream (positive up for positive AoA)
  // CD = force along freestream
  let cx = 0  // force coefficient in x-direction (global)
  let cy = 0  // force coefficient in y-direction (global)

  for (let i = 0; i < N; i++) {
    // Pressure force on panel i acts inward (opposite to outward normal)
    // dF = -Cp * dl * n_hat
    cx -= Cp[i] * panels[i].len * panels[i].nx
    cy -= Cp[i] * panels[i].len * panels[i].ny
  }

  // Rotate to lift/drag frame
  // CL = cy*cos(alpha) - cx*sin(alpha)  (perpendicular to freestream)
  // CD = cx*cos(alpha) + cy*sin(alpha)   (along freestream)
  const cl = cy * cosA - cx * sinA
  const cd = cx * cosA + cy * sinA

  // 8. Split Cp into upper and lower
  // After reversing, the order is: lower TE→LE, then upper LE→TE.
  // Use midY to determine: positive midY = upper surface, negative = lower.
  // Near the leading edge, use panel index to break ties.
  const cpUpper: Array<{ x: number; cp: number }> = []
  const cpLower: Array<{ x: number; cp: number }> = []

  for (let i = 0; i < N; i++) {
    const entry = { x: panels[i].midX, cp: Cp[i] }
    if (panels[i].midY > 0) {
      cpUpper.push(entry)
    } else {
      cpLower.push(entry)
    }
  }

  // Sort by x for nice plotting
  cpUpper.sort((a, b) => a.x - b.x)
  cpLower.sort((a, b) => a.x - b.x)

  const converged = Math.abs(cl) < 10 && isFinite(cl) && isFinite(cd)
  const ld = cd !== 0 ? cl / cd : 0

  return {
    cl,
    cd,
    ld,
    aoa: aoaDegrees,
    cpUpper,
    cpLower,
    converged,
  }
}
