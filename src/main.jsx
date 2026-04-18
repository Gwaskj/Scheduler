import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Load global reset FIRST
import './index.css'

// Load your themed UI LAST so it overrides index.css
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
