import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

import { 
  Save, 
  LoaderCircle,
  Building2,
  MapPin,
  Sparkles,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
  Circle,
  PartyPopper,
  ClipboardList
} from 'lucide-react'

export interface VisitFormState {
  empresa: string
  responsavel: string
  numero: string
  data: string
  status: 'Agendada' | 'Realizada' | 'Cancelada'
  
  // New structured fields
  horarioChegada: string
  horarioSaida: string
  local: string
  pontoExtra: 'Sim' | 'Não' | ''
  tipoPontoExtra: string[]
  tipoPontoExtraOutro: string
  materiaisPositivados: string[]
  materiaisPositivadosOutro: string
  preco: string[]
  situacaoEstoque: 'Adequado' | 'Moderado' | 'Baixa' | ''
  ruptura: 'Sim' | 'Não' | ''
}

const DRAFT_VISITA_KEY = 'domestre.draft_visita.v2'

// ── Section Status Badge ──────────────────────────────────────────────────────
function SectionBadge({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30 shrink-0">
        <CheckCircle2 size={11} strokeWidth={2.5} /> Preenchido
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 border border-amber-500/30 shrink-0">
      <Circle size={11} strokeWidth={2.5} /> Pendente
    </span>
  )
}

// ── Success Overlay ──────────────────────────────────────────────────────────
function SuccessOverlay({ form, onNew }: { form: VisitFormState; onNew: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md animate-fade-in-up p-4">
      {/* Confetti dots - decorative */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bounce"
            style={{
              width: `${6 + (i % 4) * 3}px`,
              height: `${6 + (i % 4) * 3}px`,
              top: `${Math.random() * 80 + 5}%`,
              left: `${Math.random() * 90 + 2}%`,
              background: ['#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#f97316'][i % 6],
              animationDelay: `${i * 0.08}s`,
              animationDuration: `${0.8 + (i % 3) * 0.3}s`,
              opacity: 0.75
            }}
          />
        ))}
      </div>

      <div className="relative max-w-sm w-full bg-card rounded-3xl border border-border shadow-[var(--shadow-elegant)] p-8 text-center flex flex-col items-center gap-5">
        {/* Icon */}
        <div className="h-20 w-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
          <PartyPopper size={40} className="text-emerald-500" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatório Salvo!</h2>
          <p className="mt-1 text-sm text-muted-foreground">Visita registrada com sucesso.</p>
        </div>

        {/* Summary Card */}
        <div className="w-full rounded-2xl bg-secondary/60 border border-border p-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <ClipboardList size={12} /> Resumo
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Número:</span>
            <span className="font-mono font-bold text-brand-red">{form.numero}</span>
            <span className="text-muted-foreground">Loja:</span>
            <span className="font-semibold truncate">{form.empresa || '—'}</span>
            <span className="text-muted-foreground">Local:</span>
            <span className="font-semibold truncate">{form.local || '—'}</span>
            <span className="text-muted-foreground">Ponto Extra:</span>
            <span className="font-semibold">{form.pontoExtra || '—'}</span>
            <span className="text-muted-foreground">Estoque:</span>
            <span className="font-semibold">{form.situacaoEstoque || '—'}</span>
            <span className="text-muted-foreground">Ruptura:</span>
            <span className="font-semibold">{form.ruptura || '—'}</span>
          </div>
        </div>

        <button
          onClick={onNew}
          style={{ backgroundImage: 'var(--gradient-accent)' }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-brand-red-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-[0.99] transition-transform"
        >
          <ClipboardList size={16} />
          Registrar Nova Visita
        </button>
      </div>
    </div>
  )
}



export const RelatorioVisitasForm: React.FC = () => {
  const { user, fullName } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState<VisitFormState>({
    empresa: '',
    responsavel: fullName || user?.email?.split('@')[0] || '',
    numero: '',
    data: new Date().toISOString(),
    status: 'Realizada',
    horarioChegada: '',
    horarioSaida: '',
    local: '',
    pontoExtra: '',
    tipoPontoExtra: [],
    tipoPontoExtraOutro: '',
    materiaisPositivados: [],
    materiaisPositivadosOutro: '',
    preco: [],
    situacaoEstoque: '',
    ruptura: ''
  })

  const [loading, setLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [savedForm, setSavedForm] = useState<VisitFormState | null>(null)

  // Fetch next visit report number
  async function fetchNextVisitNumber() {
    try {
      const year = new Date().getFullYear()
      const { data } = await supabase
        .from('relatorios_visitas')
        .select('numero')
        .like('numero', `V-${year}-%`)
        .order('numero', { ascending: false })
        .limit(1)

      const lastNum = data?.[0]?.numero
        ? parseInt(data[0].numero.split('-')[2]) || 0
        : 0
      const nextNum = lastNum + 1
      const generatedNumber = `V-${year}-${String(nextNum).padStart(4, '0')}`
      setForm(prev => {
        if (!prev.numero) {
          return { ...prev, numero: generatedNumber }
        }
        return prev
      })
    } catch (err) {
      console.error('Error fetching visit report number:', err)
    }
  }

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_VISITA_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setForm(prev => ({
          ...prev,
          ...parsed,
          tipoPontoExtra: parsed.tipoPontoExtra || [],
          materiaisPositivados: parsed.materiaisPositivados || [],
          preco: parsed.preco || []
        }))
      } catch (e) {
        console.error('Error parsing draft:', e)
      }
    }
    setIsLoaded(true)
    fetchNextVisitNumber()
  }, [])

  // Auto-fill responsible user name when resolved
  useEffect(() => {
    const defaultName = fullName || user?.email?.split('@')[0] || ''
    if (defaultName) {
      setForm(prev => ({ ...prev, responsavel: defaultName }))
    }
  }, [fullName, user])

  // Save draft on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(DRAFT_VISITA_KEY, JSON.stringify(form))
    }
  }, [form, isLoaded])

  // ── Completion logic ─────────────────────────────────────────────────────
  const sections = useMemo(() => {
    const lojaOk = form.empresa.trim().length > 0
    const localOk = form.local.trim().length > 0
    const pontoExtraOk = form.pontoExtra !== ''
    const tipoPontoExtraOk = form.tipoPontoExtra.length > 0 &&
      (!form.tipoPontoExtra.includes('Outro') || form.tipoPontoExtraOutro.trim().length > 0)
    const materiaisOk = form.materiaisPositivados.length > 0 &&
      (!form.materiaisPositivados.includes('Outro') || form.materiaisPositivadosOutro.trim().length > 0)
    const precoOk = form.preco.length > 0
    const estoqueOk = form.situacaoEstoque !== ''
    const rupturaOk = form.ruptura !== ''

    return { lojaOk, localOk, pontoExtraOk, tipoPontoExtraOk, materiaisOk, precoOk, estoqueOk, rupturaOk }
  }, [form])

  const completedCount = useMemo(
    () => Object.values(sections).filter(Boolean).length,
    [sections]
  )
  const totalSections = Object.keys(sections).length
  const completionPercent = Math.round((completedCount / totalSections) * 100)

  // Get human readable text summary of checklist options
  function getFormattedSummary(f: VisitFormState): string {
    const pontoExtraStr = f.pontoExtra
      ? `${f.pontoExtra}${f.tipoPontoExtra.length > 0 ? ` (${f.tipoPontoExtra.join(', ')}${f.tipoPontoExtraOutro ? `: ${f.tipoPontoExtraOutro}` : ''})` : ''}`
      : '—'
    
    const materiaisStr = f.materiaisPositivados.length > 0
      ? `${f.materiaisPositivados.join(', ')}${f.materiaisPositivadosOutro ? `: ${f.materiaisPositivadosOutro}` : ''}`
      : '—'

    const precoStr = f.preco.length > 0 ? f.preco.join(', ') : '—'

    return [
      `Horário Chegada: ${f.horarioChegada || '—'}`,
      `Horário Saída: ${f.horarioSaida || '—'}`,
      `Ponto Extra: ${pontoExtraStr}`,
      `Materiais Positivados: ${materiaisStr}`,
      `Preço: ${precoStr}`,
      `Situação do Estoque: ${f.situacaoEstoque || '—'}`,
      `Ruptura: ${f.ruptura || '—'}`
    ].join('\n')
  }

  function validateForm(): boolean {
    if (!form.empresa.trim()) {
      showToast('Por favor, informe o nome da loja.', 'error')
      return false
    }
    if (!form.local.trim()) {
      showToast('Por favor, informe o Local (cidade e bairro).', 'error')
      return false
    }
    if (!form.pontoExtra) {
      showToast('Por favor, selecione se há Ponto Extra.', 'error')
      return false
    }
    if (form.tipoPontoExtra.length === 0) {
      showToast('Por favor, selecione pelo menos um Tipo de Ponto Extra.', 'error')
      return false
    }
    if (form.tipoPontoExtra.includes('Outro') && !form.tipoPontoExtraOutro.trim()) {
      showToast('Por favor, digite o tipo de ponto extra no campo "Outro".', 'error')
      return false
    }
    if (form.materiaisPositivados.length === 0) {
      showToast('Por favor, selecione pelo menos um Material Positivado.', 'error')
      return false
    }
    if (form.materiaisPositivados.includes('Outro') && !form.materiaisPositivadosOutro.trim()) {
      showToast('Por favor, digite o material no campo "Outro".', 'error')
      return false
    }
    if (form.preco.length === 0) {
      showToast('Por favor, selecione pelo menos uma opção de Preço.', 'error')
      return false
    }
    if (!form.situacaoEstoque) {
      showToast('Por favor, selecione a Situação do Estoque.', 'error')
      return false
    }
    if (!form.ruptura) {
      showToast('Por favor, selecione se há Ruptura.', 'error')
      return false
    }
    return true
  }

  function resetForm() {
    setForm({
      empresa: '',
      responsavel: fullName || user?.email?.split('@')[0] || '',
      numero: '',
      data: new Date().toISOString(),
      status: 'Realizada',
      horarioChegada: '',
      horarioSaida: '',
      local: '',
      pontoExtra: '',
      tipoPontoExtra: [],
      tipoPontoExtraOutro: '',
      materiaisPositivados: [],
      materiaisPositivadosOutro: '',
      preco: [],
      situacaoEstoque: '',
      ruptura: ''
    })
    localStorage.removeItem(DRAFT_VISITA_KEY)
    fetchNextVisitNumber()
  }

  const handleCheckboxChange = (
    field: 'tipoPontoExtra' | 'materiaisPositivados' | 'preco',
    option: string
  ) => {
    setForm(prev => {
      const current = prev[field] as string[]
      let next: string[]
      if (current.includes(option)) {
        next = current.filter(o => o !== option)
      } else {
        if (field === 'tipoPontoExtra' && option === 'Sem Ponto Extra') {
          next = ['Sem Ponto Extra']
        } else if (field === 'tipoPontoExtra' && current.includes('Sem Ponto Extra')) {
          next = [...current.filter(o => o !== 'Sem Ponto Extra'), option]
        } else {
          next = [...current, option]
        }
      }
      return { ...prev, [field]: next }
    })
  }

  const handlePontoExtraChange = (val: 'Sim' | 'Não') => {
    setForm(prev => {
      const nextTipo = val === 'Não' ? ['Sem Ponto Extra'] : prev.tipoPontoExtra.filter(o => o !== 'Sem Ponto Extra')
      return {
        ...prev,
        pontoExtra: val,
        tipoPontoExtra: nextTipo
      }
    })
  }

  async function saveVisitToDatabase() {
    setLoading(true)
    const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000'
    
    const structuredData = {
      horarioChegada: form.horarioChegada,
      horarioSaida: form.horarioSaida,
      local: form.local,
      pontoExtra: form.pontoExtra,
      tipoPontoExtra: form.tipoPontoExtra,
      tipoPontoExtraOutro: form.tipoPontoExtraOutro,
      materiaisPositivados: form.materiaisPositivados,
      materiaisPositivadosOutro: form.materiaisPositivadosOutro,
      preco: form.preco,
      situacaoEstoque: form.situacaoEstoque,
      ruptura: form.ruptura,
    }

    try {
      const { data, error } = await supabase
        .from('relatorios_visitas')
        .insert({
          numero: form.numero.trim(),
          empresa: form.empresa.trim(),
          responsavel: form.responsavel.trim(),
          data: form.data,
          motivo: form.local.trim(),
          atividades: getFormattedSummary(form),
          observacoes: JSON.stringify(structuredData),
          status: form.status,
          created_by: isMockUser ? null : user?.id
        })
        .select()
        .single()

      if (error) throw error

      // Log in history
      await supabase.from('historico').insert({
        user_id: isMockUser ? null : user?.id,
        action: 'CREATE_REPORT_VISITA',
        details: { report_number: form.numero, empresa: form.empresa }
      })

      return data
    } catch (e) {
      console.error(e)
      showToast('Erro ao salvar relatório de visita no banco de dados.', 'error')
      throw e
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!validateForm()) return
    try {
      const snapshot = { ...form }
      await saveVisitToDatabase()
      setSavedForm(snapshot)
      setShowSuccess(true)
    } catch (e) {}
  }

  function handleNewVisit() {
    setShowSuccess(false)
    setSavedForm(null)
    resetForm()
  }

  return (
    <>
      {/* Success overlay */}
      {showSuccess && savedForm && (
        <SuccessOverlay form={savedForm} onNew={handleNewVisit} />
      )}

      <div className="space-y-6 max-w-3xl mx-auto">
        {/* METADATA TOP BAR */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-soft)] flex flex-wrap gap-4 items-center justify-between text-sm">
          <div className="flex gap-4">
            <div>
              <span className="text-muted-foreground">Responsável:</span>{' '}
              <span className="font-semibold">{form.responsavel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Número:</span>{' '}
              <span className="font-mono font-semibold text-brand-red">{form.numero || 'V-XXXX-XXXX'}</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as any })}
              className="bg-transparent font-semibold border-b border-border focus:outline-none focus:border-brand-red py-0.5"
            >
              <option value="Realizada">Realizada</option>
              <option value="Agendada">Agendada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* 3. QUAL LOJA? */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              Qual loja? <span className="text-brand-red font-bold">*</span>
            </label>
            <div className="flex items-center gap-2">
              <SectionBadge filled={sections.lojaOk} />
              <Building2 size={16} className="text-muted-foreground opacity-60" />
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground italic mb-4 block">
            DIGITE APENAS O NOME DA LOJA
          </span>
          <input
            value={form.empresa}
            onChange={e => setForm({ ...form, empresa: e.target.value })}
            placeholder="Sua resposta"
            className="input w-full border-0 border-b border-border rounded-none px-0 focus:border-brand-red focus:box-shadow-none focus:ring-0 focus:outline-none"
          />
        </section>

        {/* 4. LOCAL */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              Local <span className="text-brand-red font-bold">*</span>
            </label>
            <div className="flex items-center gap-2">
              <SectionBadge filled={sections.localOk} />
              <MapPin size={16} className="text-muted-foreground opacity-60" />
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground italic mb-4 block">
            DIGITE NOME DA CIDADE E BAIRRO
          </span>
          <input
            value={form.local}
            onChange={e => setForm({ ...form, local: e.target.value })}
            placeholder="Sua resposta"
            className="input w-full border-0 border-b border-border rounded-none px-0 focus:border-brand-red focus:box-shadow-none focus:ring-0 focus:outline-none"
          />
        </section>

        {/* 5. PONTO EXTRA */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              Ponto Extra <span className="text-brand-red font-bold">*</span>
            </span>
            <div className="flex items-center gap-2">
              <SectionBadge filled={sections.pontoExtraOk} />
              <Sparkles size={16} className="text-muted-foreground opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            {['Sim', 'Não'].map(val => (
              <div 
                key={val}
                onClick={() => handlePontoExtraChange(val as any)}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                  form.pontoExtra === val 
                    ? 'border-brand-red bg-brand-red/5 font-bold text-brand-red shadow-[0_0_12px_rgba(212,12,26,0.06)]' 
                    : 'border-border bg-card hover:bg-secondary/40 text-foreground'
                }`}
              >
                <span className="text-sm font-semibold">{val}</span>
                {/* Custom Radio Circle */}
                <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  form.pontoExtra === val
                    ? 'border-brand-red bg-brand-red'
                    : 'border-muted-foreground/45 bg-transparent'
                }`}>
                  {form.pontoExtra === val && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. TIPO DE PONTO EXTRA */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              Tipo de Ponto Extra <span className="text-brand-red font-bold">*</span>
            </span>
            <div className="flex items-center gap-2">
              <SectionBadge filled={sections.tipoPontoExtraOk} />
              <Sparkles size={16} className="text-muted-foreground opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['Ponta de Gondola', 'Ilha', 'Sem Ponto Extra'].map(opt => {
              const isChecked = form.tipoPontoExtra.includes(opt)
              return (
                <div 
                  key={opt}
                  onClick={() => handleCheckboxChange('tipoPontoExtra', opt)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                    isChecked
                      ? 'border-brand-red bg-brand-red/5 font-bold text-brand-red shadow-[0_0_12px_rgba(212,12,26,0.06)]'
                      : 'border-border bg-card hover:bg-secondary/40 text-foreground'
                  }`}
                >
                  <span className="text-sm font-semibold">{opt}</span>
                  {/* Custom Checkbox Square */}
                  <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'border-brand-red bg-brand-red'
                      : 'border-muted-foreground/45 bg-transparent'
                  }`}>
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-3 w-3 text-white">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Outro Option */}
            <div 
              onClick={() => {
                if (!form.tipoPontoExtra.includes('Outro')) {
                  handleCheckboxChange('tipoPontoExtra', 'Outro')
                }
              }}
              className={`flex flex-col gap-2 p-4 rounded-xl border cursor-pointer transition-all ${
                form.tipoPontoExtra.includes('Outro')
                  ? 'border-brand-red bg-brand-red/5 font-bold shadow-[0_0_12px_rgba(212,12,26,0.06)]'
                  : 'border-border bg-card hover:bg-secondary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${form.tipoPontoExtra.includes('Outro') ? 'text-brand-red' : 'text-foreground'}`}>Outro:</span>
                <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                  form.tipoPontoExtra.includes('Outro')
                    ? 'border-brand-red bg-brand-red'
                    : 'border-muted-foreground/45 bg-transparent'
                }`}>
                  {form.tipoPontoExtra.includes('Outro') && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-3 w-3 text-white">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
              {form.tipoPontoExtra.includes('Outro') && (
                <input
                  value={form.tipoPontoExtraOutro}
                  onChange={e => setForm({ ...form, tipoPontoExtraOutro: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  placeholder="Especifique..."
                  className="input text-sm w-full mt-1 border-0 border-b border-brand-red/50 focus:border-brand-red px-0 rounded-none bg-transparent"
                />
              )}
            </div>
          </div>
        </section>

        {/* 7. MATERIAIS POSITIVADOS (MERCHAN) */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              Materiais Positivados (Merchan) <span className="text-brand-red font-bold">*</span>
            </span>
            <div className="flex items-center gap-2">
              <SectionBadge filled={sections.materiaisOk} />
              <Sparkles size={16} className="text-muted-foreground opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Expositor de Tintas',
              'Expositor de Ferro',
              'Expositor Rejunte',
              'Testeira',
              'Linguenta',
              'Orelha',
              'Catálogo',
              'Bandeirola'
            ].map(opt => {
              const isChecked = form.materiaisPositivados.includes(opt)
              return (
                <div 
                  key={opt}
                  onClick={() => handleCheckboxChange('materiaisPositivados', opt)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                    isChecked
                      ? 'border-brand-red bg-brand-red/5 font-bold text-brand-red shadow-[0_0_12px_rgba(212,12,26,0.06)]'
                      : 'border-border bg-card hover:bg-secondary/40 text-foreground'
                  }`}
                >
                  <span className="text-sm font-semibold">{opt}</span>
                  <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'border-brand-red bg-brand-red'
                      : 'border-muted-foreground/45 bg-transparent'
                  }`}>
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-3 w-3 text-white">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Outro Option */}
            <div 
              onClick={() => {
                if (!form.materiaisPositivados.includes('Outro')) {
                  handleCheckboxChange('materiaisPositivados', 'Outro')
                }
              }}
              className={`flex flex-col gap-2 p-4 rounded-xl border cursor-pointer transition-all ${
                form.materiaisPositivados.includes('Outro')
                  ? 'border-brand-red bg-brand-red/5 font-bold shadow-[0_0_12px_rgba(212,12,26,0.06)]'
                  : 'border-border bg-card hover:bg-secondary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${form.materiaisPositivados.includes('Outro') ? 'text-brand-red' : 'text-foreground'}`}>Outro:</span>
                <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                  form.materiaisPositivados.includes('Outro')
                    ? 'border-brand-red bg-brand-red'
                    : 'border-muted-foreground/45 bg-transparent'
                }`}>
                  {form.materiaisPositivados.includes('Outro') && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-3 w-3 text-white">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
              {form.materiaisPositivados.includes('Outro') && (
                <input
                  value={form.materiaisPositivadosOutro}
                  onChange={e => setForm({ ...form, materiaisPositivadosOutro: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  placeholder="Especifique..."
                  className="input text-sm w-full mt-1 border-0 border-b border-brand-red/50 focus:border-brand-red px-0 rounded-none bg-transparent"
                />
              )}
            </div>
          </div>
        </section>

        {/* 8. PREÇO */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              Preço <span className="text-brand-red font-bold">*</span>
            </span>
            <div className="flex items-center gap-2">
              <SectionBadge filled={sections.precoOk} />
              <DollarSign size={16} className="text-muted-foreground opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['Produtos Precificados', 'Preços Atualizados'].map(opt => {
              const isChecked = form.preco.includes(opt)
              return (
                <div 
                  key={opt}
                  onClick={() => handleCheckboxChange('preco', opt)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                    isChecked
                      ? 'border-brand-red bg-brand-red/5 font-bold text-brand-red shadow-[0_0_12px_rgba(212,12,26,0.06)]'
                      : 'border-border bg-card hover:bg-secondary/40 text-foreground'
                  }`}
                >
                  <span className="text-sm font-semibold">{opt}</span>
                  <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'border-brand-red bg-brand-red'
                      : 'border-muted-foreground/45 bg-transparent'
                  }`}>
                    {isChecked && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-3 w-3 text-white">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 9. QUAL A SITUAÇÃO DO ESTOQUE */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              Qual a situação do Estoque <span className="text-brand-red font-bold">*</span>
            </span>
            <div className="flex items-center gap-2">
              <SectionBadge filled={sections.estoqueOk} />
              <Package size={16} className="text-muted-foreground opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['Adequado', 'Moderado', 'Baixa'].map(val => (
              <div 
                key={val}
                onClick={() => setForm({ ...form, situacaoEstoque: val as any })}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                  form.situacaoEstoque === val 
                    ? 'border-brand-red bg-brand-red/5 font-bold text-brand-red shadow-[0_0_12px_rgba(212,12,26,0.06)]' 
                    : 'border-border bg-card hover:bg-secondary/40 text-foreground'
                }`}
              >
                <span className="text-sm font-semibold">{val}</span>
                <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  form.situacaoEstoque === val
                    ? 'border-brand-red bg-brand-red'
                    : 'border-muted-foreground/45 bg-transparent'
                }`}>
                  {form.situacaoEstoque === val && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 10. RUPTURA */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              Ruptura <span className="text-brand-red font-bold">*</span>
            </span>
            <div className="flex items-center gap-2">
              <SectionBadge filled={sections.rupturaOk} />
              <AlertTriangle size={16} className="text-muted-foreground opacity-60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            {['Sim', 'Não'].map(val => (
              <div 
                key={val}
                onClick={() => setForm({ ...form, ruptura: val as any })}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                  form.ruptura === val 
                    ? 'border-brand-red bg-brand-red/5 font-bold text-brand-red shadow-[0_0_12px_rgba(212,12,26,0.06)]' 
                    : 'border-border bg-card hover:bg-secondary/40 text-foreground'
                }`}
              >
                <span className="text-sm font-semibold">{val}</span>
                <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  form.ruptura === val
                    ? 'border-brand-red bg-brand-red'
                    : 'border-muted-foreground/45 bg-transparent'
                }`}>
                  {form.ruptura === val && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM ACTIONS BAR */}
        <div className="flex flex-wrap gap-3 sticky bottom-4 z-10 no-print pt-4 bg-background/80 backdrop-blur-md border-t border-border">
          {/* Pending counter badge */}
          {completionPercent < 100 && (
            <div className="flex-1 sm:flex-none flex items-center gap-2 rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <AlertTriangle size={14} />
              {totalSections - completedCount} campo{totalSections - completedCount !== 1 ? 's' : ''} pendente{totalSections - completedCount !== 1 ? 's' : ''}
            </div>
          )}
          {completionPercent === 100 && (
            <div className="flex-1 sm:flex-none flex items-center gap-2 rounded-xl px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={14} />
              Tudo preenchido! Pronto para salvar.
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            style={{ backgroundImage: 'var(--gradient-accent)' }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-brand-red-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            Salvar
          </button>
        </div>
      </div>
    </>
  )
}

export default RelatorioVisitasForm
