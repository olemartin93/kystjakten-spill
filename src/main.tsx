import '@fontsource-variable/inter'
import '@fontsource/chakra-petch/600.css'
import '@fontsource/chakra-petch/700.css'
import './styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

document.getElementById('boot-splash')?.remove()

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}
