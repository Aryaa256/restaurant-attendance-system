import { describe, expect, it } from 'vitest'
import { createSeedState } from '../data/seed'
import { filterAttendanceRecords, selectDashboardMetrics, selectEmployeeReport } from './selectors'

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
})
