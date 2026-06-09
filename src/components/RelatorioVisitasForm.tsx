import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { generateVisitPDF } from '../utils/pdfGenerator'
import { 
  Save, 
  Printer, 
  FileDown, 
  LoaderCircle,
  Building2,
  MapPin,
  Sparkles,
  DollarSign,
  Package,
  AlertTriangle
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

  // Fetch next visit report number
  async function fetchNextVisitNumber() {
    try {
      const year = new Date().getFullYear()
      const { count } = await supabase
        .from('relatorios_visitas')
        .select('*', { count: 'exact', head: true })
        .like('numero', `V-${year}-%`)

      const nextNum = (count || 0) + 1
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
    if (fullName && !form.responsavel) {
      setForm(prev => ({ ...prev, responsavel: fullName }))
    }
  }, [fullName])

  // Save draft on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(DRAFT_VISITA_KEY, JSON.stringify(form))
    }
  }, [form, isLoaded])

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
    /*
    if (!form.horarioChegada) {
      showToast('Por favor, informe o Horário de Chegada.', 'error')
      return false
    }
    if (!form.horarioSaida) {
      showToast('Por favor, informe o Horário de Saída.', 'error')
      return false
    }
    */
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
      await saveVisitToDatabase()
      resetForm()
      showToast('Relatório de Visita salvo com sucesso!', 'success')
    } catch (e) {}
  }

  async function handleGeneratePDF() {
    if (!validateForm()) return
    try {
      await saveVisitToDatabase()
      
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

      generateVisitPDF({
        numero: form.numero,
        empresa: form.empresa,
        responsavel: form.responsavel,
        data: form.data,
        motivo: form.local,
        atividades: getFormattedSummary(form),
        observacoes: JSON.stringify(structuredData),
        status: form.status
      })
      
      resetForm()
      showToast('Relatório de Visita gerado e exportado com sucesso!', 'success')
    } catch (e) {}
  }

  return (
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

      {/* 1. HORÁRIO DE CHEGADA 
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
        <div className="flex items-center justify-between mb-4">
          <label className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            Horário de Chegada <span className="text-brand-red font-bold">*</span>
          </label>
          <Clock size={16} className="text-muted-foreground opacity-60" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground/85 block">Horário</span>
          <input
            type="time"
            value={form.horarioChegada}
            onChange={e => setForm({ ...form, horarioChegada: e.target.value })}
            className="input max-w-[200px]"
          />
        </div>
      </section>
      */}

      {/* 2. HORÁRIO DE SAÍDA
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
        <div className="flex items-center justify-between mb-4">
          <label className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            Horário de Saída <span className="text-brand-red font-bold">*</span>
          </label>
          <Clock size={16} className="text-muted-foreground opacity-60" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground/85 block">Horário</span>
          <input
            type="time"
            value={form.horarioSaida}
            onChange={e => setForm({ ...form, horarioSaida: e.target.value })}
            className="input max-w-[200px]"
          />
        </div>
      </section>
      */}

      {/* 3. QUAL LOJA? */}
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] transition-colors hover:border-border/80">
        <div className="flex items-center justify-between mb-2">
          <label className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            Qual loja? <span className="text-brand-red font-bold">*</span>
          </label>
          <Building2 size={16} className="text-muted-foreground opacity-60" />
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
          <MapPin size={16} className="text-muted-foreground opacity-60" />
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
          <Sparkles size={16} className="text-muted-foreground opacity-60" />
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
          <Sparkles size={16} className="text-muted-foreground opacity-60" />
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
          <Sparkles size={16} className="text-muted-foreground opacity-60" />
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
          <DollarSign size={16} className="text-muted-foreground opacity-60" />
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
          <Package size={16} className="text-muted-foreground opacity-60" />
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
          <AlertTriangle size={16} className="text-muted-foreground opacity-60" />
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
        <button
          onClick={handleGeneratePDF}
          disabled={loading}
          style={{ backgroundImage: 'var(--gradient-accent)' }}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-brand-red-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <FileDown size={18} />
          )}
          Gerar Relatório PDF
        </button>

        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          Salvar
        </button>

        <button
          onClick={() => window.print()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>
    </div>
  )
}

export default RelatorioVisitasForm
