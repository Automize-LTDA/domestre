import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { Layout } from '../components/Layout'
import { 
  Star, 
  ArrowRight, 
  ClipboardList, 
  History, 
  Settings,
  Calendar,
  LoaderCircle
} from 'lucide-react'

export const Dashboard: React.FC = () => {
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
  ]

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
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
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-gold/20 px-4 py-1.5 text-xs font-semibold text-brand-gold uppercase tracking-wider">
              <Star size={14} fill="currentColor" /> Controle profissional
            </div>
            
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Sistema de Controle <br />
              <span className="text-brand-gold">de Avarias & Visitas</span>
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
              <Link 
                to="/relatorios" 
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Ver histórico
              </Link>
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
