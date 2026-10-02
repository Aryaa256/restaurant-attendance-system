import { describe, expect, it } from 'vitest'
import { createSeedState, SEED_DATE } from './seed'
import { DEMO_NOW } from '../lib/dateTime'

describe('deterministic seed integrity', () => {
  it('never fabricates attendance after the demo clock or a checkout before check-in', () => {
    const state = createSeedState()
    const today = state.attendanceRecords.filter((record) => record.workDate === SEED_DATE)
    expect(today.length).toBeGreaterThan(0)
    expect(today.every((record) => Date.parse(record.checkInAt) <= Date.parse(DEMO_NOW) && (!record.checkOutAt || Date.parse(record.checkOutAt) <= Date.parse(DEMO_NOW)))).toBe(true)
    expect(state.attendanceRecords.every((record) => !record.checkOutAt || Date.parse(record.checkOutAt) >= Date.parse(record.checkInAt))).toBe(true)
    expect(state.attendanceRecords.every((record) => !record.checkOutAt || Date.parse(record.checkOutAt) > Date.parse(record.checkInAt))).toBe(true)
  })

  it('uses a realistic private-event overnight assignment that remains open at the demo clock', () => {
    const state = createSeedState()
    const record = state.attendanceRecords.find((item) => item.id === 'att-emp-05-2026-10-01')!
    const assignment = state.assignments.find((item) => item.id === record.assignmentId)!
    expect(record.checkOutAt).toBeNull()
    expect(assignment.shiftTemplateId).toBe('private-event')
    expect(Date.parse(record.checkInAt)).toBeLessThan(Date.parse(DEMO_NOW))
    expect(Date.parse(assignment.endAt!)).toBeGreaterThan(Date.parse(DEMO_NOW))
    expect(record.managerNote).toContain('private event')
  })
})
