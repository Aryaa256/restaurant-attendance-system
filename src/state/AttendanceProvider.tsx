import { createContext, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type PropsWithChildren } from 'react'
import { activeBreak, defaultCheckOut, validateBreaks } from '../domain/attendance'
import { loadState, saveState } from '../data/storage'
import { createSeedState } from '../data/seed'
import type { AttendanceRecord, AttendanceSnapshot, AttendanceState, CorrectionRequest, Employee, LeaveRequest, MutationResult, RestaurantSettings, ShiftAssignment, ShiftTemplate } from '../domain/types'
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

const timestamp = (value: string) => Date.parse(value)
const validTimestamp = (value: string) => Number.isFinite(timestamp(value))

function result(state: AttendanceState, action: AttendanceAction['type'], ok: boolean, message: string): AttendanceState {
  const lastMutation: MutationResult = { ok, action, message }
  return { ...state, lastMutation }
}

function audit(state: AttendanceState, entityType: AttendanceState['auditEvents'][number]['entityType'], entityId: string, action: AttendanceAction['type'], at: string, summary: string): AttendanceState {
  const audited = { ...state, auditEvents: [...state.auditEvents, { id: `audit-${Date.parse(at)}-${state.auditEvents.length + 1}`, entityType, entityId, action, at, actor: 'Demo manager' as const, summary }] }
  return result(audited, action, true, summary)
}

function fail(state: AttendanceState, action: AttendanceAction['type'], message: string) {
  return result(state, action, false, message)
}

function replaceRecord(state: AttendanceState, record: AttendanceRecord) {
  return { ...state, attendanceRecords: state.attendanceRecords.map((item) => item.id === record.id ? record : item) }
}

function snapshot(record: AttendanceRecord): AttendanceSnapshot {
  return { checkInAt: record.checkInAt, checkOutAt: record.checkOutAt, breaks: record.breaks, managerNote: record.managerNote }
}

function validateSnapshot(proposed: AttendanceSnapshot, now: string): string | null {
  if (!validTimestamp(proposed.checkInAt) || (proposed.checkOutAt !== null && !validTimestamp(proposed.checkOutAt))) return 'Check-in and check-out must be valid timestamps.'
  if (proposed.checkOutAt && timestamp(proposed.checkOutAt) < timestamp(proposed.checkInAt)) return 'Check-out must follow check-in.'
  return validateBreaks({ id: 'proposed', employeeId: 'proposed', workDate: '2000-01-01', ...proposed }, now)
}

function hasLeaveOverlap(state: AttendanceState, request: LeaveRequest) {
  return state.leaveRequests.some((item) => item.id !== request.id && item.employeeId === request.employeeId && item.status !== 'rejected' && item.startDate <= request.endDate && request.startDate <= item.endDate)
}

function assignmentConflict(state: AttendanceState, assignment: ShiftAssignment) {
  return state.assignments.some((item) => {
    if (item.id === assignment.id || item.employeeId !== assignment.employeeId) return false
    if (item.workDate === assignment.workDate && (item.kind === 'weekly-off' || assignment.kind === 'weekly-off')) return true
    return item.kind === 'shift' && assignment.kind === 'shift' && item.startAt && item.endAt && assignment.startAt && assignment.endAt && timestamp(item.startAt) < timestamp(assignment.endAt) && timestamp(assignment.startAt) < timestamp(item.endAt)
  })
}

function validateCorrection(state: AttendanceState, request: CorrectionRequest): string | null {
  if (request.status !== 'pending') return 'New correction requests must be pending.'
  if (!state.employees.some((employee) => employee.id === request.employeeId)) return 'The correction employee no longer exists.'
  if (!request.reason.trim()) return 'A correction reason is required.'
  if (state.correctionRequests.some((item) => item.id === request.id)) return 'A correction with this ID already exists.'
  if (state.correctionRequests.some((item) => item.employeeId === request.employeeId && item.workDate === request.workDate && item.status === 'pending')) return 'A pending correction already exists for this employee and date.'
  const source = request.attendanceRecordId ? state.attendanceRecords.find((item) => item.id === request.attendanceRecordId) : undefined
  if (request.attendanceRecordId && (!source || source.employeeId !== request.employeeId || source.workDate !== request.workDate)) return 'The correction source record does not match its employee and work date.'
  if (source && (!request.original || JSON.stringify(snapshot(source)) !== JSON.stringify(request.original))) return 'The correction is stale; review the current attendance record first.'
  if (!source && request.original !== null) return 'A correction without a source record cannot include an original snapshot.'
  if (!source && state.attendanceRecords.some((item) => item.employeeId === request.employeeId && item.workDate === request.workDate)) return 'Attendance already exists for this employee and date.'
  return validateSnapshot(request.proposed, request.submittedAt)
}

export function attendanceReducer(state: AttendanceState, action: AttendanceAction): AttendanceState {
  switch (action.type) {
    case 'CHECK_IN': {
      if (!state.employees.some((employee) => employee.id === action.employeeId)) return fail(state, action.type, 'Select a valid employee.')
      if (!validTimestamp(action.at)) return fail(state, action.type, 'Check-in time is invalid.')
      if (timestamp(action.at) > Date.now() + 60_000) return fail(state, action.type, 'Check-in cannot be in the future.')
      if (state.attendanceRecords.some((record) => record.employeeId === action.employeeId && (record.workDate === action.workDate || record.checkOutAt === null))) return fail(state, action.type, 'This employee already has attendance for the date or an open session.')
      const id = `att-manual-${action.employeeId}-${timestamp(action.at)}`
      const record: AttendanceRecord = { id, employeeId: action.employeeId, assignmentId: action.assignmentId, workDate: action.workDate, checkInAt: action.at, checkOutAt: null, breaks: [], managerNote: action.note ?? '' }
      return audit({ ...state, attendanceRecords: [...state.attendanceRecords, record] }, 'attendance', id, action.type, action.at, 'Manual check-in recorded.')
    }
    case 'CHECK_OUT': {
      const record = state.attendanceRecords.find((item) => item.id === action.attendanceId)
      if (!record) return fail(state, action.type, 'Attendance record was not found.')
      if (record.checkOutAt) return fail(state, action.type, 'This attendance session is already checked out.')
      if (!validTimestamp(action.at) || timestamp(action.at) < timestamp(record.checkInAt)) return fail(state, action.type, 'Check-out must follow check-in.')
      const updated = defaultCheckOut(record, action.at)
      const error = validateBreaks(updated, action.at)
      return error ? fail(state, action.type, error) : audit(replaceRecord(state, updated), 'attendance', record.id, action.type, action.at, 'Check-out recorded.')
    }
    case 'START_BREAK': {
      const record = state.attendanceRecords.find((item) => item.id === action.attendanceId)
      if (!record || record.checkOutAt) return fail(state, action.type, 'An open attendance session is required to start a break.')
      if (activeBreak(record)) return fail(state, action.type, 'End the current break before starting another.')
      if (!validTimestamp(action.at) || timestamp(action.at) < timestamp(record.checkInAt)) return fail(state, action.type, 'Break start must follow check-in.')
      const updated = { ...record, breaks: [...record.breaks, { id: `break-${record.id}-${timestamp(action.at)}`, startAt: action.at, endAt: null }] }
      return audit(replaceRecord(state, updated), 'attendance', record.id, action.type, action.at, 'Break started.')
    }
    case 'END_BREAK': {
      const record = state.attendanceRecords.find((item) => item.id === action.attendanceId)
      const open = activeBreak(record)
      if (!record || !open) return fail(state, action.type, 'No open break was found.')
      if (!validTimestamp(action.at) || timestamp(action.at) < timestamp(open.startAt)) return fail(state, action.type, 'Break end must follow break start.')
      const updated = { ...record, breaks: record.breaks.map((item) => item.id === open.id ? { ...item, endAt: action.at } : item) }
      return audit(replaceRecord(state, updated), 'attendance', record.id, action.type, action.at, 'Break ended.')
    }
    case 'CREATE_LEAVE': {
      const { request } = action
      if (!state.employees.some((employee) => employee.id === request.employeeId)) return fail(state, action.type, 'Select a valid employee.')
      if (request.status !== 'pending' || !request.reason.trim() || request.startDate > request.endDate || (request.duration === 'half-day' && request.startDate !== request.endDate)) return fail(state, action.type, 'Enter a valid leave request and reason.')
      if (state.leaveRequests.some((item) => item.id === request.id) || hasLeaveOverlap(state, request)) return fail(state, action.type, 'This leave request overlaps an existing request.')
      return audit({ ...state, leaveRequests: [...state.leaveRequests, request] }, 'leave', request.id, action.type, request.submittedAt, 'Leave request submitted.')
    }
    case 'DECIDE_LEAVE': {
      const request = state.leaveRequests.find((item) => item.id === action.leaveId)
      if (!request || request.status !== 'pending') return fail(state, action.type, 'This leave request is no longer pending.')
      if (!validTimestamp(action.at) || (action.decision === 'rejected' && !action.note.trim())) return fail(state, action.type, 'A valid decision time and rejection note are required.')
      if (action.decision === 'approved' && state.attendanceRecords.some((record) => record.employeeId === request.employeeId && record.workDate >= request.startDate && record.workDate <= request.endDate)) return fail(state, action.type, 'Attendance exists for this leave period; correct it before approval.')
      const leaveRequests = state.leaveRequests.map((item) => item.id === request.id ? { ...item, status: action.decision, decisionNote: action.note, decidedAt: action.at } : item)
      return audit({ ...state, leaveRequests }, 'leave', request.id, action.type, action.at, `Leave request ${action.decision}.`)
    }
    case 'CREATE_CORRECTION': {
      const error = validateCorrection(state, action.request)
      return error ? fail(state, action.type, error) : audit({ ...state, correctionRequests: [...state.correctionRequests, action.request] }, 'correction', action.request.id, action.type, action.request.submittedAt, 'Correction request submitted.')
    }
    case 'DECIDE_CORRECTION': {
      const request = state.correctionRequests.find((item) => item.id === action.correctionId)
      if (!request || request.status !== 'pending') return fail(state, action.type, 'This correction request is no longer pending.')
      if (!validTimestamp(action.at) || (action.decision === 'rejected' && !action.note.trim())) return fail(state, action.type, 'A valid decision time and rejection note are required.')
      let next = { ...state, correctionRequests: state.correctionRequests.map((item) => item.id === request.id ? { ...item, status: action.decision, decisionNote: action.note, decidedAt: action.at } : item) }
      if (action.decision === 'approved') {
        const source = request.attendanceRecordId ? next.attendanceRecords.find((record) => record.id === request.attendanceRecordId) : undefined
        const error = validateSnapshot(request.proposed, action.at)
        if (error) return fail(state, action.type, error)
        if (source) {
          if (!request.original || JSON.stringify(snapshot(source)) !== JSON.stringify(request.original)) return fail(state, action.type, 'The correction is stale; review the current attendance record first.')
          next = replaceRecord(next, { ...source, ...request.proposed })
        } else {
          if (next.attendanceRecords.some((record) => record.employeeId === request.employeeId && record.workDate === request.workDate)) return fail(state, action.type, 'Attendance now exists for this employee and date.')
          const assignment = next.assignments.find((item) => item.employeeId === request.employeeId && item.workDate === request.workDate && item.kind === 'shift')
          next = { ...next, attendanceRecords: [...next.attendanceRecords, { id: `att-correction-${request.id}`, employeeId: request.employeeId, assignmentId: assignment?.id, workDate: request.workDate, ...request.proposed }] }
        }
      }
      return audit(next, 'correction', request.id, action.type, action.at, `Correction request ${action.decision}.`)
    }
    case 'UPSERT_EMPLOYEE': {
      const conflict = state.employees.some((employee) => employee.employeeCode === action.employee.employeeCode && employee.id !== action.employee.id)
      if (conflict) return fail(state, action.type, 'Employee codes must be unique.')
      const exists = state.employees.some((employee) => employee.id === action.employee.id)
      const employees = exists ? state.employees.map((employee) => employee.id === action.employee.id ? action.employee : employee) : [...state.employees, action.employee]
      return audit({ ...state, employees }, 'employee', action.employee.id, action.type, DEMO_NOW, `Employee ${exists ? 'updated' : 'created'}.`)
    }
    case 'UPSERT_SHIFT_TEMPLATE': {
      const exists = state.shiftTemplates.some((template) => template.id === action.template.id)
      const shiftTemplates = exists ? state.shiftTemplates.map((template) => template.id === action.template.id ? action.template : template) : [...state.shiftTemplates, action.template]
      return audit({ ...state, shiftTemplates }, 'assignment', action.template.id, action.type, DEMO_NOW, 'Shift template saved.')
    }
    case 'UPSERT_ASSIGNMENT': {
      if (!state.employees.some((employee) => employee.id === action.assignment.employeeId)) return fail(state, action.type, 'Select a valid employee.')
      if (action.assignment.kind === 'shift' && (!action.assignment.startAt || !action.assignment.endAt || !validTimestamp(action.assignment.startAt) || !validTimestamp(action.assignment.endAt) || timestamp(action.assignment.endAt) <= timestamp(action.assignment.startAt))) return fail(state, action.type, 'Shift times must form a valid interval.')
      if (assignmentConflict(state, action.assignment)) return fail(state, action.type, 'A shift and weekly off cannot coexist or overlap for one employee.')
      const exists = state.assignments.some((item) => item.id === action.assignment.id)
      const assignments = exists ? state.assignments.map((item) => item.id === action.assignment.id ? action.assignment : item) : [...state.assignments, action.assignment]
      return audit({ ...state, assignments }, 'assignment', action.assignment.id, action.type, DEMO_NOW, 'Roster assignment saved.')
    }
    case 'UPDATE_SETTINGS':
      if (action.settings.lateGraceMinutes < 0 || action.settings.defaultOvertimeThresholdMinutes < 0) return fail(state, action.type, 'Attendance thresholds cannot be negative.')
      return audit({ ...state, restaurant: action.settings }, 'settings', action.settings.id, action.type, DEMO_NOW, 'Attendance settings updated.')
    case 'RESET_DEMO': return result(createSeedState(), action.type, true, 'Demo data restored.')
    default: return state
  }
}

interface AttendanceContextValue { state: AttendanceState; dispatch: Dispatch<AttendanceAction>; storageWarning?: string; lastMutation?: MutationResult }
const AttendanceContext = createContext<AttendanceContextValue | null>(null)

export function AttendanceProvider({ children }: PropsWithChildren) {
  const initial = useMemo(() => loadState(), [])
  const [state, dispatch] = useReducer(attendanceReducer, initial.state)
  const [storageWarning, setStorageWarning] = useState(initial.warning)
  useEffect(() => {
    const saved = saveState(state)
    if (saved.warning) setStorageWarning(saved.warning)
    else setStorageWarning((warning) => warning?.startsWith('Changes could not be saved') ? undefined : warning)
  }, [state])
  return <AttendanceContext.Provider value={{ state, dispatch, storageWarning, lastMutation: state.lastMutation }}>{children}</AttendanceContext.Provider>
}

export function useAttendance() {
  const context = useContext(AttendanceContext)
  if (!context) throw new Error('useAttendance must be used within AttendanceProvider')
  return context
}

export { snapshot }
