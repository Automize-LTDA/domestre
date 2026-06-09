import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          let bgColor = 'bg-white/95 text-slate-800 border-slate-200 shadow-lg'
          let Icon = Info
          let iconColor = 'text-blue-500'
          
          if (toast.type === 'success') {
            bgColor = 'bg-slate-900/95 text-white border-green-500/20 shadow-[0_10px_35px_rgba(0,0,0,0.35)]'
            Icon = CheckCircle2
            iconColor = 'text-green-400'
          } else if (toast.type === 'error') {
            bgColor = 'bg-[#E53935]/95 text-white border-red-500/10 shadow-[0_10px_30px_rgba(229,57,53,0.3)]'
            Icon = AlertTriangle
            iconColor = 'text-white'
          }

          return (
            <div
              key={toast.id}
              style={{
                animation: 'toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
              className={`pointer-events-auto flex items-start gap-3.5 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 ${bgColor}`}
            >
              <style>{`
                @keyframes toast-slide-in {
                  0% { opacity: 0; transform: translateX(80px) scale(0.9); }
                  100% { opacity: 1; transform: translateX(0) scale(1); }
                }
              `}</style>
              <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-xs font-bold leading-relaxed pr-1">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-colors p-0.5 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
