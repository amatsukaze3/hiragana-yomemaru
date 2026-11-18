import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import ShootApp from './ShootApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShootApp />
  </StrictMode>,
)
