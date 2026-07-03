import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { Layout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { 
  ArrowRight, 
  ClipboardList, 
  History, 
  Settings,
  Calendar,
  LoaderCircle,
  Smartphone,
  X,
  Bell,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  const { role, user } = useAuth()
  const [showInstallBanner, setShowInstallBanner] = React.useState(false)
  const [reminderDismissed, setReminderDismissed] = React.useState(false)

  React.useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
    const isDismissed = localStorage.getItem('domestre.install_banner_dismissed') === 'true'
    if (!isStandalone && !isDismissed) {
      setShowInstallBanner(true)
    }

    const reminderDismissedUntil = localStorage.getItem('domestre.reminder_dismissed_until')
    if (reminderDismissedUntil && new Date(reminderDismissedUntil) > new Date()) {
      setReminderDismissed(true)
    }
  }, [])

  // Query stats from Supabase
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [avariasRes, visitasRes, itemsRes, materiaisRes] = await Promise.all([
        supabase.from('relatorios_avarias').select('id', { count: 'exact', head: true }),
        supabase.from('relatorios_visitas').select('id', { count: 'exact', head: true }),
        supabase.from('itens_relatorio_avaria').select('quantidade'),
        supabase.from('materiais').select('id', { count: 'exact', head: true })
      ])

      const totalAvarias = avariasRes.count || 0
      const totalVisitas = visitasRes.count || 0
      const totalItens = (itemsRes.data || []).reduce((acc, curr) => acc + curr.quantidade, 0)
      const totalMateriais = materiaisRes.count || 10

      return {
        totalAvarias,
        totalVisitas,
        totalItens,
        totalMateriais
      }
    },
    refetchOnWindowFocus: false
  })

  // ── Promoter activity check ────────────────────────────────────────────────
  const { data: promoterActivity } = useQuery({
    queryKey: ['promoter-activity', user?.id],
    enabled: role === 'promotor' && !!user?.id && !reminderDismissed,
    queryFn: async () => {
      const isMock = user?.id === '00000000-0000-0000-0000-000000000000'
      if (isMock) return { lastVisitDate: null, visitedToday: false, daysSinceLastVisit: null }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(today.getDate() - 3)

      const { data } = await supabase
        .from('relatorios_visitas')
        .select('created_at')
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!data || data.length === 0) {
        return { lastVisitDate: null, visitedToday: false, daysSinceLastVisit: null }
      }

      const lastVisitDate = new Date(data[0].created_at)
      const lastVisitDay = new Date(lastVisitDate)
      lastVisitDay.setHours(0, 0, 0, 0)

      const visitedToday = lastVisitDay.getTime() === today.getTime()
      const diffMs = today.getTime() - lastVisitDay.getTime()
      const daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      return { lastVisitDate, visitedToday, daysSinceLastVisit }
    },
    refetchOnWindowFocus: false
  })

  function dismissReminder() {
    // Dismiss for the rest of the day
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    localStorage.setItem('domestre.reminder_dismissed_until', endOfDay.toISOString())
    setReminderDismissed(true)
  }

  // Determine reminder type
  const showUrgentReminder = !reminderDismissed &&
    role === 'promotor' &&
    promoterActivity &&
    promoterActivity.daysSinceLastVisit !== null &&
    promoterActivity.daysSinceLastVisit >= 3

  const showSoftReminder = !reminderDismissed &&
    role === 'promotor' &&
    promoterActivity &&
    !promoterActivity.visitedToday &&
    (promoterActivity.daysSinceLastVisit === null || promoterActivity.daysSinceLastVisit < 3)

  const visitedToday = role === 'promotor' && promoterActivity?.visitedToday

  const quickAccessLinks = [
    {
      to: '/novo',
      icon: ClipboardList,
      title: 'Novo Relatório',
      desc: 'Registre avarias com seleção rápida de materiais.'
    },
    {
      to: '/visitas/novo',
      icon: Calendar,
      title: 'Nova Visita',
      desc: 'Registre visitas aos clientes e atividades realizadas.'
    },
    ...(role !== 'promotor' ? [
      {
        to: '/relatorios',
        icon: History,
        title: 'Relatórios Gerados',
        desc: 'Histórico completo, busca por empresa e exportações.'
      },
      {
        to: '/configuracoes',
        icon: Settings,
        title: 'Configurações',
        desc: 'Preferências do sistema e backups.'
      }
    ] : [])
  ]

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
      {/* PWA INSTALL BANNER */}
      {showInstallBanner && (
        <div className="bg-brand-navy border-b border-white/10 text-white py-3.5 px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-3 no-print transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold">Instale o aplicativo do sistema!</p>
              <p className="text-[10px] sm:text-xs text-white/70">Acesse de forma muito mais rápida e em tela cheia no Android e iOS.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/instalar"
              className="px-3.5 py-1.5 rounded-xl bg-brand-gold text-brand-navy text-xs font-bold hover:scale-[1.02] transition-transform shadow-[var(--shadow-soft)]"
            >
              Como Instalar
            </Link>
            <button
              onClick={() => {
                localStorage.setItem('domestre.install_banner_dismissed', 'true')
                setShowInstallBanner(false)
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── PROMOTER: Visited today banner ─────────────────────────────────── */}
      {visitedToday && !reminderDismissed && (
        <div className="relative overflow-hidden border-b border-emerald-500/20 no-print"
          style={{ background: 'linear-gradient(90deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-emerald-300" />
              </div>
              <p className="text-sm font-bold text-white">
                ✅ Ótimo trabalho! Você já registrou uma visita hoje.
              </p>
            </div>
            <button
              onClick={dismissReminder}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Fechar"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── PROMOTER: Soft reminder (não visitou hoje, < 3 dias) ──────────── */}
      {showSoftReminder && (
        <div
          className="relative overflow-hidden no-print"
          style={{
            background: 'linear-gradient(90deg, #78350f 0%, #92400e 40%, #b45309 100%)'
          }}
        >
          {/* Animated pulse ring */}
          <div className="pointer-events-none absolute left-4 sm:left-8 top-1/2 -translate-y-1/2">
            <span className="absolute inline-flex h-10 w-10 rounded-full bg-amber-400/30 animate-ping" />
          </div>

          {/* Subtle diagonal stripe overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 9px)'
            }}
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Icon with pulse */}
                <div className="relative shrink-0">
                  <div className="h-11 w-11 rounded-full bg-amber-400/25 border-2 border-amber-300/50 flex items-center justify-center">
                    <Bell size={20} className="text-amber-200" />
                  </div>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-black text-white tracking-tight">
                    ⚠️ Você ainda não registrou uma visita hoje!
                  </p>
                  <p className="text-[11px] sm:text-xs text-amber-200/80 mt-0.5">
                    {promoterActivity?.lastVisitDate
                      ? `Último registro: ${new Date(promoterActivity.lastVisitDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}`
                      : 'Nenhum registro encontrado ainda. Comece agora!'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <Link
                  to="/visitas/novo"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-amber-800 text-xs sm:text-sm font-black hover:scale-[1.03] active:scale-[0.98] transition-transform shadow-lg"
                >
                  <Calendar size={15} />
                  Registrar agora
                </Link>
                <button
                  onClick={dismissReminder}
                  className="p-2 rounded-lg hover:bg-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fechar lembrete"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROMOTER: Urgent reminder (3+ dias sem visita) ────────────────── */}
      {showUrgentReminder && (
        <div
          className="relative overflow-hidden no-print"
          style={{
            background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 100%)'
          }}
        >
          {/* Animated pulse ring */}
          <div className="pointer-events-none absolute left-4 sm:left-8 top-1/2 -translate-y-1/2">
            <span className="absolute inline-flex h-10 w-10 rounded-full bg-red-400/40 animate-ping" />
          </div>

          {/* Diagonal stripes */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 9px)'
            }}
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="h-11 w-11 rounded-full bg-red-400/25 border-2 border-red-300/50 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-200" />
                  </div>
                </div>
                <div>
                  <p className="text-sm sm:text-base font-black text-white tracking-tight">
                    🚨 Atenção! Você não registra visitas há {promoterActivity!.daysSinceLastVisit} dias!
                  </p>
                  <p className="text-[11px] sm:text-xs text-red-200/80 mt-0.5">
                    Mantenha seus registros em dia para garantir o acompanhamento correto.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <Link
                  to="/visitas/novo"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-red-700 text-xs sm:text-sm font-black hover:scale-[1.03] active:scale-[0.98] transition-transform shadow-lg"
                >
                  <Calendar size={15} />
                  Registrar agora
                </Link>
                <button
                  onClick={dismissReminder}
                  className="p-2 rounded-lg hover:bg-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fechar lembrete"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0" style={{ backgroundImage: 'var(--gradient-hero)' }} />
        {/* Grid overlay pattern */}
        <div 
          className="absolute inset-0 opacity-[0.07]" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} 
        />
        
        {/* Content */}
        <div className="relative mx-auto max-w-7xl px-6 pt-14 pb-20 lg:pt-16 lg:pb-28">
          <div className="flex flex-col items-start animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Sistema de Controle <br />
              <span className="text-brand-gold">de Avarias &amp; Visitas</span>
            </h1>
            
            <p className="mt-5 max-w-xl text-base sm:text-lg text-white/80 leading-relaxed">
              Registre rapidamente os materiais avariados e visitas realizadas, acompanhe quantidades em tempo real e gere relatórios profissionais em PDF.
            </p>
            
            <div className="mt-8 flex flex-wrap gap-3">
              <Link 
                to="/novo" 
                style={{ backgroundImage: 'var(--gradient-accent)' }}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-brand-red-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] transition-transform"
              >
                Registrar avaria <ArrowRight size={18} />
              </Link>
              <Link 
                to="/visitas/novo" 
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Nova visita
              </Link>
              {role !== 'promotor' && (
                <Link 
                  to="/relatorios" 
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Ver histórico
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* METRICS GRID OVERLAY */}
      <section className="mx-auto max-w-7xl w-full px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Relatórios Avarias', value: isLoading ? null : stats?.totalAvarias },
            { label: 'Relatórios Visitas', value: isLoading ? null : stats?.totalVisitas },
            { label: 'Itens Registrados', value: isLoading ? null : stats?.totalItens },
            { label: 'Materiais Cadastrados', value: isLoading ? null : stats?.totalMateriais }
          ].map((item, idx) => (
            <div 
              key={idx}
              className="rounded-2xl bg-card p-5 shadow-[var(--shadow-soft)] border border-border flex flex-col justify-between"
            >
              <div className="text-3xl font-bold text-brand-navy font-display">
                {item.value === null ? (
                  <LoaderCircle className="h-6 w-6 animate-spin text-brand-red" />
                ) : (
                  item.value
                )}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* QUICK ACCESS SECTION */}
      <section className="mx-auto max-w-7xl w-full px-6 py-16">
        <h2 className="text-2xl font-bold text-foreground mb-6">Acesso rápido</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickAccessLinks.map((link, idx) => {
            const Icon = link.icon
            return (
              <Link
                key={idx}
                to={link.to}
                className="group block h-full rounded-2xl bg-card p-6 border border-border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-primary-foreground group-hover:bg-brand-red transition-colors">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{link.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{link.desc}</p>
              </Link>
            )
          })}
        </div>
      </section>
      </div>
    </Layout>
  )
}
export default Dashboard
