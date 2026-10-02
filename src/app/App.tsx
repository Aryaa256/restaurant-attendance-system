import { useEffect, useState } from 'react'
import { BellOff, CalendarDays, Clock3, FileBarChart2, LayoutDashboard, Menu, Settings2, Users, X } from 'lucide-react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { DashboardPage, AttendancePage, EmployeesPage, EmployeeProfilePage, ShiftsPage, LeavesPage, ReportsPage, SettingsPage, NotFoundPage } from '../features/pages'
import { useAttendance } from '../state/AttendanceProvider'

const navItems = [
  ['/', 'Dashboard', LayoutDashboard], ['/attendance', 'Attendance', Clock3], ['/employees', 'Employees', Users], ['/shifts', 'Shifts', CalendarDays], ['/leaves', 'Leaves', BellOff], ['/reports', 'Reports', FileBarChart2], ['/settings', 'Settings', Settings2],
] as const

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { state, storageWarning } = useAttendance()
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])
  return <div className="app-shell"><aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation"><div className="brand"><span className="brand-mark">t</span><div><strong>Tava</strong><small>ATTENDANCE</small></div><button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={20}/></button></div><p className="sidebar-label">{state.restaurant.name.toUpperCase()} · LOCAL DEMO</p><nav>{navItems.map(([to, label, Icon]) => <NavLink end={to === '/'} key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav><div className="sidebar-foot"><p><span/> Changes persist in this browser</p></div></aside>{menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Close navigation"/>}<main className="main-content"><header className="mobile-bar"><button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={22}/></button><strong>Tava</strong><span aria-hidden="true"/></header><div className="page-wrap">{storageWarning && <p className="form-error" role="alert">{storageWarning}</p>}<Routes><Route path="/" element={<DashboardPage/>}/><Route path="/attendance" element={<AttendancePage/>}/><Route path="/employees" element={<EmployeesPage/>}/><Route path="/employees/:employeeId" element={<EmployeeProfilePage/>}/><Route path="/shifts" element={<ShiftsPage/>}/><Route path="/leaves" element={<LeavesPage/>}/><Route path="/reports" element={<ReportsPage/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="*" element={<NotFoundPage/>}/></Routes></div></main></div>
}

export default function App() { return <BrowserRouter><Shell/></BrowserRouter> }
