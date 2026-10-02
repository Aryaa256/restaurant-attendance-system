import { describe, expect, it } from 'vitest'
import { getAttendanceMetrics, getAttendanceStatus } from './attendance'
import type { AttendanceRecord, RestaurantSettings, ShiftAssignment } from './types'

const settings: RestaurantSettings = { id: 'test', name: 'Test', timezone: 'Asia/Kolkata', weekStartsOn: 1, lateGraceMinutes: 5, defaultOvertimeThresholdMinutes: 30 }
const assignment: ShiftAssignment = { id: 'shift', employeeId: 'employee', shiftTemplateId: 'lunch', workDate: '2026-10-02', startAt: '2026-10-02T10:00:00+05:30', endAt: '2026-10-02T19:00:00+05:30', plannedBreakMinutes: 45, kind: 'shift' }
const record = (patch: Partial<AttendanceRecord> = {}): AttendanceRecord => ({ id: 'record', employeeId: 'employee', assignmentId: 'shift', workDate: '2026-10-02', checkInAt: '2026-10-02T10:05:00+05:30', checkOutAt: '2026-10-02T19:20:00+05:30', breaks: [{ id: 'break', startAt: '2026-10-02T14:00:00+05:30', endAt: '2026-10-02T14:45:00+05:30' }], managerNote: '', ...patch })

describe('attendance rules', () => {
  it('subtracts breaks and applies late grace and overtime threshold', () => {
    const metrics = getAttendanceMetrics(record({ checkInAt: '2026-10-02T10:06:00+05:30', checkOutAt: '2026-10-02T20:30:00+05:30' }), assignment, settings, '2026-10-02T21:00:00+05:30')
    expect(metrics).toMatchObject({ breakMinutes: 45, netWorkMinutes: 579, lateMinutes: 1, overtimeMinutes: 54 })
  })
  it('keeps an active session present instead of half-day and labels its break', () => {
    const status = getAttendanceStatus({ record: record({ checkOutAt: null, breaks: [{ id: 'open', startAt: '2026-10-02T12:00:00+05:30', endAt: null }] }), assignment, settings, now: '2026-10-02T12:20:00+05:30' })
    expect(status.outcome).toBe('present'); expect(status.flags).toContain('on-break')
  })
  it('marks a missed completed shift absent but a future shift awaiting check-in', () => {
    expect(getAttendanceStatus({ assignment, settings, now: '2026-10-02T20:00:00+05:30' }).outcome).toBe('absent')
    expect(getAttendanceStatus({ assignment, settings, now: '2026-10-02T11:00:00+05:30' }).outcome).toBe('awaiting-check-in')
  })
  it('derives half-day for approved half-day leave without attendance', () => {
    const leave = { id: 'half', employeeId: 'employee', type: 'casual' as const, startDate: '2026-10-02', endDate: '2026-10-02', duration: 'half-day' as const, reason: 'Appointment', status: 'approved' as const, decisionNote: '', submittedAt: '2026-10-01T10:00:00+05:30', decidedAt: '2026-10-01T11:00:00+05:30' }
    expect(getAttendanceStatus({ assignment, leave, settings, now: '2026-10-02T20:00:00+05:30' })).toMatchObject({ outcome: 'half-day', detail: 'Approved half-day leave' })
  })
  it('uses a distinct not-scheduled outcome rather than scheduled', () => {
    expect(getAttendanceStatus({ settings, now: '2026-10-02T10:30:00+05:30' })).toMatchObject({ outcome: 'not-scheduled', label: 'Not scheduled' })
  })
})
