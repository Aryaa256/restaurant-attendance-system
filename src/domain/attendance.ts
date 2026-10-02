import type { AttendanceMetrics, AttendanceRecord, AttendanceStatus, LeaveRequest, RestaurantSettings, ShiftAssignment } from './types'
import { addMinutes, minutesBetween } from '../lib/dateTime'

export function validateBreaks(record: AttendanceRecord, now: string): string | null {
  const intervalEnd = record.checkOutAt ?? now
  const ordered = [...record.breaks].sort((a, b) => a.startAt.localeCompare(b.startAt))
  if (record.breaks.filter((item) => item.endAt === null).length > 1) return 'Only one break can be open.'
  for (let index = 0; index < ordered.length; index += 1) {
    const item = ordered[index]
    const end = item.endAt ?? intervalEnd
    if (Date.parse(item.startAt) < Date.parse(record.checkInAt) || Date.parse(end) > Date.parse(intervalEnd) || Date.parse(end) < Date.parse(item.startAt)) return 'Breaks must fall within the attendance interval.'
    if (index > 0 && ordered[index - 1].endAt !== null && Date.parse(item.startAt) < Date.parse(ordered[index - 1].endAt!)) return 'Breaks cannot overlap.'
  }
  return null
}

export function getAttendanceMetrics(record: AttendanceRecord | undefined, assignment: ShiftAssignment | undefined, settings: RestaurantSettings, now: string): AttendanceMetrics {
  if (!record) return { elapsedMinutes: 0, breakMinutes: 0, netWorkMinutes: 0, plannedNetMinutes: assignment?.startAt && assignment.endAt ? minutesBetween(assignment.startAt, assignment.endAt) - assignment.plannedBreakMinutes : null, lateMinutes: 0, overtimeMinutes: 0 }
  const end = record.checkOutAt ?? now
  const elapsedMinutes = minutesBetween(record.checkInAt, end)
  const breakMinutes = record.breaks.reduce((total, item) => total + minutesBetween(item.startAt, item.endAt ?? end), 0)
  const netWorkMinutes = Math.max(0, elapsedMinutes - breakMinutes)
  const plannedNetMinutes = assignment?.startAt && assignment.endAt ? Math.max(0, minutesBetween(assignment.startAt, assignment.endAt) - assignment.plannedBreakMinutes) : null
  const lateMinutes = assignment?.startAt ? Math.max(0, minutesBetween(assignment.startAt, record.checkInAt) - settings.lateGraceMinutes) : 0
  const overtimeMinutes = plannedNetMinutes === null ? 0 : Math.max(0, netWorkMinutes - plannedNetMinutes - settings.defaultOvertimeThresholdMinutes)
  return { elapsedMinutes, breakMinutes, netWorkMinutes, plannedNetMinutes, lateMinutes, overtimeMinutes }
}

export function activeBreak(record: AttendanceRecord | undefined) {
  return record?.breaks.find((item) => item.endAt === null)
}

export function isApprovedLeaveForDate(requests: LeaveRequest[], employeeId: string, date: string) {
  return requests.find((request) => request.employeeId === employeeId && request.status === 'approved' && request.startDate <= date && request.endDate >= date)
}

export function getAttendanceStatus(args: { record?: AttendanceRecord; assignment?: ShiftAssignment; leave?: LeaveRequest; settings: RestaurantSettings; now: string }): AttendanceStatus {
  const { record, assignment, leave, settings, now } = args
  if (leave?.duration === 'full-day') return { outcome: 'on-leave', flags: [], label: 'On Leave', detail: leave.type }
  if (assignment?.kind === 'weekly-off') return { outcome: 'weekly-off', flags: [], label: 'Weekly Off' }
  if (!assignment && !record) return { outcome: 'scheduled', flags: [], label: 'Not scheduled' }
  if (!record) {
    if (assignment?.startAt && Date.parse(now) < Date.parse(assignment.startAt)) return { outcome: 'scheduled', flags: [], label: 'Scheduled' }
    if (assignment?.endAt && Date.parse(now) > Date.parse(assignment.endAt)) return { outcome: 'absent', flags: [], label: 'Absent' }
    return { outcome: 'awaiting-check-in', flags: [], label: 'Awaiting check-in' }
  }
  const metrics = getAttendanceMetrics(record, assignment, settings, now)
  const flags: AttendanceStatus['flags'] = []
  if (!assignment) flags.push('unscheduled')
  if (metrics.lateMinutes > 0) flags.push('late')
  if (metrics.overtimeMinutes > 0) flags.push('overtime')
  if (activeBreak(record)) flags.push('on-break')
  const isHalfDay = Boolean(record.checkOutAt && metrics.plannedNetMinutes && metrics.netWorkMinutes > 0 && metrics.netWorkMinutes <= metrics.plannedNetMinutes / 2)
  if (leave?.duration === 'half-day' || isHalfDay) return { outcome: 'half-day', flags, label: 'Half Day', detail: leave ? 'Approved half-day leave' : undefined }
  return { outcome: 'present', flags, label: 'Present' }
}

export function defaultCheckOut(record: AttendanceRecord, now: string): AttendanceRecord {
  const openBreak = activeBreak(record)
  return { ...record, checkOutAt: now, breaks: openBreak ? record.breaks.map((item) => item.id === openBreak.id ? { ...item, endAt: now } : item) : record.breaks }
}

export function expectedOvertimeEnd(assignment: ShiftAssignment, settings: RestaurantSettings): string | null {
  if (!assignment.endAt) return null
  return addMinutes(assignment.endAt, assignment.plannedBreakMinutes + settings.defaultOvertimeThresholdMinutes)
}
