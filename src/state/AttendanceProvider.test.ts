import { describe, expect, it } from 'vitest'
import { createSeedState } from '../data/seed'
import { attendanceReducer } from './AttendanceProvider'

describe('attendance reducer', () => {
  it('tracks a complete check-in, break, and check-out workflow', () => {
    let state = createSeedState()
    const employeeId = 'emp-24'; const at = '2026-10-02T10:00:00+05:30'
    state = attendanceReducer(state, { type: 'CHECK_IN', employeeId, workDate: '2026-10-02', at })
    const id = state.attendanceRecords.at(-1)!.id
    state = attendanceReducer(state, { type: 'START_BREAK', attendanceId: id, at: '2026-10-02T12:00:00+05:30' })
    state = attendanceReducer(state, { type: 'END_BREAK', attendanceId: id, at: '2026-10-02T12:30:00+05:30' })
    state = attendanceReducer(state, { type: 'CHECK_OUT', attendanceId: id, at: '2026-10-02T18:00:00+05:30' })
    expect(state.attendanceRecords.find((record) => record.id === id)?.checkOutAt).toBe('2026-10-02T18:00:00+05:30')
  })
  it('does not decide a request twice', () => {
    let state = createSeedState()
    state = attendanceReducer(state, { type: 'DECIDE_LEAVE', leaveId: 'leave-003', decision: 'rejected', note: 'Insufficient cover.', at: '2026-10-02T11:00:00+05:30' })
    const again = attendanceReducer(state, { type: 'DECIDE_LEAVE', leaveId: 'leave-003', decision: 'approved', note: '', at: '2026-10-02T12:00:00+05:30' })
    expect(again.leaveRequests.find((leave) => leave.id === 'leave-003')?.status).toBe('rejected')
  })
})
