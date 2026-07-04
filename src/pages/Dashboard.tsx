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
  const [testOverrideState, setTestOverrideState] = React.useState<'soft' | 'urgent' | 'success' | null>(null)

  React.useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
    const isDismissed = localStorage.getItem('domestre.install_banner_dismissed') === 'true'
    if (!isStandalone && !isDismissed) {
      setShowInstallBanner(true)
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
    enabled: role === 'promotor' && !!user?.id,
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



  // Determine reminder type
  const showUrgentReminder = testOverrideState === 'urgent' || (!testOverrideState &&
    role === 'promotor' &&
    promoterActivity &&
    promoterActivity.daysSinceLastVisit !== null &&
    promoterActivity.daysSinceLastVisit >= 3)

  const showSoftReminder = testOverrideState === 'soft' || (!testOverrideState &&
    role === 'promotor' &&
    promoterActivity &&
    !promoterActivity.visitedToday &&
    (promoterActivity.daysSinceLastVisit === null || promoterActivity.daysSinceLastVisit < 3))

  const visitedToday = testOverrideState === 'success' || (!testOverrideState && role === 'promotor' && promoterActivity?.visitedToday)

  const heroGradient = React.useMemo(() => {
    if (showUrgentReminder) {
      return 'linear-gradient(135deg, oklch(34% .16 24) 0%, oklch(20% .08 24) 100%)' // Crimson urgent alert
    }
    if (showSoftReminder) {
      return 'linear-gradient(135deg, oklch(38% .12 55) 0%, oklch(24% .08 55) 100%)' // Amber daily alert
    }
    if (visitedToday) {
      return 'linear-gradient(135deg, oklch(32% .12 150) 0%, oklch(20% .08 160) 100%)' // Success green
    }
    return 'var(--gradient-hero)' // Navy standard
  }, [showUrgentReminder, showSoftReminder, visitedToday])

  const showAlertCard = showUrgentReminder || showSoftReminder || visitedToday

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

      {/* HERO SECTION */}
      <section className="relative overflow-hidden transition-all duration-700 ease-in-out" style={{ background: heroGradient }}>
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
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className={`${showAlertCard ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col items-start animate-fade-in-up`}>
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
            
            {/* Right Alert/Info Card Column */}
            {showAlertCard && (
              <div className="lg:col-span-5 w-full animate-fade-in-up">
                {showUrgentReminder && (
                  <div className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-8 text-white shadow-[var(--shadow-elegant)]">
                    {/* Subtle diagonal stripe overlay */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, white 8px, white 9px)' }} />
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <span className="absolute inline-flex h-10 w-10 rounded-full bg-red-400/40 animate-ping" />
                        <div className="h-11 w-11 rounded-full bg-red-500/25 border border-red-300/40 flex items-center justify-center relative">
                          <AlertTriangle size={20} className="text-red-200" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 text-red-200 text-[10px] font-black px-2 py-0.5 border border-red-500/30 uppercase tracking-wider">
                          Atenção Crítica
                        </span>
                        <h3 className="text-xl font-bold leading-tight mt-1">Registro Muito Atrasado</h3>
                        <p className="text-sm text-white/80 leading-normal">
                          Você está há <strong className="text-white font-extrabold">{promoterActivity!.daysSinceLastVisit} dias</strong> sem registrar nenhuma visita. O registro diário é obrigatório.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Link
                        to="/visitas/novo"
                        className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl bg-white text-red-800 text-sm font-bold hover:bg-white/95 active:scale-[0.98] transition-transform shadow-md"
                      >
                        <Calendar size={16} />
                        Registrar Visita Agora
                      </Link>
                    </div>
                  </div>
                )}

                {showSoftReminder && (
                  <div className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-8 text-white shadow-[var(--shadow-elegant)]">
                    {/* Subtle diagonal stripe overlay */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, white 8px, white 9px)' }} />
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <span className="absolute inline-flex h-10 w-10 rounded-full bg-amber-400/40 animate-ping" />
                        <div className="h-11 w-11 rounded-full bg-amber-500/25 border border-amber-300/40 flex items-center justify-center relative">
                          <Bell size={20} className="text-amber-200" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-black px-2 py-0.5 border border-amber-500/30 uppercase tracking-wider">
                          Lembrete Diário
                        </span>
                        <h3 className="text-xl font-bold leading-tight mt-1">Registrar Visita de Hoje</h3>
                        <p className="text-sm text-white/80 leading-normal">
                          Sua visita de hoje ainda não foi registrada. Atualize o sistema para manter seu relatório em dia.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Link
                        to="/visitas/novo"
                        className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl bg-white text-amber-800 text-sm font-bold hover:bg-white/95 active:scale-[0.98] transition-transform shadow-md"
                      >
                        <Calendar size={16} />
                        Registrar Visita
                      </Link>
                    </div>
                  </div>
                )}

                 {visitedToday && (
                  <div className="relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-8 text-white shadow-[var(--shadow-elegant)]">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        <div className="h-11 w-11 rounded-full bg-emerald-500/25 border border-emerald-300/40 flex items-center justify-center">
                          <CheckCircle2 size={20} className="text-emerald-200" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-black px-2 py-0.5 border border-emerald-500/30 uppercase tracking-wider">
                          Atualizado
                        </span>
                        <h3 className="text-xl font-bold leading-tight mt-1">Tudo Pronto por Hoje!</h3>
                        <p className="text-sm text-white/80 leading-normal">
                          Sua visita de hoje já foi registrada no sistema. Obrigado por manter seus relatórios atualizados!
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-bold">
                        <CheckCircle2 size={16} className="text-emerald-300" />
                        Relatório de hoje enviado
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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

      {/* DEVELOPER ALERT TEST PANEL */}
      <section className="mx-auto max-w-7xl w-full px-6 py-6 border-t border-border mt-6 no-print">
        <div className="rounded-2xl bg-secondary/40 border border-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            🛠️ Painel de Testes — Simular Cores dos Alertas
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setTestOverrideState('soft')
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                testOverrideState === 'soft'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-secondary'
              }`}
            >
              ⚠️ Simular Amarelo (Sem visita hoje)
            </button>
            <button
              onClick={() => {
                setTestOverrideState('urgent')
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                testOverrideState === 'urgent'
                  ? 'bg-red-500 text-white border-red-500 shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-secondary'
              }`}
            >
              🚨 Simular Vermelho (3+ dias sem visita)
            </button>
            <button
              onClick={() => {
                setTestOverrideState('success')
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                testOverrideState === 'success'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-secondary'
              }`}
            >
              ✅ Simular Verde (Visitas registradas)
            </button>
            <button
              onClick={() => {
                setTestOverrideState(null)
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                testOverrideState === null
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-card text-foreground border-border hover:bg-secondary'
              }`}
            >
              🔄 Dados Reais (Supabase)
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2.5">
            Use este painel para alternar instantaneamente entre os estados visuais dos alertas e as cores do topo do site.
          </p>
        </div>
      </section>

      </div>
    </Layout>
  )
}
export default Dashboard
