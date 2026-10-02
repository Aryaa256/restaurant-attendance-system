# Tava restaurant attendance

A responsive, local-first restaurant attendance demonstration for the fictional Tava Kadai team. It has no backend or authentication: all data is deterministic fictional seed data and changes persist in browser localStorage.

## Run locally

Requires Node 20.19+ or Node 22.12+.

```bash
npm install
npm run dev
npm run build
npm test
npm run lint
```

## Demo workflows

- Dashboard totals reconcile scheduled, showed-up, currently-working, on-break, leave, late, and absence states from one shared attendance store.
- Attendance has route-query-backed date, employee search, department, role, shift, and status filters; monthly, corrections, and overtime views; manual check-in; break, checkout, and correction actions.
- Directory and profiles read seeded employees and calculated employee reports. Employee creation and active roster assignment persist locally.
- Leave and correction decisions update the same state used by staffing and reporting. Shifts support dated assignments and weekly offs.
- Reports use selected date ranges and provide CSV export. Settings update attendance grace/overtime policy calculations and can restore the original seed data after confirmation.

The demo uses `Asia/Kolkata` and deterministic records around 2 October 2026. It intentionally does not provide payroll, biometric hardware, notifications, or production authentication.
