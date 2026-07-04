import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { 
  LogOut, 
  Menu, 
  ShieldCheck, 
  X, 
  LoaderCircle,
  Building2,
  History,
  ClipboardList,
  MapPin,
  Smartphone,
  Gift,
  Bell
} from 'lucide-react'
import logoUrl from '../assets/logo.png'

interface LayoutProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

interface NavLinkItem {
  to: string
  label: string
  icon: React.ComponentType<any>
}

const navLinks: NavLinkItem[] = [
  { to: '/', label: 'Início', icon: Building2 },
  { to: '/novo', label: 'Novo Relatório', icon: ClipboardList },
  { to: '/relatorios', label: 'Relatórios Gerados', icon: History },
  { to: '/visitas/novo', label: 'Visita a Filiais', icon: MapPin },
  { to: '/brindes', label: 'Solicitar Brindes', icon: Gift },
  { to: '/instalar', label: 'Instalar App', icon: Smartphone }
]

export const Layout: React.FC<LayoutProps> = ({ children, requireAdmin = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, role, fullName, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  interface NotificationItem {
    id: string
    titulo: string
    mensagem: string
    tipo: 'info' | 'sucesso' | 'alerta' | 'erro'
    lida: boolean
    created_at: string
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    async function fetchNotifications() {
      try {
        const { data, error } = await supabase
          .from('notificacoes')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!error && data) {
          setNotifications(data as NotificationItem[])
          setUnreadCount(data.filter(n => !n.lida).length)
        }
      } catch (err) {
        console.error('Erro ao buscar notificações:', err)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [user])

  async function handleMarkAsRead(id: string) {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, lida: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleMarkAllAsRead() {
    if (!user) return
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', user?.id)
        .eq('lida', false)

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { state: { redirect: location.pathname } })
      } else if (requireAdmin && role !== 'admin') {
        navigate('/')
      }
    }
  }, [user, role, loading, requireAdmin, navigate, location.pathname])

  if (loading || !user || (requireAdmin && role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoaderCircle className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    )
  }

  const activeLinks = navLinks.filter(link => {
    // Esconder Relatórios Gerados para promotores
    if (role === 'promotor' && link.to === '/relatorios') {
      return false
    }
    return true
  })



  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border shadow-[var(--shadow-soft)] no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="hidden md:flex h-20 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img src={logoUrl} alt="Produtos Do Mestre" className="h-12 w-auto object-contain rounded-lg" />
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              {activeLinks.map(link => {
                const isActive = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'bg-brand-navy text-primary-foreground shadow-[var(--shadow-soft)]'
                        : 'text-foreground/80 hover:text-brand-red hover:bg-secondary'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}

              {/* Profile / Logout */}
              <div className="ml-3 pl-3 border-l border-border flex items-center gap-2">
                <div className="text-right leading-tight">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1 justify-end">
                    {role === 'admin' && <ShieldCheck size={12} className="text-brand-red" />}
                    {fullName || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {role === 'admin' ? 'Administrador' : role === 'promotor' ? 'Promotor' : 'Comum'}
                  </div>
                </div>

                {/* Notification Bell Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-brand-red text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown menu */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                      <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Notificações</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] text-brand-red hover:underline font-semibold"
                          >
                            Ler todas
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-border">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground">
                            Nenhuma notificação encontrada.
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div
                              key={notif.id}
                              onClick={() => handleMarkAsRead(notif.id)}
                              className={`p-3 text-left transition-colors cursor-pointer ${
                                notif.lida ? 'opacity-70 bg-card' : 'bg-secondary/40 hover:bg-secondary/70'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                  notif.tipo === 'sucesso' ? 'bg-emerald-500' :
                                  notif.tipo === 'erro' ? 'bg-rose-500' :
                                  notif.tipo === 'alerta' ? 'bg-amber-500' : 'bg-blue-500'
                                }`} />
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-foreground">{notif.titulo}</p>
                                  <p className="text-[11px] text-muted-foreground">{notif.mensagem}</p>
                                  <p className="text-[9px] text-slate-400">
                                    {new Date(notif.created_at).toLocaleDateString('pt-BR')} {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => signOut()}
                  title="Sair"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </nav>
          </div>

          {/* Mobile Header Bar */}
          <div className="md:hidden flex items-center justify-between h-16 w-full">
            {/* Logo on the left */}
            <Link to="/" className="flex items-center">
              <img src={logoUrl} alt="Produtos Do Mestre" className="h-9 w-auto object-contain rounded-md" />
            </Link>
            
            {/* Notification and Menu actions */}
            <div className="flex items-center gap-1">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg text-brand-navy dark:text-foreground hover:bg-secondary transition-colors"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-brand-red text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Mobile Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Notificações</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[9px] text-brand-red hover:underline font-semibold"
                        >
                          Ler todas
                        </button>
                      )}
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          Nenhuma notificação encontrada.
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              handleMarkAsRead(notif.id)
                              setShowNotifications(false)
                            }}
                            className={`p-3 text-left transition-colors cursor-pointer ${
                              notif.lida ? 'opacity-70 bg-card' : 'bg-secondary/40'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                notif.tipo === 'sucesso' ? 'bg-emerald-500' :
                                notif.tipo === 'erro' ? 'bg-rose-500' :
                                notif.tipo === 'alerta' ? 'bg-amber-500' : 'bg-blue-500'
                              }`} />
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-foreground">{notif.titulo}</p>
                                <p className="text-[10px] text-muted-foreground">{notif.mensagem}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menu"
                className="p-2 rounded-lg text-brand-navy dark:text-foreground hover:bg-secondary hover:text-brand-red transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card overflow-hidden">
            <nav className="flex flex-col px-4 py-3 gap-1">
              {activeLinks.map(link => {
                const isActive = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-brand-navy text-primary-foreground'
                        : 'text-foreground/90 hover:bg-secondary'
                    }`}
                  >
                    <link.icon size={16} />
                    {link.label}
                  </Link>
                )
              })}

              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  signOut()
                }}
                className="w-full px-4 py-3 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 mt-2 border border-rose-100/50 cursor-pointer text-left"
              >
                <LogOut size={16} />
                <span>Sair da Conta</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/80 bg-card/60 backdrop-blur-md py-8 no-print mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Lado esquerdo: Copyright & Marca */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-bold text-foreground">Do Mestre</span>
            <span className="opacity-40">•</span>
            <span>© {new Date().getFullYear()} — Todos os direitos reservados.</span>
          </div>

          {/* Lado direito: Crédito de desenvolvimento */}
          <div className="flex items-center gap-1 text-muted-foreground animate-float-gentle">
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
      </footer>
    </div>
  )
}
export default Layout
