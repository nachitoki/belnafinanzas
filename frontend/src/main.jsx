import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Guard for builds where some code references `meta` instead of `import.meta`.
// Keep it on globalThis so any module can read it.
// eslint-disable-next-line no-undef
globalThis.meta = import.meta;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
