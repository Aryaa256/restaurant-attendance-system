export type LocalDate = string
export type IsoTimestamp = string

export type Department = 'Kitchen' | 'Service' | 'Bar' | 'Operations' | 'Housekeeping' | 'Management'
export type EmploymentStatus = 'active' | 'inactive'
export type LeaveType = 'annual' | 'sick' | 'casual' | 'unpaid'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type AttendanceOutcome = 'scheduled' | 'not-scheduled' | 'awaiting-check-in' | 'present' | 'absent' | 'on-leave' | 'weekly-off' | 'half-day'
export type AttendanceFlag = 'late' | 'overtime' | 'on-break' | 'unscheduled'

export interface RestaurantSettings {
  id: string
  name: string
  timezone: 'Asia/Kolkata'
  weekStartsOn: 0 | 1
  lateGraceMinutes: number
  defaultOvertimeThresholdMinutes: number
}

export interface Employee {
  id: string
  employeeCode: string
  name: string
  initials: string
  avatarColor: string
  department: Department
  role: string
  employmentStatus: EmploymentStatus
  joiningDate: LocalDate
  phone: string
  email: string
  defaultShiftTemplateId: string
}

export interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  endsNextDay: boolean
  plannedBreakMinutes: number
}

export interface ShiftAssignment {
  id: string
  employeeId: string
  shiftTemplateId?: string
  workDate: LocalDate
  startAt?: IsoTimestamp
  endAt?: IsoTimestamp
  plannedBreakMinutes: number
  kind: 'shift' | 'weekly-off'
}

export interface BreakInterval {
  id: string
  startAt: IsoTimestamp
  endAt: IsoTimestamp | null
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  assignmentId?: string
  workDate: LocalDate
  checkInAt: IsoTimestamp
  checkOutAt: IsoTimestamp | null
  breaks: BreakInterval[]
  managerNote: string
}

export interface LeaveRequest {
  id: string
  employeeId: string
  type: LeaveType
  startDate: LocalDate
  endDate: LocalDate
  duration: 'full-day' | 'half-day'
  reason: string
  status: RequestStatus
  decisionNote: string
  submittedAt: IsoTimestamp
  decidedAt: IsoTimestamp | null
}

export interface AttendanceSnapshot {
  checkInAt: IsoTimestamp
  checkOutAt: IsoTimestamp | null
  breaks: BreakInterval[]
  managerNote: string
}

export interface CorrectionRequest {
  id: string
  employeeId: string
  attendanceRecordId?: string
  workDate: LocalDate
  original: AttendanceSnapshot | null
  proposed: AttendanceSnapshot
  reason: string
  status: RequestStatus
  decisionNote: string
  submittedAt: IsoTimestamp
  decidedAt: IsoTimestamp | null
}

export interface AuditEvent {
  id: string
  entityType: 'attendance' | 'leave' | 'correction' | 'employee' | 'assignment' | 'settings'
  entityId: string
  action: string
  at: IsoTimestamp
  actor: 'Demo manager'
  summary: string
}

export interface MutationResult {
  ok: boolean
  action: string
  message: string
}

export interface AttendanceState {
  schemaVersion: number
  seededDate: LocalDate
  restaurant: RestaurantSettings
  employees: Employee[]
  shiftTemplates: ShiftTemplate[]
  assignments: ShiftAssignment[]
  attendanceRecords: AttendanceRecord[]
  leaveRequests: LeaveRequest[]
  correctionRequests: CorrectionRequest[]
  auditEvents: AuditEvent[]
  lastMutation?: MutationResult
}

export interface AttendanceStatus {
  outcome: AttendanceOutcome
  flags: AttendanceFlag[]
  label: string
  detail?: string
}

export interface AttendanceMetrics {
  elapsedMinutes: number
  breakMinutes: number
  netWorkMinutes: number
  plannedNetMinutes: number | null
  lateMinutes: number
  overtimeMinutes: number
}

export interface AttendanceFilters {
  startDate?: LocalDate
  endDate?: LocalDate
  employeeIds?: string[]
  departments?: Department[]
  roles?: string[]
  shiftTemplateIds?: string[]
  statuses?: (AttendanceOutcome | AttendanceFlag)[]
  search?: string
}

export interface DashboardMetrics {
  scheduled: number
  showedUp: number
  currentlyWorking: number
  onBreak: number
  onSite: number
  absent: number
  onLeave: number
  late: number
  overtime: number
}

export interface EmployeeReport {
  employee: Employee
  expectedDays: number
  attendedDays: number
  attendanceRate: number | null
  lateArrivals: number
  netWorkMinutes: number
  overtimeMinutes: number
  leaveDays: number
}
