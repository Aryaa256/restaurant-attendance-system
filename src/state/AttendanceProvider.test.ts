import { describe, expect, it } from 'vitest'
import { createSeedState } from '../data/seed'
import type { CorrectionRequest, LeaveRequest, ShiftAssignment } from '../domain/types'
import { attendanceReducer } from './AttendanceProvider'

const at = '2026-10-02T10:00:00+05:30'

function pendingLeave(patch: Partial<LeaveRequest> = {}): LeaveRequest {
  return { id: 'leave-new', employeeId: 'emp-15', type: 'casual', startDate: '2026-10-10', endDate: '2026-10-10', duration: 'full-day', reason: 'Personal day', status: 'pending', decisionNote: '', submittedAt: at, decidedAt: null, ...patch }
}

describe('attendance reducer', () => {
  it('tracks a complete check-in, break, and check-out workflow', () => {
    let state = createSeedState()
    state = attendanceReducer(state, { type: 'CHECK_IN', employeeId: 'emp-15', workDate: '2026-10-02', at })
    const id = state.attendanceRecords.at(-1)!.id
    state = attendanceReducer(state, { type: 'START_BREAK', attendanceId: id, at: '2026-10-02T10:05:00+05:30' })
    state = attendanceReducer(state, { type: 'END_BREAK', attendanceId: id, at: '2026-10-02T10:10:00+05:30' })
    state = attendanceReducer(state, { type: 'CHECK_OUT', attendanceId: id, at: '2026-10-02T10:20:00+05:30' })
    expect(state.attendanceRecords.find((record) => record.id === id)?.checkOutAt).toBe('2026-10-02T10:20:00+05:30')
    expect(state.lastMutation).toMatchObject({ ok: true, action: 'CHECK_OUT' })
  })

  it('creates unique manual IDs and returns an actionable validation failure', () => {
    let state = createSeedState()
    state = attendanceReducer(state, { type: 'CHECK_IN', employeeId: 'emp-15', workDate: '2026-10-02', at })
    state = attendanceReducer(state, { type: 'CHECK_IN', employeeId: 'emp-16', workDate: '2026-10-02', at })
    const [first, second] = state.attendanceRecords.slice(-2)
    expect(first.id).not.toBe(second.id)
    state = attendanceReducer(state, { type: 'CHECK_OUT', attendanceId: second.id, at: '2026-10-02T09:59:00+05:30' })
    expect(state.lastMutation).toMatchObject({ ok: false, message: 'Check-out must follow check-in.' })
  })

  it('rejects manual check-ins at or after the injected demo clock', () => {
    const state = attendanceReducer(createSeedState(), { type: 'CHECK_IN', employeeId: 'emp-15', workDate: '2099-10-02', at: '2099-10-02T10:30:00+05:30' })
    expect(state.lastMutation).toMatchObject({ ok: false, message: 'Check-in cannot be in the future.' })
    expect(state.attendanceRecords.some((record) => record.employeeId === 'emp-15' && record.workDate === '2026-10-02')).toBe(false)
  })

  it('prevents weekly off and shift coexistence using numeric timestamp overlap checks', () => {
    let state = createSeedState()
    const weeklyOff: ShiftAssignment = { id: 'off-conflict', employeeId: 'emp-15', workDate: '2026-10-03', kind: 'weekly-off', plannedBreakMinutes: 0 }
    state = attendanceReducer(state, { type: 'UPSERT_ASSIGNMENT', assignment: weeklyOff })
    const shift: ShiftAssignment = { id: 'shift-conflict', employeeId: 'emp-15', workDate: '2026-10-03', kind: 'shift', shiftTemplateId: 'opening', startAt: '2026-10-03T07:00:00+05:30', endAt: '2026-10-03T16:00:00+05:30', plannedBreakMinutes: 45 }
    state = attendanceReducer(state, { type: 'UPSERT_ASSIGNMENT', assignment: shift })
    expect(state.assignments.some((item) => item.id === shift.id)).toBe(false)
    expect(state.lastMutation?.ok).toBe(false)
  })

  it('validates overlapping leave and stale correction requests before changing state', () => {
    let state = createSeedState()
    state = attendanceReducer(state, { type: 'CREATE_LEAVE', request: pendingLeave({ employeeId: 'emp-18', startDate: '2026-10-08', endDate: '2026-10-08' }) })
    expect(state.lastMutation?.ok).toBe(false)
    const source = state.attendanceRecords.find((record) => record.workDate === '2026-09-28' && record.id !== state.correctionRequests[0].attendanceRecordId)!
    const correction: CorrectionRequest = { id: 'bad-correction', employeeId: source.employeeId, attendanceRecordId: source.id, workDate: source.workDate, original: { checkInAt: '2026-09-29T00:00:00+05:30', checkOutAt: source.checkOutAt, breaks: source.breaks, managerNote: source.managerNote }, proposed: { checkInAt: source.checkInAt, checkOutAt: source.checkOutAt, breaks: source.breaks, managerNote: source.managerNote }, reason: 'Fix source.', status: 'pending', decisionNote: '', submittedAt: at, decidedAt: null }
    state = attendanceReducer(state, { type: 'CREATE_CORRECTION', request: correction })
    expect(state.lastMutation).toMatchObject({ ok: false, message: 'The correction is stale; review the current attendance record first.' })
  })

  it('applies a valid correction once and prevents a second decision', () => {
    let state = createSeedState()
    state = attendanceReducer(state, { type: 'DECIDE_CORRECTION', correctionId: 'correction-001', decision: 'approved', note: 'Verified against paper log.', at })
    expect(state.correctionRequests.find((request) => request.id === 'correction-001')?.status).toBe('approved')
    const again = attendanceReducer(state, { type: 'DECIDE_CORRECTION', correctionId: 'correction-001', decision: 'rejected', note: 'No.', at: '2026-10-02T10:05:00+05:30' })
    expect(again.lastMutation?.ok).toBe(false)
  })
})
