import type { AttendanceState } from '../domain/types'
import { SCHEMA_VERSION, createSeedState } from './seed'

export const STORAGE_KEY = 'tava-attendance-demo:v1'

function isState(value: unknown): value is AttendanceState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AttendanceState>
  return candidate.schemaVersion === SCHEMA_VERSION && Boolean(candidate.restaurant) && Array.isArray(candidate.employees) && Array.isArray(candidate.assignments) && Array.isArray(candidate.attendanceRecords) && Array.isArray(candidate.leaveRequests) && Array.isArray(candidate.correctionRequests) && Array.isArray(candidate.auditEvents)
}

export function loadState(): { state: AttendanceState; persisted: boolean; warning?: string } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: createSeedState(), persisted: true }
    const parsed: unknown = JSON.parse(raw)
    if (isState(parsed)) return { state: parsed, persisted: true }
    window.localStorage.removeItem(STORAGE_KEY)
    return { state: createSeedState(), persisted: true, warning: 'Saved demo data was incompatible and has been reset.' }
  } catch {
    return { state: createSeedState(), persisted: false, warning: 'Browser storage is unavailable. Changes will only last for this visit.' }
  }
}

export function saveState(state: AttendanceState): boolean {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true } catch { return false }
}
export function clearSavedState(): boolean {
  try { window.localStorage.removeItem(STORAGE_KEY); return true } catch { return false }
}
