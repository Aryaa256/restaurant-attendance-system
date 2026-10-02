import * as Dialog from '@radix-ui/react-dialog'
import { ChevronRight, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { AttendanceStatus, Employee } from '../domain/types'

export function Avatar({ employee, small = false }: { employee: Employee; small?: boolean }) {
  return <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ backgroundColor: `${employee.avatarColor}30`, color: employee.avatarColor }}>{employee.initials}</span>
}

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  return <span className={`status status-${status.outcome}`}>{status.label}{status.flags.map((flag) => <span key={flag}> · {flag.replace('-', ' ')}</span>)}</span>
}

export function PageHeader({ eyebrow = 'RESTAURANT OPERATIONS', title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action}</header>
}

export function EmptyState({ title, detail, reset }: { title: string; detail: string; reset?: () => void }) {
  return <div className="empty-state"><h2>{title}</h2><p>{detail}</p>{reset && <button className="button secondary" onClick={reset}>Clear filters</button>}</div>
}

export function Drawer({ open, onOpenChange, title, children, trigger }: { open: boolean; onOpenChange: (value: boolean) => void; title: string; children: ReactNode; trigger?: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Trigger asChild>{trigger ?? <span />}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog card" aria-describedby={undefined}><Dialog.Close className="dialog-close icon-button" aria-label="Close dialog"><X size={20}/></Dialog.Close><Dialog.Title>{title}</Dialog.Title>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>
}

export function EmployeeLink({ employee }: { employee: Employee }) { return <Link to={`/employees/${employee.id}`} className="person"><Avatar employee={employee}/><span><strong>{employee.name}</strong><small>{employee.department} · {employee.role}</small></span><ChevronRight size={16}/></Link> }

export function minutesLabel(minutes: number) { const hours = Math.floor(minutes / 60); return `${hours}h ${String(minutes % 60).padStart(2, '0')}m` }
