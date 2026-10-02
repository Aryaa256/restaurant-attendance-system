import type { AttendanceState } from '../domain/types'
import { SCHEMA_VERSION, createSeedState } from './seed'

export const STORAGE_KEY = 'tava-attendance-demo:v1'
export interface StorageResult { persisted: boolean; warning?: string }

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

export function saveState(state: AttendanceState): StorageResult {
  try {
    // localStorage writes are atomic: on failure the previously saved value remains intact.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return { persisted: true }
  } catch {
    return { persisted: false, warning: 'Changes could not be saved. Your last saved demo data is still available.' }
  }
}
export function clearSavedState(): boolean {
  try { window.localStorage.removeItem(STORAGE_KEY); return true } catch { return false }
}
