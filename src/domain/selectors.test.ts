import { describe, expect, it } from 'vitest'
import { createSeedState } from '../data/seed'
import { DEMO_NOW } from '../lib/dateTime'
import { getAttendanceStatus } from './attendance'
import { assignmentFor, filterAttendanceRecords, selectDashboardMetrics, selectEmployeeReport, selectLiveAttendance } from './selectors'

describe('attendance selectors', () => {
  it('reconciles today’s live dashboard totals from one seed dataset', () => {
    const state = createSeedState()
    const metrics = selectDashboardMetrics(state, '2026-10-02', '2026-10-02T10:30:00+05:30')
    expect(metrics.scheduled).toBeGreaterThan(metrics.showedUp)
    expect(metrics.currentlyWorking + metrics.onBreak).toBe(metrics.onSite)
    expect(metrics.onBreak).toBe(1)
  })

  it('applies AND-across / OR-within filter dimensions', () => {
    const state = createSeedState()
    const rows = filterAttendanceRecords(state, { startDate: '2026-09-01', endDate: '2026-09-30', departments: ['Kitchen'], statuses: ['late', 'overtime'] }, '2026-10-02T10:30:00+05:30')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((record) => state.employees.find((employee) => employee.id === record.employeeId)?.department === 'Kitchen')).toBe(true)
  })

  it('excludes full-day approved leave from an employee’s attendance denominator', () => {
    const state = createSeedState()
    const report = selectEmployeeReport(state, 'emp-12', '2026-09-16', '2026-09-17', '2026-10-02T10:30:00+05:30')!
    expect(report.leaveDays).toBe(2)
    expect(report.expectedDays).toBe(0)
    expect(report.attendanceRate).toBeNull()
  })

  it('counts half-day attendance as a half expected and attended day', () => {
    const state = createSeedState()
    const report = selectEmployeeReport(state, 'emp-10', '2026-09-24', '2026-09-24', DEMO_NOW)!
    expect(report.expectedDays).toBe(1)
    expect(report.attendedDays).toBe(0.5)
    expect(report.attendanceRate).toBe(50)
  })

  it('exposes the seeded half-day, unscheduled check-in, and overnight session', () => {
    const state = createSeedState()
    const halfDay = state.attendanceRecords.find((record) => record.id === 'att-emp-10-2026-09-24')!
    expect(getAttendanceStatus({ record: halfDay, assignment: assignmentFor(state, halfDay.employeeId, halfDay.workDate), settings: state.restaurant, now: DEMO_NOW }).outcome).toBe('half-day')
    const unscheduled = state.attendanceRecords.find((record) => record.id === 'att-emp-24-2026-10-02')!
    expect(getAttendanceStatus({ record: unscheduled, settings: state.restaurant, now: DEMO_NOW }).flags).toContain('unscheduled')
    expect(selectLiveAttendance(state, '2026-10-02', DEMO_NOW).some((row) => row.record?.id === 'att-emp-05-2026-10-01')).toBe(true)
  })

  it('keeps unscheduled records separate from the scheduled status filter', () => {
    const state = createSeedState()
    const unscheduled = filterAttendanceRecords(state, { startDate: '2026-10-02', endDate: '2026-10-02', statuses: ['unscheduled'] }, DEMO_NOW)
    const scheduled = filterAttendanceRecords(state, { startDate: '2026-10-02', endDate: '2026-10-02', statuses: ['scheduled'] }, DEMO_NOW)
    expect(unscheduled.map((record) => record.id)).toContain('att-emp-24-2026-10-02')
    expect(scheduled.map((record) => record.id)).not.toContain('att-emp-24-2026-10-02')
  })
})
