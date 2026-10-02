import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type PropsWithChildren } from 'react'
import { activeBreak, defaultCheckOut, validateBreaks } from '../domain/attendance'
import { clearSavedState, loadState, saveState } from '../data/storage'
import { createSeedState } from '../data/seed'
import type { AttendanceRecord, AttendanceSnapshot, AttendanceState, CorrectionRequest, Employee, LeaveRequest, RestaurantSettings, ShiftAssignment, ShiftTemplate } from '../domain/types'
import { DEMO_NOW } from '../lib/dateTime'

export type AttendanceAction =
  | { type: 'CHECK_IN'; employeeId: string; workDate: string; assignmentId?: string; at: string; note?: string }
  | { type: 'CHECK_OUT'; attendanceId: string; at: string }
  | { type: 'START_BREAK'; attendanceId: string; at: string }
  | { type: 'END_BREAK'; attendanceId: string; at: string }
  | { type: 'CREATE_LEAVE'; request: LeaveRequest }
  | { type: 'DECIDE_LEAVE'; leaveId: string; decision: 'approved' | 'rejected'; note: string; at: string }
  | { type: 'CREATE_CORRECTION'; request: CorrectionRequest }
  | { type: 'DECIDE_CORRECTION'; correctionId: string; decision: 'approved' | 'rejected'; note: string; at: string }
  | { type: 'UPSERT_EMPLOYEE'; employee: Employee }
  | { type: 'UPSERT_SHIFT_TEMPLATE'; template: ShiftTemplate }
  | { type: 'UPSERT_ASSIGNMENT'; assignment: ShiftAssignment }
  | { type: 'UPDATE_SETTINGS'; settings: RestaurantSettings }
  | { type: 'RESET_DEMO' }

function audit(state: AttendanceState, entityType: AttendanceState['auditEvents'][number]['entityType'], entityId: string, action: string, at: string, summary: string): AttendanceState {
  return { ...state, auditEvents: [...state.auditEvents, { id: `audit-${Date.parse(at)}-${state.auditEvents.length + 1}`, entityType, entityId, action, at, actor: 'Demo manager', summary }] }
}

function replaceRecord(state: AttendanceState, record: AttendanceRecord) {
  return { ...state, attendanceRecords: state.attendanceRecords.map((item) => item.id === record.id ? record : item) }
}

function snapshot(record: AttendanceRecord): AttendanceSnapshot {
  return { checkInAt: record.checkInAt, checkOutAt: record.checkOutAt, breaks: record.breaks, managerNote: record.managerNote }
}

export function attendanceReducer(state: AttendanceState, action: AttendanceAction): AttendanceState {
  switch (action.type) {
    case 'CHECK_IN': {
      if (state.attendanceRecords.some((record) => record.employeeId === action.employeeId && (record.workDate === action.workDate || record.checkOutAt === null))) return state
      const id = `att-manual-${Date.parse(action.at)}`
      const record: AttendanceRecord = { id, employeeId: action.employeeId, assignmentId: action.assignmentId, workDate: action.workDate, checkInAt: action.at, checkOutAt: null, breaks: [], managerNote: action.note ?? '' }
      return audit({ ...state, attendanceRecords: [...state.attendanceRecords, record] }, 'attendance', id, 'checked-in', action.at, 'Manual check-in recorded.')
    }
    case 'CHECK_OUT': {
      const record = state.attendanceRecords.find((item) => item.id === action.attendanceId)
      if (!record || record.checkOutAt || Date.parse(action.at) < Date.parse(record.checkInAt)) return state
      const updated = defaultCheckOut(record, action.at)
      const error = validateBreaks(updated, action.at)
      return error ? state : audit(replaceRecord(state, updated), 'attendance', record.id, 'checked-out', action.at, 'Check-out recorded.')
    }
    case 'START_BREAK': {
      const record = state.attendanceRecords.find((item) => item.id === action.attendanceId)
      if (!record || record.checkOutAt || activeBreak(record) || Date.parse(action.at) < Date.parse(record.checkInAt)) return state
      const updated = { ...record, breaks: [...record.breaks, { id: `break-${Date.parse(action.at)}`, startAt: action.at, endAt: null }] }
      return audit(replaceRecord(state, updated), 'attendance', record.id, 'break-started', action.at, 'Break started.')
    }
    case 'END_BREAK': {
      const record = state.attendanceRecords.find((item) => item.id === action.attendanceId)
      const open = activeBreak(record)
      if (!record || !open || Date.parse(action.at) < Date.parse(open.startAt)) return state
      const updated = { ...record, breaks: record.breaks.map((item) => item.id === open.id ? { ...item, endAt: action.at } : item) }
      return audit(replaceRecord(state, updated), 'attendance', record.id, 'break-ended', action.at, 'Break ended.')
    }
    case 'CREATE_LEAVE':
      if (action.request.startDate > action.request.endDate || state.leaveRequests.some((request) => request.employeeId === action.request.employeeId && request.status !== 'rejected' && request.startDate <= action.request.endDate && action.request.startDate <= request.endDate)) return state
      return audit({ ...state, leaveRequests: [...state.leaveRequests, action.request] }, 'leave', action.request.id, 'submitted', action.request.submittedAt, 'Leave request submitted.')
    case 'DECIDE_LEAVE': {
      const request = state.leaveRequests.find((item) => item.id === action.leaveId)
      if (!request || request.status !== 'pending' || (action.decision === 'rejected' && !action.note.trim())) return state
      if (action.decision === 'approved' && state.attendanceRecords.some((record) => record.employeeId === request.employeeId && record.workDate >= request.startDate && record.workDate <= request.endDate)) return state
      const leaveRequests = state.leaveRequests.map((item) => item.id === request.id ? { ...item, status: action.decision, decisionNote: action.note, decidedAt: action.at } : item)
      return audit({ ...state, leaveRequests }, 'leave', request.id, action.decision, action.at, `Leave request ${action.decision}.`)
    }
    case 'CREATE_CORRECTION':
      return audit({ ...state, correctionRequests: [...state.correctionRequests, action.request] }, 'correction', action.request.id, 'submitted', action.request.submittedAt, 'Correction request submitted.')
    case 'DECIDE_CORRECTION': {
      const request = state.correctionRequests.find((item) => item.id === action.correctionId)
      if (!request || request.status !== 'pending' || (action.decision === 'rejected' && !action.note.trim())) return state
      let next = { ...state, correctionRequests: state.correctionRequests.map((item) => item.id === request.id ? { ...item, status: action.decision, decisionNote: action.note, decidedAt: action.at } : item) }
      if (action.decision === 'approved' && request.attendanceRecordId) {
        const current = next.attendanceRecords.find((record) => record.id === request.attendanceRecordId)
        if (!current || !request.original || JSON.stringify(snapshot(current)) !== JSON.stringify(request.original) || validateBreaks({ ...current, ...request.proposed }, action.at)) return state
        next = replaceRecord(next, { ...current, ...request.proposed })
      }
      return audit(next, 'correction', request.id, action.decision, action.at, `Correction request ${action.decision}.`)
    }
    case 'UPSERT_EMPLOYEE': {
      const conflict = state.employees.some((employee) => employee.employeeCode === action.employee.employeeCode && employee.id !== action.employee.id)
      if (conflict) return state
      const exists = state.employees.some((employee) => employee.id === action.employee.id)
      const employees = exists ? state.employees.map((employee) => employee.id === action.employee.id ? action.employee : employee) : [...state.employees, action.employee]
      return audit({ ...state, employees }, 'employee', action.employee.id, exists ? 'updated' : 'created', DEMO_NOW, `Employee ${exists ? 'updated' : 'created'}.`)
    }
    case 'UPSERT_SHIFT_TEMPLATE': {
      const exists = state.shiftTemplates.some((template) => template.id === action.template.id)
      const shiftTemplates = exists ? state.shiftTemplates.map((template) => template.id === action.template.id ? action.template : template) : [...state.shiftTemplates, action.template]
      return audit({ ...state, shiftTemplates }, 'assignment', action.template.id, exists ? 'shift-updated' : 'shift-created', DEMO_NOW, 'Shift template saved.')
    }
    case 'UPSERT_ASSIGNMENT': {
      const overlapping = state.assignments.some((item) => item.id !== action.assignment.id && item.employeeId === action.assignment.employeeId && item.kind === 'shift' && action.assignment.kind === 'shift' && item.startAt && item.endAt && action.assignment.startAt && action.assignment.endAt && item.startAt < action.assignment.endAt && action.assignment.startAt < item.endAt)
      if (overlapping) return state
      const exists = state.assignments.some((item) => item.id === action.assignment.id)
      const assignments = exists ? state.assignments.map((item) => item.id === action.assignment.id ? action.assignment : item) : [...state.assignments, action.assignment]
      return audit({ ...state, assignments }, 'assignment', action.assignment.id, exists ? 'updated' : 'created', DEMO_NOW, 'Roster assignment saved.')
    }
    case 'UPDATE_SETTINGS':
      if (action.settings.lateGraceMinutes < 0 || action.settings.defaultOvertimeThresholdMinutes < 0) return state
      return audit({ ...state, restaurant: action.settings }, 'settings', action.settings.id, 'updated', DEMO_NOW, 'Attendance settings updated.')
    case 'RESET_DEMO': return createSeedState()
    default: return state
  }
}

interface AttendanceContextValue { state: AttendanceState; dispatch: Dispatch<AttendanceAction>; storageWarning?: string }
const AttendanceContext = createContext<AttendanceContextValue | null>(null)

export function AttendanceProvider({ children }: PropsWithChildren) {
  const initial = useMemo(() => loadState(), [])
  const [state, dispatch] = useReducer(attendanceReducer, initial.state)
  useEffect(() => { if (!saveState(state)) clearSavedState() }, [state])
  return <AttendanceContext.Provider value={{ state, dispatch, storageWarning: initial.warning }}>{children}</AttendanceContext.Provider>
}

export function useAttendance() {
  const context = useContext(AttendanceContext)
  if (!context) throw new Error('useAttendance must be used within AttendanceProvider')
  return context
}

export { snapshot }
