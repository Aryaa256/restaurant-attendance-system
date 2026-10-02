import type { AttendanceRecord, AttendanceState, Department, Employee, LeaveRequest, ShiftTemplate } from '../domain/types'
import { addDays, atRestaurantTime, datesBetween, DEMO_NOW, weekday } from '../lib/dateTime'

export const SCHEMA_VERSION = 1
export const SEED_DATE = '2026-10-02'

const people: Array<[string, string, Department, string, string, string]> = [
  ['Aarav Sharma', 'K101', 'Kitchen', 'Executive Chef', 'opening', '#A75B45'], ['Meera Nair', 'S201', 'Service', 'Floor Manager', 'lunch', '#667849'],
  ['Imran Khan', 'K102', 'Kitchen', 'Sous Chef', 'dinner', '#87664D'], ['Kavya Rao', 'S202', 'Service', 'Captain', 'dinner', '#A56B4C'],
  ["Joseph D'Souza", 'B301', 'Bar', 'Bartender', 'closing', '#536D76'], ['Ananya Iyer', 'K103', 'Kitchen', 'Pastry Chef', 'opening', '#9B6E8D'],
  ['Rohan Mehta', 'S203', 'Service', 'Senior Waiter', 'lunch', '#73804C'], ['Priya Menon', 'S204', 'Service', 'Waiter', 'lunch', '#B35C48'],
  ['Vikram Singh', 'K104', 'Kitchen', 'Line Cook', 'dinner', '#526D70'], ['Nisha Patel', 'H401', 'Housekeeping', 'Steward', 'opening', '#997254'],
  ['Sana Sheikh', 'C501', 'Operations', 'Cashier', 'lunch', '#A06078'], ['Dev Malhotra', 'S205', 'Service', 'Waiter', 'dinner', '#637A51'],
  ['Farah Ali', 'K105', 'Kitchen', 'Commis Chef', 'opening', '#AA624F'], ['Arjun Kapoor', 'S206', 'Service', 'Captain', 'dinner', '#637189'],
  ['Leela Thomas', 'H402', 'Housekeeping', 'Housekeeping Lead', 'opening', '#9C794B'], ['Manish Gupta', 'O601', 'Operations', 'Storekeeper', 'opening', '#637B67'],
  ['Pooja Desai', 'K106', 'Kitchen', 'Commis Chef', 'lunch', '#AF6254'], ['Rahul Verma', 'S207', 'Service', 'Waiter', 'dinner', '#657A4F'],
  ['Zoya Siddiqui', 'B302', 'Bar', 'Barback', 'closing', '#7B6A90'], ['Aditya Bose', 'K107', 'Kitchen', 'Tandoor Chef', 'dinner', '#A2673F'],
  ['Neha Kulkarni', 'S208', 'Service', 'Host', 'lunch', '#7C7A52'], ['Suresh Pillai', 'H403', 'Housekeeping', 'Steward', 'opening', '#826A52'],
  ['Isha Bhat', 'O602', 'Operations', 'Accounts Assistant', 'lunch', '#806A95'], ['Sameer Chawla', 'M701', 'Management', 'Restaurant Manager', 'lunch', '#586A58'],
]

const shiftTemplates: ShiftTemplate[] = [
  { id: 'opening', name: 'Opening & Prep', startTime: '07:00', endTime: '16:00', endsNextDay: false, plannedBreakMinutes: 45 },
  { id: 'lunch', name: 'Lunch Service', startTime: '10:00', endTime: '19:00', endsNextDay: false, plannedBreakMinutes: 45 },
  { id: 'dinner', name: 'Dinner Service', startTime: '14:00', endTime: '23:00', endsNextDay: false, plannedBreakMinutes: 45 },
  { id: 'closing', name: 'Closing Crew', startTime: '17:00', endTime: '02:00', endsNextDay: true, plannedBreakMinutes: 45 },
  { id: 'private-event', name: 'Private Event Close', startTime: '23:00', endTime: '11:00', endsNextDay: true, plannedBreakMinutes: 60 },
]

function initials(name: string) { return name.split(' ').map((part) => part[0]).join('').replace("'", '').slice(0, 2).toUpperCase() }

const employees: Employee[] = people.map(([name, code, department, role, shift, color], index) => ({
  id: `emp-${String(index + 1).padStart(2, '0')}`, employeeCode: code, name, initials: initials(name), avatarColor: color, department, role,
  employmentStatus: 'active', joiningDate: addDays('2023-01-15', index * 31), phone: `+91 98${String(10000000 + index * 731).slice(0, 8)}`,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/\.$/, '')}@tava-demo.example`, defaultShiftTemplateId: shift,
}))

const leaveRequests: LeaveRequest[] = [
  { id: 'leave-001', employeeId: 'emp-06', type: 'annual', startDate: '2026-10-02', endDate: '2026-10-03', duration: 'full-day', reason: 'Family celebration', status: 'approved', decisionNote: 'Roster updated.', submittedAt: '2026-09-20T08:30:00+05:30', decidedAt: '2026-09-20T10:00:00+05:30' },
  { id: 'leave-002', employeeId: 'emp-12', type: 'sick', startDate: '2026-09-16', endDate: '2026-09-17', duration: 'full-day', reason: 'Medical rest', status: 'approved', decisionNote: 'Take care.', submittedAt: '2026-09-15T18:00:00+05:30', decidedAt: '2026-09-15T19:00:00+05:30' },
  { id: 'leave-003', employeeId: 'emp-18', type: 'casual', startDate: '2026-10-08', endDate: '2026-10-08', duration: 'half-day', reason: 'Personal appointment', status: 'pending', decisionNote: '', submittedAt: '2026-10-01T14:00:00+05:30', decidedAt: null },
  { id: 'leave-004', employeeId: 'emp-03', type: 'annual', startDate: '2026-08-24', endDate: '2026-08-26', duration: 'full-day', reason: 'Travel', status: 'approved', decisionNote: 'Approved.', submittedAt: '2026-08-10T10:00:00+05:30', decidedAt: '2026-08-11T09:00:00+05:30' },
]

function templateFor(id: string) { return shiftTemplates.find((template) => template.id === id)! }
function isFullDayLeave(employeeId: string, date: string) { return leaveRequests.some((leave) => leave.employeeId === employeeId && leave.status === 'approved' && leave.duration === 'full-day' && leave.startDate <= date && leave.endDate >= date) }

export function createSeedState(): AttendanceState {
  const assignments: AttendanceState['assignments'] = []
  const attendanceRecords: AttendanceRecord[] = []
  const allDates = datesBetween('2026-08-01', '2026-11-15')
  for (const date of allDates) {
    employees.forEach((employee, index) => {
      const weeklyOff = weekday(date) === (index % 6 === 0 ? 1 : 0)
      if (weeklyOff) { assignments.push({ id: `off-${employee.id}-${date}`, employeeId: employee.id, workDate: date, plannedBreakMinutes: 0, kind: 'weekly-off' }); return }
      const template = templateFor(employee.defaultShiftTemplateId)
      const endDate = template.endsNextDay ? addDays(date, 1) : date
      const assignment = { id: `shift-${employee.id}-${date}`, employeeId: employee.id, shiftTemplateId: template.id, workDate: date, startAt: atRestaurantTime(date, template.startTime), endAt: atRestaurantTime(endDate, template.endTime), plannedBreakMinutes: template.plannedBreakMinutes, kind: 'shift' as const }
      assignments.push(assignment)
      if (date >= SEED_DATE || isFullDayLeave(employee.id, date) || (index + Number(date.slice(-2))) % 17 === 0) return
      const late = (index + Number(date.slice(-2))) % 11 === 0 ? 14 : 0
      const checkInAt = new Date(new Date(assignment.startAt).getTime() + late * 60_000).toISOString()
      const overtime = (index + Number(date.slice(-2))) % 14 === 0 ? 75 : 0
      const checkOutAt = new Date(new Date(assignment.endAt!).getTime() + overtime * 60_000).toISOString()
      attendanceRecords.push({ id: `att-${employee.id}-${date}`, employeeId: employee.id, assignmentId: assignment.id, workDate: date, checkInAt, checkOutAt, breaks: [{ id: `break-${employee.id}-${date}`, startAt: new Date(new Date(checkInAt).getTime() + 4 * 60 * 60_000).toISOString(), endAt: new Date(new Date(checkInAt).getTime() + (4 * 60 + 45) * 60_000).toISOString() }], managerNote: late ? 'Traffic delay noted.' : '' })
    })
  }
  // Today is intentionally bounded by DEMO_NOW: no fabricated future attendance.
  const todayAssignments = assignments.filter((item) => item.workDate === SEED_DATE && item.kind === 'shift' && item.startAt && Date.parse(item.startAt) <= Date.parse(DEMO_NOW) && item.employeeId !== 'emp-06')
  todayAssignments.slice(0, 3).forEach((assignment, index) => {
    const checkInAt = assignment.startAt!
    const checkOutAt = index === 2 ? '2026-10-02T10:20:00+05:30' : null
    attendanceRecords.push({ id: `att-${assignment.employeeId}-${SEED_DATE}`, employeeId: assignment.employeeId, assignmentId: assignment.id, workDate: SEED_DATE, checkInAt, checkOutAt, breaks: index === 1 ? [{ id: `break-${assignment.employeeId}-${SEED_DATE}`, startAt: '2026-10-02T10:15:00+05:30', endAt: null }] : [], managerNote: '' })
  })
  // An unscheduled early arrival is deliberately retained as an exception, not silently treated as absence.
  const unscheduledAssignment = assignments.find((item) => item.employeeId === 'emp-24' && item.workDate === SEED_DATE && item.kind === 'shift')!
  assignments.splice(assignments.indexOf(unscheduledAssignment), 1)
  attendanceRecords.push({ id: `att-emp-24-${SEED_DATE}`, employeeId: 'emp-24', workDate: SEED_DATE, checkInAt: '2026-10-02T09:45:00+05:30', checkOutAt: null, breaks: [], managerNote: 'Arrived early to support breakfast prep.' })
  // A completed half-day exists in history for reports and profile status coverage.
  const halfDayAssignment = assignments.find((item) => item.employeeId === 'emp-10' && item.workDate === '2026-09-24' && item.kind === 'shift')!
  const historicalIndex = attendanceRecords.findIndex((record) => record.employeeId === 'emp-10' && record.workDate === '2026-09-24')
  const halfDayRecord: AttendanceRecord = { id: `att-emp-10-2026-09-24`, employeeId: 'emp-10', assignmentId: halfDayAssignment.id, workDate: '2026-09-24', checkInAt: '2026-09-24T07:00:00+05:30', checkOutAt: '2026-09-24T10:30:00+05:30', breaks: [{ id: 'break-emp-10-2026-09-24', startAt: '2026-09-24T08:30:00+05:30', endAt: '2026-09-24T09:00:00+05:30' }], managerNote: 'Left after a medical appointment.' }
  if (historicalIndex >= 0) attendanceRecords[historicalIndex] = halfDayRecord
  else attendanceRecords.push(halfDayRecord)
  // A pre-booked private event runs across midnight and remains open during the demo morning.
  const overnightAssignment = assignments.find((item) => item.employeeId === 'emp-05' && item.workDate === '2026-10-01' && item.kind === 'shift')!
  overnightAssignment.shiftTemplateId = 'private-event'
  overnightAssignment.startAt = '2026-10-01T23:00:00+05:30'
  overnightAssignment.endAt = '2026-10-02T11:00:00+05:30'
  overnightAssignment.plannedBreakMinutes = 60
  const overnightIndex = attendanceRecords.findIndex((record) => record.employeeId === 'emp-05' && record.workDate === '2026-10-01')
  const overnightRecord: AttendanceRecord = { id: 'att-emp-05-2026-10-01', employeeId: 'emp-05', assignmentId: overnightAssignment.id, workDate: '2026-10-01', checkInAt: '2026-10-01T23:00:00+05:30', checkOutAt: null, breaks: [{ id: 'break-emp-05-2026-10-01', startAt: '2026-10-02T03:15:00+05:30', endAt: '2026-10-02T04:15:00+05:30' }], managerNote: 'Assigned to the overnight private event close.' }
  if (overnightIndex >= 0) attendanceRecords[overnightIndex] = overnightRecord
  else attendanceRecords.push(overnightRecord)
  const correctionTarget = attendanceRecords.find((record) => record.workDate === '2026-09-29')!
  return {
    schemaVersion: SCHEMA_VERSION, seededDate: SEED_DATE,
    restaurant: { id: 'tava-kadai', name: 'Tava Kadai', timezone: 'Asia/Kolkata', weekStartsOn: 1, lateGraceMinutes: 5, defaultOvertimeThresholdMinutes: 30 },
    employees, shiftTemplates, assignments, attendanceRecords, leaveRequests,
    correctionRequests: [{ id: 'correction-001', employeeId: correctionTarget.employeeId, attendanceRecordId: correctionTarget.id, workDate: correctionTarget.workDate, original: { checkInAt: correctionTarget.checkInAt, checkOutAt: correctionTarget.checkOutAt, breaks: correctionTarget.breaks, managerNote: correctionTarget.managerNote }, proposed: { checkInAt: correctionTarget.checkInAt, checkOutAt: correctionTarget.checkOutAt, breaks: correctionTarget.breaks, managerNote: 'Requested correction: scanner was offline.' }, reason: 'Scanner did not record a normal entry.', status: 'pending', decisionNote: '', submittedAt: '2026-09-30T11:00:00+05:30', decidedAt: null }],
    auditEvents: [{ id: 'audit-seed', entityType: 'settings', entityId: 'tava-kadai', action: 'seeded', at: '2026-10-02T08:00:00+05:30', actor: 'Demo manager', summary: 'Loaded deterministic restaurant demo data.' }],
  }
}

export const seedState = createSeedState()
