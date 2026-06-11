import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

// Import Pages
import Dashboard from './pages/Dashboard'
import NovoRelatorio from './pages/NovoRelatorio'
import ExportarRelatorio from './pages/ExportarRelatorio'
import NovaVisita from './pages/NovaVisita'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import Admin from './pages/Admin'
import Login from './pages/Login'
import InstalarApp from './pages/InstalarApp'

// Create React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/novo" element={<NovoRelatorio />} />
              <Route path="/exportar" element={<ExportarRelatorio />} />
              <Route path="/visitas/novo" element={<NovaVisita />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/instalar" element={<InstalarApp />} />
              {/* Fallback route */}
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
