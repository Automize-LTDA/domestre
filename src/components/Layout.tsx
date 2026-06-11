import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
  Smartphone
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
  { to: '/instalar', label: 'Instalar App', icon: Smartphone }
]

export const Layout: React.FC<LayoutProps> = ({ children, requireAdmin = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, role, fullName, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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

  const activeLinks = role === 'admin' 
    ? [...navLinks, { to: '/admin', label: 'Administração', icon: ShieldCheck }]
    : navLinks

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
            
            {/* Menu button on the right */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menu"
              className="p-2 rounded-lg text-brand-navy dark:text-foreground hover:bg-secondary hover:text-brand-red transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card overflow-hidden">
            <nav className="flex flex-col px-4 py-3 gap-1">
              <div className="px-4 py-3 mb-1 rounded-lg bg-secondary/60 flex items-center justify-between">
                <div className="leading-tight">
                  <div className="text-sm font-bold text-foreground flex items-center gap-1">
                    {role === 'admin' && <ShieldCheck size={14} className="text-brand-red" />}
                    {fullName || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {role === 'admin' ? 'Administrador' : role === 'promotor' ? 'Promotor' : 'Comum'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut()
                  }}
                  className="h-9 inline-flex items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                >
                  <LogOut size={14} /> Sair
                </button>
              </div>

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
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>Desenvolvido pela</span>
            <a
              href="https://automize-one.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary/80 border border-border text-foreground hover:text-brand-red hover:border-brand-red/30 transition-all duration-300 font-semibold shadow-[var(--shadow-soft)] animate-float-gentle"
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
