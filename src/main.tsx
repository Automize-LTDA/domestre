import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registrar o Service Worker para habilitar PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker registrado com sucesso:', reg.scope)
        // Forçar verificação de atualização imediata ao abrir o app
        reg.update()
      })
      .catch(err => {
        console.error('Falha ao registrar o Service Worker:', err)
      })

    // Recarregar a página automaticamente quando o novo service worker tomar o controle
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })
}

