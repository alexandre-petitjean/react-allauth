import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { BASE_URL } from './config'
import { installFetchLogger } from './lib/apiLog'
import './styles.css'

// Record allauth API calls before anything renders (captures the initial session).
installFetchLogger(BASE_URL)

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
