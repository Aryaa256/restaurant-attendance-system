import type { IsoTimestamp, LocalDate } from '../domain/types'

export const DEMO_TIMEZONE = 'Asia/Kolkata' as const
export const DEMO_NOW = '2026-10-02T10:30:00+05:30' as const

const pad = (value: number) => String(value).padStart(2, '0')

export function dateFromTimestamp(timestamp: IsoTimestamp, timezone = DEMO_TIMEZONE): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(timestamp))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function timeFromTimestamp(timestamp: IsoTimestamp, timezone = DEMO_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(timestamp))
}

/** The demo restaurant has a fixed Asia/Kolkata offset and deliberately stores unambiguous ISO instants. */
export function atRestaurantTime(date: LocalDate, time: string): IsoTimestamp {
  return `${date}T${time}:00+05:30`
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const parsed = new Date(`${date}T12:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`
}

export function datesBetween(start: LocalDate, end: LocalDate): LocalDate[] {
  const result: LocalDate[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) result.push(date)
  return result
}

export function weekday(date: LocalDate): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

export function minutesBetween(start: IsoTimestamp, end: IsoTimestamp): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000))
}

export function addMinutes(timestamp: IsoTimestamp, minutes: number): IsoTimestamp {
  return new Date(new Date(timestamp).getTime() + minutes * 60_000).toISOString()
}

export function isDateInRange(date: LocalDate, start: LocalDate, end: LocalDate): boolean {
  return date >= start && date <= end
}
