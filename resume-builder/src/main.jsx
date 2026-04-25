import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Clear any leftover resume data from previous sessions (localStorage from old persist middleware)
try { localStorage.removeItem('resume-builder-storage'); } catch (_) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
