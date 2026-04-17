// Epley 公式: 1RM = weight × (1 + reps / 30)
export function calcRM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 100) / 100
}

export function displayWeight(weightKg: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? kgToLbs(weightKg) : weightKg
}

export function inputToKg(value: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? lbsToKg(value) : value
}
