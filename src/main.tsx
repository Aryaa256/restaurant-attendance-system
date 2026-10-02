import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AttendanceProvider } from './state/AttendanceProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AttendanceProvider>
      <App />
    </AttendanceProvider>
  </StrictMode>,
)
