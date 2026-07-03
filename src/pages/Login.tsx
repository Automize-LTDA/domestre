import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../supabaseClient'
import { 
  Eye, 
  EyeOff, 
  LogIn, 
  LoaderCircle, 
  User, 
  Lock, 
  FileText, 
  Package, 
  BarChart3
} from 'lucide-react'
import logoUrl from '../assets/logo.png'
import sideImgUrl from '../assets/login-side.png'

export const Login: React.FC = () => {
  const { signIn, user, cargo, fullName, loading, session } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [redirectingToDashboard, setRedirectingToDashboard] = useState(false)
  
  const redirectTimerRef = useRef<any>(null)
  const hasStartedRedirect = useRef(false)

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  function handleCancelRedirect() {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = null
    }
    hasStartedRedirect.current = false
    setRedirectingToDashboard(false)
    navigate(redirectPath)
  }

  // Redirect if already logged in
  const redirectPath = (location.state as any)?.redirect || '/'

  // Load remembered username if exists
  useEffect(() => {
    const saved = localStorage.getItem('domestre.remembered_user')
    if (saved) {
      setUsername(saved)
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    if (!loading && user) {
      if (hasStartedRedirect.current) return

      const isAdminOrGestor = cargo === 'admin' || cargo === 'gestor' || cargo === 'sup_tecnico'
      if (isAdminOrGestor) {
        hasStartedRedirect.current = true
        setRedirectingToDashboard(true)
        let dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard-mestre.vercel.app/login'
        if (window.location.hostname !== 'localhost' && dashboardUrl.includes('localhost')) {
          dashboardUrl = 'https://dashboard-mestre.vercel.app/login'
        }
        redirectTimerRef.current = setTimeout(() => {
          const mockSession = localStorage.getItem('domestre.mock_session')
          let finalUrl = dashboardUrl
          if (mockSession) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'mock=true'
          } else if (session) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + `access_token=${session.access_token}&refresh_token=${session.refresh_token}`
          }
          window.location.href = finalUrl
        }, 3000)
      } else if (cargo !== null) {
        navigate(redirectPath)
      }
    }
  }, [user, loading, cargo, navigate, redirectPath, session])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const cleanUsername = username.trim()
    if (!cleanUsername || !password) {
      setErrorMessage('Por favor, preencha todos os campos.')
      return
    }

    setIsSubmitting(true)
    try {
      // Map username to email under the hood if it is not already an email
      const emailToAuth = cleanUsername.includes('@') 
        ? cleanUsername 
        : `${cleanUsername}@domestre.com`

      const res = await signIn(emailToAuth, password)
      const cargoLogged = res?.cargo

      // Handle remember me persistence
      if (rememberMe) {
        localStorage.setItem('domestre.remembered_user', cleanUsername)
      } else {
        localStorage.removeItem('domestre.remembered_user')
      }

      if (cargoLogged === 'admin' || cargoLogged === 'gestor' || cargoLogged === 'sup_tecnico') {
        setSuccessMessage(null)
        hasStartedRedirect.current = true
        setRedirectingToDashboard(true)
        let dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard-mestre.vercel.app/login'
        if (window.location.hostname !== 'localhost' && dashboardUrl.includes('localhost')) {
          dashboardUrl = 'https://dashboard-mestre.vercel.app/login'
        }
        redirectTimerRef.current = setTimeout(async () => {
          const mockSession = localStorage.getItem('domestre.mock_session')
          let finalUrl = dashboardUrl
          if (mockSession) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'mock=true'
          } else {
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            if (currentSession) {
              finalUrl += (finalUrl.includes('?') ? '&' : '?') + `access_token=${currentSession.access_token}&refresh_token=${currentSession.refresh_token}`
            }
          }
          window.location.href = finalUrl
        }, 3000)
        return
      }

      setSuccessMessage('Redirecionando...')
      setTimeout(() => {
        navigate(redirectPath)
      }, 500)
    } catch (err: any) {
      const errMsg = err.message || 'Falha no login'
      const translatedMsg = errMsg.toLowerCase().includes('invalid') 
        ? 'Usuário ou senha incorretos' 
        : errMsg
      setErrorMessage(translatedMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleForgotPassword() {
    showToast('Esqueceu sua senha? Entre em contato com o administrador para redefinir seu acesso.', 'info')
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white font-sans text-slate-800 relative" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 6s ease-in-out infinite;
          animation-delay: 3s;
        }
        @keyframes progress-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress-bar {
          animation: progress-bar linear forwards;
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-slide-up {
          opacity: 0;
          animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
      `}</style>

      {/* ========================================================
          LADO ESQUERDO: FORMULÁRIO DE LOGIN (Seamless & Clean)
          ======================================================== */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex items-center justify-center px-5 py-10 sm:p-12 md:p-16 bg-white relative z-10 border-r border-slate-100 animate-slide-up" style={{ minHeight: '100svh', overflowX: 'hidden' }}>
        
        <div className="w-full max-w-sm space-y-8" style={{ width: '100%', maxWidth: '400px' }}>
          
          {redirectingToDashboard ? (
            <div className="space-y-6 text-center animate-fade-in">
              {/* Logo */}
              <div className="mx-auto w-fit p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transform hover:scale-[1.03] transition-transform duration-300">
                <img src={logoUrl} alt="Logo Produtos Do Mestre" className="h-11 w-auto object-contain" />
              </div>
              
              {/* Animated Redirect Card */}
              <div className="relative overflow-hidden bg-gradient-to-r from-[#233A7A] to-[#1E2E5C] text-white p-6 rounded-2xl shadow-[var(--shadow-elegant)] border border-white/10 text-left">
                {/* Background floating circles */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 animate-float" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-10 -mb-10 animate-float-delayed" />
                
                <div className="relative flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-brand-gold text-2xl shrink-0 animate-bounce">
                    👑
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      Acesso Administrativo Detectado!
                    </h2>
                    <p className="text-[11px] text-white/80 leading-relaxed">
                      Olá, <span className="font-bold text-white">{fullName || 'Gestor'}</span>. Identificamos seu perfil de <span className="font-bold text-rose-300 uppercase">{cargo === 'admin' ? 'Administrador' : (cargo === 'gestor' ? 'Gestor' : 'Supervisor')}</span>. Redirecionando em instantes...
                    </p>
                  </div>
                </div>
                
                {/* Progress bar animation */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-6 relative z-10">
                  <div className="h-full bg-[#E53935] rounded-full animate-progress-bar" style={{ animationDuration: '3s' }} />
                </div>

                {/* Cancel Button */}
                <div className="mt-5 flex justify-end relative z-10">
                  <button
                    type="button"
                    onClick={handleCancelRedirect}
                    className="px-4 py-2 text-xs font-bold text-white hover:text-rose-100 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all cursor-pointer"
                  >
                    Permanecer no Site Principal
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Centered Logo & Header */}
              <div className="flex flex-col items-center text-center space-y-5">
                <div className="w-fit p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transform hover:scale-[1.03] transition-transform duration-300">
                  <img src={logoUrl} alt="Logo Produtos Do Mestre" className="h-11 w-auto object-contain" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold font-display text-[#233A7A] tracking-wide">
                    Bem-vindo
                  </h2>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Acesse seu painel administrativo utilizando suas credenciais.
                  </p>
                </div>
              </div>

          {/* Status Messages */}
          {errorMessage && (
            <div className="bg-[#E53935]/5 border border-[#E53935]/15 text-[#E53935] text-xs px-4 py-3 rounded-xl text-center font-semibold animate-pulse">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-100 text-green-700 text-xs px-4 py-3 rounded-xl text-center font-semibold">
              {successMessage}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                Usuário
              </label>
              <div className="relative group">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#233A7A] transition-colors" />
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ex: joao"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#233A7A] focus:bg-white focus:ring-2 focus:ring-[#233A7A]/5 transition-all"
                  style={{ fontSize: '16px', touchAction: 'manipulation' }}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                Senha
              </label>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#233A7A] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#233A7A] focus:bg-white focus:ring-2 focus:ring-[#233A7A]/5 transition-all"
                  style={{ fontSize: '16px', touchAction: 'manipulation' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#233A7A] focus:ring-[#233A7A]/10"
                />
                <span className="font-semibold text-slate-400 group-hover:text-slate-700 transition-colors select-none">
                  Lembrar-me
                </span>
              </label>
              
              <button
                type="button"
                onClick={handleForgotPassword}
                className="font-bold text-[#E53935] hover:text-[#c62828] hover:underline transition-colors"
              >
                Esqueceu sua senha?
              </button>
            </div>

            {/* Login Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white bg-[#233A7A] hover:bg-[#1E2E5C] active:scale-[0.99] hover:shadow-lg hover:shadow-[#233A7A]/10 transition-all disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none mt-2"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" /> Entrando...
                </>
              ) : (
                <>
                  <LogIn size={16} /> Entrar no Sistema
                </>
              )}
            </button>

          </form>
          </>
          )
          }

          {/* Institutional Footer */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2 flex flex-col items-center">
            <p className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} Do Mestre
            </p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 animate-float-gentle">
              <span>Desenvolvido pela</span>
              <a
                href="https://automize-one.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="animate-automize-text"
              >
                Automize
              </a>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================
          LADO DIREITO: INFORMAÇÕES LATERAIS RESUMIDAS (Desktop Only)
          ======================================================== */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 relative flex-col justify-center p-16 overflow-hidden bg-gradient-to-br from-[#233A7A] via-[#1E2E5C] to-[#121B3A] text-white">
        
        {/* Faint Concrete Image overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.06] mix-blend-overlay"
          style={{ backgroundImage: `url(${sideImgUrl})` }}
        />
        
        {/* Subtle grid line layer */}
        <div 
          className="absolute inset-0 opacity-[0.02] z-0 pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px'
          }} 
        />

        {/* Floating gradient lights */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-[#E53935]/15 blur-3xl z-0" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-[#233A7A]/30 blur-3xl z-0" />

        {/* Summarized core messages - Horizontally Centered */}
        <div className="relative z-10 max-w-lg mx-auto space-y-10 text-center animate-slide-up delay-100 flex flex-col items-center">
          
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-bold font-display tracking-wide text-white leading-tight">
              Controle de Avarias
            </h1>
            <p className="text-xs lg:text-sm text-slate-200/75 leading-relaxed max-w-md mx-auto">
              Plataforma para monitoramento de inconformidades, avarias em sacarias e documentação fotográfica.
            </p>
          </div>

          {/* Micro Row-based pill listings - Stylized Cards with descriptions */}
          <div className="space-y-4 w-full max-w-md">
            
            <div className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.08] hover:border-white/15 p-4 rounded-2xl text-left hover:bg-white/[0.06] hover:-translate-y-0.5 shadow-sm transition-all duration-300 group w-full">
              <div className="p-2.5 rounded-xl bg-white/[0.04] text-[#E53935] group-hover:scale-110 transition-transform">
                <FileText size={20} className="shrink-0" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-wide">Relatórios de Avarias & Visitas</h3>
                <p className="text-[11px] text-slate-300/80 leading-relaxed">Gere e exporte PDFs profissionais e organize relatórios em poucos segundos.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.08] hover:border-white/15 p-4 rounded-2xl text-left hover:bg-white/[0.06] hover:-translate-y-0.5 shadow-sm transition-all duration-300 group w-full">
              <div className="p-2.5 rounded-xl bg-white/[0.04] text-[#E53935] group-hover:scale-110 transition-transform">
                <Package size={20} className="shrink-0" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-wide">Inspeção de Materiais</h3>
                <p className="text-[11px] text-slate-300/80 leading-relaxed">Monitore avarias em sacarias e tintas com catálogo de imagens integrado.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.08] hover:border-white/15 p-4 rounded-2xl text-left hover:bg-white/[0.06] hover:-translate-y-0.5 shadow-sm transition-all duration-300 group w-full">
              <div className="p-2.5 rounded-xl bg-white/[0.04] text-[#E53935] group-hover:scale-110 transition-transform">
                <BarChart3 size={20} className="shrink-0" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-wide">Métricas & Estatísticas</h3>
                <p className="text-[11px] text-slate-300/80 leading-relaxed">Acompanhe gráficos gerais de inconformidades e relatórios em tempo real.</p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
export default Login
