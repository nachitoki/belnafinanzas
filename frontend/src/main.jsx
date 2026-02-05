import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Guard for builds where some code references `meta` instead of `import.meta`.
// Keeps runtime from crashing in production bundles.
// eslint-disable-next-line no-unused-vars
var meta = import.meta;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
