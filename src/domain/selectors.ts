import { getAttendanceMetrics, getAttendanceStatus, isApprovedLeaveForDate } from './attendance'
import type { AttendanceFilters, AttendanceRecord, AttendanceState, DashboardMetrics, EmployeeReport, LocalDate } from './types'
import { datesBetween, isDateInRange } from '../lib/dateTime'

export const assignmentFor = (state: AttendanceState, employeeId: string, date: LocalDate) => state.assignments.find((item) => item.employeeId === employeeId && item.workDate === date)
export const recordFor = (state: AttendanceState, employeeId: string, date: LocalDate) => state.attendanceRecords.find((item) => item.employeeId === employeeId && item.workDate === date)

export function attendanceRows(state: AttendanceState, date: LocalDate, now: string) {
  return state.employees.filter((employee) => employee.employmentStatus === 'active').map((employee) => {
    const assignment = assignmentFor(state, employee.id, date)
    const record = recordFor(state, employee.id, date)
    const leave = isApprovedLeaveForDate(state.leaveRequests, employee.id, date)
    const status = getAttendanceStatus({ assignment, record, leave, settings: state.restaurant, now })
    return { employee, assignment, record, leave, status, metrics: getAttendanceMetrics(record, assignment, state.restaurant, now) }
  })
}

/** Open sessions include an overnight shift started on the previous work date. */
export function selectLiveAttendance(state: AttendanceState, date: LocalDate, now: string) {
  const currentRows = attendanceRows(state, date, now)
  const openOvernight = state.attendanceRecords
    .filter((record) => record.workDate < date && record.checkOutAt === null)
    .map((record) => {
      const employee = state.employees.find((item) => item.id === record.employeeId)!
      const assignment = state.assignments.find((item) => item.id === record.assignmentId)
      const leave = isApprovedLeaveForDate(state.leaveRequests, employee.id, record.workDate)
      return { employee, assignment, record, leave, status: getAttendanceStatus({ record, assignment, leave, settings: state.restaurant, now }), metrics: getAttendanceMetrics(record, assignment, state.restaurant, now) }
    })
  return [...currentRows.filter((row) => row.record), ...openOvernight]
}

export function selectDashboardMetrics(state: AttendanceState, date: LocalDate, now: string): DashboardMetrics {
  const rows = attendanceRows(state, date, now)
  const scheduled = rows.filter((row) => row.assignment?.kind === 'shift' && row.leave?.duration !== 'full-day').length
  const showedUp = rows.filter((row) => Boolean(row.record)).length
  const onBreak = rows.filter((row) => row.status.flags.includes('on-break')).length
  const currentlyWorking = rows.filter((row) => row.record && !row.record.checkOutAt && !row.status.flags.includes('on-break')).length
  return { scheduled, showedUp, currentlyWorking, onBreak, onSite: currentlyWorking + onBreak, absent: rows.filter((row) => row.status.outcome === 'absent').length, onLeave: rows.filter((row) => row.status.outcome === 'on-leave').length, late: rows.filter((row) => row.status.flags.includes('late')).length, overtime: rows.filter((row) => row.status.flags.includes('overtime')).length }
}

export function filterAttendanceRecords(state: AttendanceState, filters: AttendanceFilters, now: string): AttendanceRecord[] {
  const start = filters.startDate ?? '0000-01-01'
  const end = filters.endDate ?? '9999-12-31'
  const query = filters.search?.trim().toLowerCase()
  return state.attendanceRecords.filter((record) => {
    if (!isDateInRange(record.workDate, start, end)) return false
    const employee = state.employees.find((item) => item.id === record.employeeId)
    if (!employee) return false
    if (filters.employeeIds?.length && !filters.employeeIds.includes(employee.id)) return false
    if (filters.departments?.length && !filters.departments.includes(employee.department)) return false
    if (filters.roles?.length && !filters.roles.includes(employee.role)) return false
    const assignment = assignmentFor(state, employee.id, record.workDate)
    if (filters.shiftTemplateIds?.length && (!assignment?.shiftTemplateId || !filters.shiftTemplateIds.includes(assignment.shiftTemplateId))) return false
    if (query && !`${employee.name} ${employee.employeeCode}`.toLowerCase().includes(query)) return false
    if (filters.statuses?.length) {
      const status = getAttendanceStatus({ record, assignment, leave: isApprovedLeaveForDate(state.leaveRequests, employee.id, record.workDate), settings: state.restaurant, now })
      if (!filters.statuses.some((item) => item === status.outcome || status.flags.includes(item as never))) return false
    }
    return true
  })
}

export function selectEmployeeReport(state: AttendanceState, employeeId: string, start: LocalDate, end: LocalDate, now: string): EmployeeReport | undefined {
  const employee = state.employees.find((item) => item.id === employeeId)
  if (!employee) return undefined
  let expectedDays = 0; let attendedDays = 0; let lateArrivals = 0; let netWorkMinutes = 0; let overtimeMinutes = 0; let leaveDays = 0
  for (const date of datesBetween(start, end)) {
    const assignment = assignmentFor(state, employeeId, date)
    const record = recordFor(state, employeeId, date)
    const leave = isApprovedLeaveForDate(state.leaveRequests, employeeId, date)
    if (leave?.duration === 'full-day') { leaveDays += 1; continue }
    if (assignment?.kind === 'shift') expectedDays += 1
    if (record) {
      attendedDays += 1
      const metrics = getAttendanceMetrics(record, assignment, state.restaurant, now)
      netWorkMinutes += metrics.netWorkMinutes; overtimeMinutes += metrics.overtimeMinutes
      if (metrics.lateMinutes > 0) lateArrivals += 1
    }
  }
  return { employee, expectedDays, attendedDays, attendanceRate: expectedDays ? (attendedDays / expectedDays) * 100 : null, lateArrivals, netWorkMinutes, overtimeMinutes, leaveDays }
}

export function selectReportRows(state: AttendanceState, start: LocalDate, end: LocalDate, now: string): EmployeeReport[] {
  return state.employees.filter((employee) => employee.employmentStatus === 'active').map((employee) => selectEmployeeReport(state, employee.id, start, end, now)!).filter(Boolean)
}
