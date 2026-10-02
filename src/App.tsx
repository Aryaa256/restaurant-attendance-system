import { useState, type ReactNode } from 'react'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Download,
  FileBarChart2,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useAttendance } from './state/AttendanceProvider'
import { selectDashboardMetrics } from './domain/selectors'
import { DEMO_NOW } from './lib/dateTime'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/attendance', label: 'Attendance', icon: Clock3 },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/shifts', label: 'Shifts', icon: CalendarDays },
  { to: '/leaves', label: 'Leaves', icon: Coffee, badge: '4' },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

type AttendanceStatus = 'Working' | 'On break' | 'Checked out' | 'Awaiting check-in' | 'Late' | 'On leave'
type Person = { id: string; name: string; initials: string; color: string; department: string; role: string; shift: string; checkIn: string; checkOut: string; net: string; status: AttendanceStatus; flags?: string[] }

const people: Person[] = [
  { id: 'arjun-mehta', name: 'Arjun Mehta', initials: 'AM', color: 'terracotta', department: 'Kitchen', role: 'Sous Chef', shift: 'Opening · 07:00–15:00', checkIn: '06:54', checkOut: '—', net: '5h 42m', status: 'Working', flags: ['Overtime'] },
  { id: 'meera-nair', name: 'Meera Nair', initials: 'MN', color: 'olive', department: 'Service', role: 'Floor Captain', shift: 'Lunch · 10:30–18:30', checkIn: '10:42', checkOut: '—', net: '2h 18m', status: 'Late', flags: ['12 min late'] },
  { id: 'imran-khan', name: 'Imran Khan', initials: 'IK', color: 'slate', department: 'Kitchen', role: 'Line Cook', shift: 'Lunch · 10:30–18:30', checkIn: '10:24', checkOut: '—', net: '1h 48m', status: 'On break' },
  { id: 'kavya-rao', name: 'Kavya Rao', initials: 'KR', color: 'mustard', department: 'Guest services', role: 'Host', shift: 'Lunch · 10:30–18:30', checkIn: '10:28', checkOut: '—', net: '2h 02m', status: 'Working' },
  { id: 'joseph-dsouza', name: "Joseph D'Souza", initials: 'JD', color: 'blue', department: 'Service', role: 'Server', shift: 'Dinner · 15:30–23:30', checkIn: '—', checkOut: '—', net: 'Starts 15:30', status: 'Awaiting check-in' },
  { id: 'priya-patel', name: 'Priya Patel', initials: 'PP', color: 'plum', department: 'Cash', role: 'Cashier', shift: 'Opening · 07:00–15:00', checkIn: '07:03', checkOut: '14:58', net: '7h 10m', status: 'Checked out' },
  { id: 'ravi-verma', name: 'Ravi Verma', initials: 'RV', color: 'green', department: 'Stewarding', role: 'Steward', shift: 'Lunch · 10:30–18:30', checkIn: '—', checkOut: '—', net: 'Approved leave', status: 'On leave' },
]

function Avatar({ person, small = false }: { person: Pick<Person, 'initials' | 'color'>; small?: boolean }) {
  return <span className={`avatar ${person.color} ${small ? 'avatar-small' : ''}`}>{person.initials}</span>
}

function Status({ children }: { children: ReactNode }) {
  const normalized = String(children).toLowerCase().replaceAll(' ', '-')
  return <span className={`status status-${normalized}`}>{children}</span>
}

function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
      <div className="brand"><span className="brand-mark">t</span><div><strong>Tava</strong><small>WORKSPACE</small></div><button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
      <button className="venue-switcher"><span className="venue-dot"/> Copper Kadai <ChevronRight size={15}/></button>
      <nav>{navItems.map(({ to, label, icon: Icon, badge }) => <NavLink end={to === '/'} key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18}/><span>{label}</span>{badge && <b>{badge}</b>}</NavLink>)}</nav>
      <div className="sidebar-foot"><div className="manager"><Avatar person={{ initials: 'SK', color: 'olive' }} small/><div><strong>Shreya Kapoor</strong><small>Demo manager</small></div></div><p><span/> Local demo data</p></div>
    </aside>
    {mobileOpen && <button className="backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
    <main className="main-content">
      <header className="mobile-bar"><button className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={22}/></button><strong>Tava</strong><button className="icon-button" aria-label="Notifications"><Bell size={20}/></button></header>
      <div className="page-wrap" key={location.pathname}>{children}</div>
    </main>
  </div>
}

function Header({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow ?? 'RESTAURANT OPERATIONS'}</p><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action}</header>
}

function Metric({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: ReactNode; tone?: string }) {
  return <article className={`metric-card ${tone ?? ''}`}><div className="metric-icon">{icon}</div><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>
}

function Dashboard() {
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(false)
  const { state } = useAttendance()
  const dashboardMetrics = selectDashboardMetrics(state, '2026-10-02', DEMO_NOW)
  const visible = people.filter((person) => person.name.toLowerCase().includes(query.toLowerCase()))
  return <>
    <Header eyebrow="FRIDAY, 2 OCTOBER" title="Good afternoon, Shreya." subtitle="Here’s how the team is shaping up today." action={<button className="button primary" onClick={() => setDialog(true)}><Plus size={17}/> Manual check-in</button>}/>
    <section className="metrics" aria-label="Today’s attendance summary">
      <Metric label="Scheduled today" value={String(dashboardMetrics.scheduled)} detail={`${dashboardMetrics.onLeave} on approved leave · 2 weekly off`} icon={<CalendarDays size={21}/>} />
      <Metric label="Showed up" value={String(dashboardMetrics.showedUp)} detail={`${dashboardMetrics.scheduled ? Math.round((dashboardMetrics.showedUp / dashboardMetrics.scheduled) * 100) : 0}% of today’s roster`} icon={<Check size={21}/>} tone="olive" />
      <Metric label="Currently working" value={String(dashboardMetrics.currentlyWorking)} detail={`${dashboardMetrics.onBreak} teammates are on break`} icon={<Clock3 size={21}/>} tone="working" />
      <Metric label="Need attention" value={String(dashboardMetrics.absent)} detail="Awaiting check-in after shift start" icon={<ShieldCheck size={21}/>} tone="attention" />
    </section>
    <section className="dashboard-grid">
      <article className="card staffing-card"><div className="card-heading"><div><p className="eyebrow">TODAY’S COVERAGE</p><h2>Staffing by department</h2></div><Link to="/attendance" className="text-link">View roster <ChevronRight size={15}/></Link></div>
        {[['Kitchen', '12', '14', 'kitchen'], ['Service', '13', '15', 'service'], ['Guest services', '4', '5', 'guest'], ['Cash & support', '7', '8', 'cash']].map(([name, arrived, expected, style]) => <div className="coverage" key={name}><div><strong>{name}</strong><span>{arrived} of {expected} arrived</span></div><div className="bar"><i className={style} style={{ width: `${(Number(arrived) / Number(expected)) * 100}%` }}/></div></div>)}
        <div className="coverage-note"><span className="dot terracotta"/> 4 planned dinner shifts still need coverage</div>
      </article>
      <article className="card action-card"><div className="card-heading"><div><p className="eyebrow">REQUESTS</p><h2>Awaiting your review</h2></div><button className="icon-button" aria-label="More request options"><MoreHorizontal size={19}/></button></div><div className="request-row"><div className="request-icon correction"><Clock3 size={18}/></div><div><strong>2 correction requests</strong><p>Time entries need a quick review.</p></div><Link to="/attendance?tab=corrections">Review</Link></div><div className="request-row"><div className="request-icon leave"><Coffee size={18}/></div><div><strong>4 leave requests</strong><p>Two begin next week.</p></div><Link to="/leaves">Review</Link></div><div className="tip"><span>Tip</span> Review corrections before exporting payroll hours.</div></article>
    </section>
    <section className="section-heading"><div><h2>Live attendance</h2><p>Roster status updates from local demo data.</p></div><div className="table-controls"><label className="search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teammate" aria-label="Search teammates"/></label><Link to="/attendance" className="button secondary">View all</Link></div></section>
    <AttendanceList people={visible.slice(0, 6)} />
    {dialog && <CheckInDialog close={() => setDialog(false)}/>} 
  </>
}

function AttendanceList({ people: rows, compact = false }: { people: Person[]; compact?: boolean }) {
  return <div className="attendance-list card"><div className="attendance-table-wrap"><table><thead><tr><th>Team member</th><th>Shift</th><th>Check in</th><th>Break / net time</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((person) => <tr key={person.id}><td><Link to={`/employees/${person.id}`} className="person"><Avatar person={person}/><span><strong>{person.name}</strong><small>{person.department} · {person.role}</small></span></Link></td><td><span className="shift-text">{person.shift}</span></td><td>{person.checkIn}</td><td><span>{person.net}</span>{person.status === 'On break' && <small className="break-label">Break started 12:10</small>}</td><td><div className="status-stack"><Status>{person.status}</Status>{person.flags?.map((flag) => <span className="flag" key={flag}>{flag}</span>)}</div></td><td><button className="row-action" aria-label={`Open ${person.name} details`}><ChevronRight size={18}/></button></td></tr>)}</tbody></table></div><div className="attendance-cards">{rows.map((person) => <article className="attendance-mobile-card" key={person.id}><div className="mobile-person"><Avatar person={person}/><div><strong>{person.name}</strong><small>{person.department} · {person.role}</small></div><Status>{person.status}</Status></div><dl><div><dt>Shift</dt><dd>{person.shift.split(' · ')[0]}</dd></div><div><dt>In / net time</dt><dd>{person.checkIn} · {person.net}</dd></div></dl><Link to={`/employees/${person.id}`} className="text-link">Open record <ChevronRight size={15}/></Link></article>)}</div>{!compact && <footer className="table-footer"><span>Showing 6 of 42 scheduled teammates</span><Link to="/attendance" className="text-link">Open attendance <ChevronRight size={15}/></Link></footer>}</div>
}

function Attendance() {
  const [tab, setTab] = useState<'table' | 'month' | 'corrections' | 'overtime'>('table')
  const [status, setStatus] = useState('All statuses')
  const [filterOpen, setFilterOpen] = useState(false)
  const rows = status === 'All statuses' ? people : people.filter((person) => person.status === status)
  return <>
    <Header title="Attendance" subtitle="Review the roster, resolve exceptions, and keep time records accurate." action={<button className="button primary"><Plus size={17}/> Manual check-in</button>}/>
    <div className="tabs" role="tablist">{(['table', 'month', 'corrections', 'overtime'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? 'selected' : ''} role="tab" aria-selected={tab === item}>{item === 'table' ? 'Daily table' : item[0].toUpperCase() + item.slice(1)}{item === 'corrections' && <b>2</b>}</button>)}</div>
    {tab === 'table' && <><section className="filter-bar card"><div className="date-control"><button aria-label="Previous day"><ChevronLeft size={17}/></button><strong>Today, 2 Oct 2026</strong><button aria-label="Next day"><ChevronRight size={17}/></button></div><label className="search grow"><Search size={17}/><input placeholder="Search employee" aria-label="Search employee"/></label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status filter"><option>All statuses</option><option>Working</option><option>Late</option><option>On break</option><option>Awaiting check-in</option></select><button className="button secondary mobile-filter" onClick={() => setFilterOpen(!filterOpen)}><SlidersHorizontal size={17}/> Filters <b>2</b></button><button className="filter-button" onClick={() => setFilterOpen(!filterOpen)}><SlidersHorizontal size={17}/> More filters</button></section>{filterOpen && <div className="filter-sheet"><strong>More filters</strong><button onClick={() => setFilterOpen(false)} className="icon-button"><X size={18}/></button><select aria-label="Department"><option>All departments</option><option>Kitchen</option><option>Service</option></select><select aria-label="Shift"><option>All shifts</option><option>Opening</option><option>Lunch</option><option>Dinner</option></select></div>}<div className="list-caption"><span><strong>{rows.length} records</strong> · Friday, 2 October</span><span className="legend"><i/> Late <i className="olive-dot"/> Overtime</span></div><AttendanceList people={rows}/></>}
    {tab === 'month' && <CalendarView/>}
    {tab === 'corrections' && <RequestList type="correction"/>}
    {tab === 'overtime' && <OvertimeView/>}
  </>
}

function CalendarView() { const days = Array.from({ length: 31 }, (_, index) => index + 1); return <section className="calendar card"><div className="calendar-heading"><div><button aria-label="Previous month"><ChevronLeft size={18}/></button><strong>October 2026</strong><button aria-label="Next month"><ChevronRight size={18}/></button></div><button className="button secondary">Today</button></div><div className="weekday-row">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({length: 3}, (_, index) => <div className="calendar-empty" key={`empty-${index}`}/>) }{days.map((day) => <button className={`calendar-day ${day === 2 ? 'today' : ''} ${day > 2 ? 'future' : ''}`} key={day}><strong>{day}</strong>{day <= 2 && <><span>42 scheduled</span><span className="calendar-present">36 present</span>{day === 2 && <i>4 exceptions</i>}</>}{day > 2 && <span>Roster planned</span>}</button>)}</div><div className="agenda"><strong>Friday, 2 October</strong><p>42 scheduled · 36 checked in · 4 exceptions requiring attention</p><button className="button primary">View day roster</button></div></section> }

function RequestList({ type }: { type: 'correction' | 'leave' }) { const correction = type === 'correction'; return <section className="request-list card">{[0,1,2].map((index) => <article className="request-card" key={index}><Avatar person={people[index + 1]}/><div><Status>{index === 2 ? 'Approved' : 'Pending'}</Status><h3>{correction ? `${people[index + 1].name} requested a time correction` : `${people[index + 1].name} requested leave`}</h3><p>{correction ? 'Adjust check-out to 18:45 due to closing handover.' : 'Annual leave · 12–14 October · Full day'}</p><small>Submitted {index + 1} day{index ? 's' : ''} ago</small></div>{index < 2 && <div className="request-actions"><button className="button secondary">Decline</button><button className="button primary">Approve</button></div>}</article>)}</section> }

function OvertimeView() { return <section className="card overtime"><div className="card-heading"><div><p className="eyebrow">POLICY</p><h2>Overtime tracking</h2><p>Shown when net hours exceed planned hours + 30 minutes.</p></div><button className="button secondary"><Download size={16}/> Export CSV</button></div><table><thead><tr><th>Employee</th><th>Date / shift</th><th>Planned</th><th>Actual net</th><th>Overtime</th></tr></thead><tbody>{people.filter((person) => person.flags?.includes('Overtime')).concat(people.slice(2,4)).map((person, index) => <tr key={`${person.id}-${index}`}><td><Link className="person" to={`/employees/${person.id}`}><Avatar person={person}/><strong>{person.name}</strong></Link></td><td>2 Oct · {person.shift.split(' · ')[0]}</td><td>7h 15m</td><td>{index ? '8h 02m' : '8h 14m'}</td><td><Status>+{index ? '47m' : '59m'}</Status></td></tr>)}</tbody></table></section> }

function Employees() { const [search, setSearch] = useState(''); const filtered = people.filter((person) => person.name.toLowerCase().includes(search.toLowerCase())); return <><Header title="Team members" subtitle="Your restaurant’s people, shifts, and attendance at a glance." action={<button className="button primary"><Plus size={17}/> Add employee</button>}/><section className="directory card"><div className="directory-tools"><label className="search grow"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or employee code"/></label><select aria-label="Department"><option>All departments</option><option>Kitchen</option><option>Service</option></select><select aria-label="Employment status"><option>Active</option><option>Inactive</option></select></div><div className="employee-grid">{filtered.map((person) => <Link to={`/employees/${person.id}`} className="employee-tile" key={person.id}><Avatar person={person}/><div><strong>{person.name}</strong><p>{person.role} · {person.department}</p><small>{person.shift.split(' · ')[0]} shift</small></div><ChevronRight size={18}/></Link>)}</div></section></> }

function EmployeeProfile() { const { employeeId } = useParams(); const employee = people.find((person) => person.id === employeeId) ?? people[0]; return <><Link className="back-link" to="/employees"><ChevronLeft size={17}/> Back to team members</Link><Header eyebrow="TEAM MEMBER PROFILE" title={employee.name} subtitle={`${employee.role} · ${employee.department} · EMP-048`} action={<button className="button secondary">Edit profile</button>}/><section className="profile-hero card"><div className="profile-identity"><Avatar person={employee}/><div><h2>{employee.name}</h2><p>{employee.role} · Joined 12 Mar 2024</p><Status>{employee.status}</Status></div></div><div className="profile-meta"><div><small>Assigned shift</small><strong>{employee.shift.split(' · ')[0]}</strong></div><div><small>Today</small><strong>{employee.checkIn === '—' ? 'Not checked in' : `In at ${employee.checkIn}`}</strong></div><div><small>Contact</small><strong>+91 98 555 0182</strong></div></div></section><section className="profile-metrics"><Metric label="Attendance rate" value="94%" detail="23 of 24 expected workdays" icon={<Check size={20}/>}/><Metric label="Late arrivals" value="1" detail="5 minutes grace period" icon={<Clock3 size={20}/>}/><Metric label="Net hours" value="176h" detail="Last 30 days" icon={<CalendarDays size={20}/>}/><Metric label="Overtime" value="4h 12m" detail="Last 30 days" icon={<ShieldCheck size={20}/>}/></section><section className="profile-grid"><article className="card"><div className="card-heading"><div><p className="eyebrow">RECENT RECORDS</p><h2>Attendance history</h2></div><Link className="text-link" to="/attendance">See all <ChevronRight size={15}/></Link></div>{people.slice(0,4).map((person, index) => <div className="history-row" key={person.id}><div><strong>{index === 0 ? 'Today, 2 Oct' : `${1 - index + 3} Oct 2026`}</strong><small>{employee.shift}</small></div><span>{index === 0 ? employee.net : '7h 18m'}</span><Status>{index === 1 ? 'Late' : 'Present'}</Status></div>)}</article><article className="card profile-note"><p className="eyebrow">TIME OFF</p><h2>1 day upcoming leave</h2><p>Annual leave approved for 14 October. It is excluded from attendance rate calculations.</p><button className="button secondary">View leave history</button></article></section></> }

function Shifts() { return <><Header title="Shifts & roster" subtitle="Plan service coverage with reusable shifts and a clear weekly roster." action={<button className="button primary"><Plus size={17}/> Assign shift</button>}/><section className="shift-cards">{[['Opening prep','07:00','15:00','7h 15m'],['Lunch service','10:30','18:30','7h 15m'],['Dinner service','15:30','23:30','7h 15m'],['Closing','17:00','01:00','7h 15m']].map(([name,start,end,net]) => <article className="card shift-card" key={name}><span className="shift-color"/><p className="eyebrow">SHIFT TEMPLATE</p><h2>{name}</h2><strong>{start} <span>to</span> {end}</strong><p>{net} expected net time · 45 min unpaid break</p><button className="text-link">Edit shift <ChevronRight size={15}/></button></article>)}</section><section className="card roster"><div className="card-heading"><div><p className="eyebrow">WEEKLY ROSTER</p><h2>5–11 October</h2></div><div className="date-control"><button><ChevronLeft size={17}/></button><button><ChevronRight size={17}/></button></div></div><div className="roster-table"><div className="roster-head"><span>Team member</span>{['Mon 5','Tue 6','Wed 7','Thu 8','Fri 9','Sat 10','Sun 11'].map((day) => <span key={day}>{day}</span>)}</div>{people.slice(0,5).map((person, index) => <div className="roster-row" key={person.id}><span className="person"><Avatar person={person} small/><b>{person.name}</b></span>{Array.from({length:7}, (_, day) => <button key={day} className={day === 6 ? 'off' : index === 2 && day === 2 ? 'leave' : ''}>{day === 6 ? 'Weekly off' : index === 2 && day === 2 ? 'Leave' : person.shift.split(' · ')[0]}</button>)}</div>)}</div></section></> }

function Leaves() { return <><Header title="Leave requests" subtitle="Review team time off and see its effect on scheduled coverage." action={<button className="button primary"><Plus size={17}/> Add leave request</button>}/><div className="tabs"><button className="selected">Pending <b>4</b></button><button>Approved</button><button>Rejected</button></div><RequestList type="leave"/></> }

function Reports() { return <><Header title="Reports" subtitle="Use attendance signals to keep service teams staffed and supported." action={<button className="button secondary"><Download size={17}/> Export CSV</button>}/><section className="report-controls card"><div className="date-control"><button><ChevronLeft size={17}/></button><strong>1–30 September 2026</strong><button><ChevronRight size={17}/></button></div><select><option>All departments</option><option>Kitchen</option><option>Service</option></select><button className="button secondary"><SlidersHorizontal size={16}/> Filters</button></section><section className="report-kpis"><Metric label="Attendance rate" value="92.4%" detail="Expected workdays attended" icon={<Check size={20}/>}/><Metric label="Late arrivals" value="18" detail="Across 14 teammates" icon={<Clock3 size={20}/>}/><Metric label="Overtime hours" value="42h 18m" detail="Across 19 completed shifts" icon={<ShieldCheck size={20}/>}/></section><section className="charts"><article className="card trend-chart"><div className="card-heading"><div><p className="eyebrow">ATTENDANCE TREND</p><h2>Roster coverage stayed steady</h2></div><span className="status status-working">92.4% average</span></div><div className="bars">{[72,81,88,84,91,93,87,95,92,90,97,93].map((height,index) => <span key={index} style={{height:`${height}%`}}><i/></span>)}</div><div className="chart-labels"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div></article><article className="card breakdown"><p className="eyebrow">BY DEPARTMENT</p><h2>Attendance rate</h2>{[['Kitchen','95%'],['Service','91%'],['Guest services','93%'],['Cash & support','89%']].map(([dept,value]) => <div className="breakdown-row" key={dept}><span>{dept}</span><div><i style={{width:value}}/></div><strong>{value}</strong></div>)}</article></section><section className="card report-table"><div className="card-heading"><div><p className="eyebrow">TEAM SUMMARY</p><h2>Employee attendance</h2></div><button className="text-link">View methodology <ChevronRight size={15}/></button></div><table><thead><tr><th>Employee</th><th>Expected days</th><th>Attended</th><th>Late</th><th>Net hours</th><th>Overtime</th></tr></thead><tbody>{people.slice(0,5).map((person,index) => <tr key={person.id}><td><Link to={`/employees/${person.id}`} className="person"><Avatar person={person} small/><strong>{person.name}</strong></Link></td><td>24</td><td>{24-index}</td><td>{index % 3}</td><td>176h {index}m</td><td>{index ? '—' : '4h 12m'}</td></tr>)}</tbody></table></section></> }

function Settings() { const [saved,setSaved] = useState(false); return <><Header title="Settings" subtitle="Customize the restaurant rules used by this local demonstration."/><section className="settings-grid"><form className="card settings-form" onSubmit={(event) => {event.preventDefault();setSaved(true)}}><div className="card-heading"><div><p className="eyebrow">RESTAURANT SETTINGS</p><h2>Attendance rules</h2></div></div><label>Restaurant display name<input defaultValue="Copper Kadai"/></label><div className="form-columns"><label>Late-arrival grace period<select defaultValue="5"><option value="5">5 minutes</option><option>10 minutes</option><option>15 minutes</option></select></label><label>Overtime threshold<select defaultValue="30"><option value="30">30 minutes</option><option>45 minutes</option><option>60 minutes</option></select></label></div><label>Week starts on<select><option>Monday</option><option>Sunday</option></select></label><p className="form-help">Rules recalculate visible demo history. They are not payroll or legal compliance guidance.</p><button className="button primary" type="submit"><Check size={17}/> Save changes</button>{saved && <p className="saved-message" role="status">Settings saved. Reports and attendance rules are updated.</p>}</form><aside className="card rule-card"><p className="eyebrow">HOW IT WORKS</p><h2>Attendance outcomes</h2><p>Scheduled teammates without a check-in become absent only after their assigned shift ends. Full-day approved leave and weekly offs are excluded from expected staffing.</p><p>Net time subtracts recorded breaks. Overtime begins after planned net hours plus your selected threshold.</p><span className="timezone">Timezone: Asia/Kolkata (IST)</span></aside></section><section className="card danger-zone"><div><p className="eyebrow">DEMO DATA</p><h2>Restore original data</h2><p>This replaces local changes with the initial fictional restaurant dataset.</p></div><button className="button danger">Reset demo data</button></section></> }

function CheckInDialog({ close }: { close: () => void }) { const { state, dispatch } = useAttendance(); const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? ''); const confirm = () => { if (employeeId) dispatch({ type: 'CHECK_IN', employeeId, workDate: '2026-10-02', at: '2026-10-02T12:45:00+05:30', note: 'Manual entry from demo UI' }); close() }; return <div className="dialog-layer" role="presentation"><div className="dialog card" role="dialog" aria-modal="true" aria-labelledby="checkin-title"><button onClick={close} className="dialog-close icon-button" aria-label="Close"><X size={20}/></button><p className="eyebrow">MANUAL TIME ENTRY</p><h2 id="checkin-title">Check in a teammate</h2><p>Use this only when a team member could not use the usual attendance flow.</p><label>Team member<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>{state.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><div className="form-columns"><label>Work date<input type="date" defaultValue="2026-10-02"/></label><label>Check-in time<input type="time" defaultValue="12:45"/></label></div><label>Manager note <textarea placeholder="Optional context for this entry"/></label><footer><button className="button secondary" onClick={close}>Cancel</button><button className="button primary" onClick={confirm}>Confirm check-in</button></footer></div></div> }

function NotFound() { return <div className="not-found"><p className="eyebrow">PAGE NOT FOUND</p><h1>This table isn’t on the menu.</h1><p>Try returning to your restaurant dashboard.</p><Link to="/" className="button primary">Go to dashboard</Link></div> }

function RoutedApp() { return <AppShell><Routes><Route path="/" element={<Dashboard/>}/><Route path="/attendance" element={<Attendance/>}/><Route path="/employees" element={<Employees/>}/><Route path="/employees/:employeeId" element={<EmployeeProfile/>}/><Route path="/shifts" element={<Shifts/>}/><Route path="/leaves" element={<Leaves/>}/><Route path="/reports" element={<Reports/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<NotFound/>}/></Routes></AppShell> }

export default function App() { return <BrowserRouter><RoutedApp/></BrowserRouter> }
