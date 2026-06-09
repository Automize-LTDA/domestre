import React, { useState } from 'react'
import { Layout } from '../components/Layout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { generateReportPDF, generateVisitPDF } from '../utils/pdfGenerator'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { 
  Building2, 
  Calendar, 
  Search, 
  User, 
  Trash2, 
  FileDown,
  LoaderCircle,
  AlertCircle
} from 'lucide-react'

type TabType = 'avarias' | 'visitas'

export const Relatorios: React.FC = () => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('avarias')
  const [search, setSearch] = useState('')

  // 1. Fetch Avarias reports
  const { data: avarias, isLoading: loadingAvarias } = useQuery({
    queryKey: ['relatorios-avarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relatorios_avarias')
        .select('*, itens:itens_relatorio_avaria(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  // 2. Fetch Visitas reports
  const { data: visitas, isLoading: loadingVisitas } = useQuery({
    queryKey: ['relatorios-visitas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relatorios_visitas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  // 3. Delete Avaria Mutation
  const deleteAvariaMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get report details first for logging
      const { data: report } = await supabase
        .from('relatorios_avarias')
        .select('numero, empresa')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('relatorios_avarias')
        .delete()
        .eq('id', id)

      if (error) throw error

      if (report) {
        await supabase.from('historico').insert({
          user_id: user?.id,
          action: 'DELETE_REPORT_AVARIA',
          details: { report_number: report.numero, empresa: report.empresa }
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios-avarias'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      showToast('Relatório de Avarias removido com sucesso!', 'success')
    },
    onError: (err: any) => {
      showToast('Erro ao remover relatório: ' + err.message, 'error')
    }
  })

  // 4. Delete Visita Mutation
  const deleteVisitaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: report } = await supabase
        .from('relatorios_visitas')
        .select('numero, empresa')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('relatorios_visitas')
        .delete()
        .eq('id', id)

      if (error) throw error

      if (report) {
        await supabase.from('historico').insert({
          user_id: user?.id,
          action: 'DELETE_REPORT_VISITA',
          details: { report_number: report.numero, empresa: report.empresa }
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios-visitas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      showToast('Relatório de Visita removido com sucesso!', 'success')
    },
    onError: (err: any) => {
      showToast('Erro ao remover relatório: ' + err.message, 'error')
    }
  })

  function handleDeleteAvaria(id: string) {
    if (confirm('Remover este relatório de avarias?')) {
      deleteAvariaMutation.mutate(id)
    }
  }

  function handleDeleteVisita(id: string) {
    if (confirm('Remover este relatório de visita?')) {
      deleteVisitaMutation.mutate(id)
    }
  }

  // Memoized filtered Avarias
  const filteredAvarias = React.useMemo(() => {
    if (!avarias) return []
    const term = search.trim().toLowerCase()
    if (!term) return avarias
    return avarias.filter(r => 
      r.empresa.toLowerCase().includes(term) ||
      r.numero.toLowerCase().includes(term) ||
      r.responsavel.toLowerCase().includes(term)
    )
  }, [avarias, search])

  // Memoized filtered Visitas
  const filteredVisitas = React.useMemo(() => {
    if (!visitas) return []
    const term = search.trim().toLowerCase()
    if (!term) return visitas
    return visitas.filter(r => 
      r.empresa.toLowerCase().includes(term) ||
      r.numero.toLowerCase().includes(term) ||
      r.responsavel.toLowerCase().includes(term) ||
      (r.motivo && r.motivo.toLowerCase().includes(term))
    )
  }, [visitas, search])

  const isLoading = activeTab === 'avarias' ? loadingAvarias : loadingVisitas
  const currentCount = activeTab === 'avarias' ? filteredAvarias.length : filteredVisitas.length

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* HEADER & SEARCH */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
              Histórico
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-brand-navy">
              Relatórios Gerados
            </h1>
          </div>
          
          <div className="relative w-full sm:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por empresa, nº, responsável..."
              className="input pl-10"
            />
          </div>
        </header>

        {/* TABS */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => { setActiveTab('avarias'); setSearch(''); }}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'avarias'
                ? 'border-brand-red text-brand-red'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Relatórios de Avarias
          </button>
          <button
            onClick={() => { setActiveTab('visitas'); setSearch(''); }}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'visitas'
                ? 'border-brand-red text-brand-red'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Relatórios de Visitas
          </button>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <LoaderCircle className="animate-spin mb-2" size={32} />
            <span>Carregando relatórios...</span>
          </div>
        ) : currentCount === 0 ? (
          <div className="rounded-2xl bg-card border border-dashed border-border p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-60 mb-3" />
            <p className="text-muted-foreground font-semibold">
              {search.trim() ? 'Nenhum resultado encontrado.' : 'Nenhum relatório criado ainda.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {/* AVARIAS TAB CONTENT */}
            {activeTab === 'avarias' && filteredAvarias.map(report => (
              <article 
                key={report.id}
                className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-brand-red font-bold">
                      Nº {report.numero}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-foreground flex items-center gap-2">
                      <Building2 size={18} className="text-brand-navy shrink-0" />
                      <span className="truncate">{report.empresa}</span>
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User size={12} /> {report.responsavel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> {new Date(report.data).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-brand-navy font-display leading-none">
                        {report.total_itens}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        itens
                      </div>
                    </div>
                    
                    <button
                      onClick={() => generateReportPDF({
                        numero: report.numero,
                        empresa: report.empresa,
                        responsavel: report.responsavel,
                        data: report.data,
                        situacao: report.situacao,
                        observacoes: report.observacoes,
                        totalItens: report.total_itens,
                        itens: report.itens.map((item: any) => ({
                          material: item.material,
                          quantidade: item.quantidade,
                          tipoAvaria: item.tipo_avaria
                        }))
                      })}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-navy text-primary-foreground px-3 py-2 text-xs font-bold hover:bg-brand-red transition-colors"
                    >
                      <FileDown size={14} /> PDF
                    </button>

                    <button
                      onClick={() => handleDeleteAvaria(report.id)}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {report.itens && report.itens.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
                    {report.itens.slice(0, 6).map((item: any) => (
                      <span 
                        key={item.id}
                        className="text-[11px] bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 font-medium"
                      >
                        {item.material} · {item.quantidade}
                      </span>
                    ))}
                    {report.itens.length > 6 && (
                      <span className="text-[11px] text-muted-foreground px-2 py-0.5">
                        +{report.itens.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </article>
            ))}

            {/* VISITAS TAB CONTENT */}
            {activeTab === 'visitas' && filteredVisitas.map(visit => {
              // Parse structured JSON if available
              let structured: any = null
              if (visit.observacoes) {
                try {
                  const parsed = JSON.parse(visit.observacoes)
                  if (parsed && typeof parsed === 'object' && ('horarioChegada' in parsed || 'pontoExtra' in parsed)) {
                    structured = parsed
                  }
                } catch (e) {}
              }

              return (
                <article 
                  key={visit.id}
                  className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elegant)] transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-mono text-brand-red font-bold">
                        Nº {visit.numero}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${
                          visit.status === 'Realizada' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : visit.status === 'Agendada'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {visit.status}
                        </span>
                      </div>
                      
                      <h3 className="mt-1.5 text-lg font-bold text-foreground flex items-center gap-2">
                        <Building2 size={18} className="text-brand-navy shrink-0" />
                        <span className="truncate">{visit.empresa}</span>
                      </h3>

                      {structured ? (
                        <div className="mt-3 space-y-2.5">
                          {/* Horários and Local info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground border-b border-border/50 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-brand-navy" />
                              <span>Data: <strong>{new Date(visit.data).toLocaleDateString('pt-BR')}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="shrink-0 text-brand-navy font-bold">🕒</span>
                              <span>Chegada: <strong>{structured.horarioChegada}</strong> · Saída: <strong>{structured.horarioSaida}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:col-span-2 mt-0.5">
                              <span className="shrink-0 text-brand-navy font-bold">📍</span>
                              <span>Local: <strong>{visit.motivo}</strong></span>
                            </div>
                          </div>

                          {/* Attribute Tags */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className={`text-[10px] uppercase font-bold tracking-wider rounded-md px-2 py-0.5 border ${
                              structured.pontoExtra === 'SIM'
                                ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400'
                                : 'bg-secondary text-muted-foreground border-border'
                            }`}>
                              Ponto Extra: {structured.pontoExtra}
                            </span>
                            
                            <span className={`text-[10px] uppercase font-bold tracking-wider rounded-md px-2 py-0.5 border ${
                              structured.ruptura === 'SIM'
                                ? 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
                                : 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400'
                            }`}>
                              Ruptura: {structured.ruptura}
                            </span>

                            <span className={`text-[10px] uppercase font-bold tracking-wider rounded-md px-2 py-0.5 border ${
                              structured.situacaoEstoque === 'Adequado'
                                ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400'
                                : structured.situacaoEstoque === 'Moderado'
                                ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400'
                                : 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400'
                            }`}>
                              Estoque: {structured.situacaoEstoque}
                            </span>

                            {structured.preco && structured.preco.length > 0 && (
                              <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400 rounded-md px-2 py-0.5">
                                Preço: {structured.preco.join(', ')}
                              </span>
                            )}
                          </div>

                          {/* Quick checklist of materials */}
                          {structured.materiaisPositivados && structured.materiaisPositivados.length > 0 && (
                            <div className="text-[11px] text-muted-foreground/90 mt-1 flex flex-wrap gap-1 items-center">
                              <span className="font-semibold text-foreground">Materiais:</span>
                              {structured.materiaisPositivados.map((m: string) => (
                                <span key={m} className="bg-secondary text-secondary-foreground rounded-md px-1.5 py-0.5">
                                  {m === 'Outro' && structured.materiaisPositivadosOutro ? structured.materiaisPositivadosOutro : m}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1.5">
                            <span className="font-semibold">Visitante:</span> {visit.responsavel}
                          </div>
                        </div>
                      ) : (
                        // Legacy view
                        <>
                          <div className="mt-2 text-sm font-semibold text-foreground/90">
                            Motivo: <span className="font-normal text-muted-foreground">{visit.motivo}</span>
                          </div>
                          {visit.atividades && (
                            <div className="mt-1 text-xs text-muted-foreground truncate max-w-xl">
                              Atividades: {visit.atividades}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <User size={12} /> {visit.responsavel}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={12} /> {new Date(visit.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-center">
                      <button
                        onClick={() => generateVisitPDF({
                          numero: visit.numero,
                          empresa: visit.empresa,
                          responsavel: visit.responsavel,
                          data: visit.data,
                          motivo: visit.motivo,
                          atividades: visit.atividades,
                          observacoes: visit.observacoes,
                          status: visit.status
                        })}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-navy text-primary-foreground px-3 py-2 text-xs font-bold hover:bg-brand-red transition-colors"
                      >
                        <FileDown size={14} /> PDF
                      </button>

                      <button
                        onClick={() => handleDeleteVisita(visit.id)}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
export default Relatorios
