import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { generateVisitPDF } from '../utils/pdfGenerator'
import { 
  Save, 
  Printer, 
  FileDown, 
  LoaderCircle
} from 'lucide-react'

export interface VisitData {
  empresa: string
  responsavel: string
  numero: string
  data: string
  motivo: string
  atividades: string
  observacoes: string
  status: 'Agendada' | 'Realizada' | 'Cancelada'
}

const DRAFT_VISITA_KEY = 'domestre.draft_visita.v1'

export const RelatorioVisitasForm: React.FC = () => {
  const { user, fullName } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState<VisitData>({
    empresa: '',
    responsavel: fullName || user?.email?.split('@')[0] || '',
    numero: '',
    data: new Date().toISOString(),
    motivo: '',
    atividades: '',
    observacoes: '',
    status: 'Realizada'
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
        setForm(JSON.parse(saved))
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

  function validateForm(): boolean {
    if (!form.empresa.trim()) {
      showToast('Por favor, informe a empresa visitada.', 'error')
      return false
    }
    if (!form.responsavel.trim()) {
      showToast('Por favor, informe o responsável pela visita.', 'error')
      return false
    }
    if (!form.motivo.trim()) {
      showToast('Por favor, informe o motivo da visita.', 'error')
      return false
    }
    if (!form.atividades.trim()) {
      showToast('Por favor, detalhe as atividades realizadas.', 'error')
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
      motivo: '',
      atividades: '',
      observacoes: '',
      status: 'Realizada'
    })
    localStorage.removeItem(DRAFT_VISITA_KEY)
    fetchNextVisitNumber()
  }

  async function saveVisitToDatabase() {
    setLoading(true)
    const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000'
    try {
      const { data, error } = await supabase
        .from('relatorios_visitas')
        .insert({
          numero: form.numero.trim(),
          empresa: form.empresa.trim(),
          responsavel: form.responsavel.trim(),
          data: form.data,
          motivo: form.motivo.trim(),
          atividades: form.atividades.trim(),
          observacoes: form.observacoes.trim(),
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
      generateVisitPDF(form)
      resetForm()
      showToast('Relatório de Visita gerado e exportado com sucesso!', 'success')
    } catch (e) {}
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: HEADER INFO */}
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-bold text-foreground mb-4">Dados da Visita</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Cliente / Empresa Visitada *
            </span>
            <input
              value={form.empresa}
              onChange={e => setForm({ ...form, empresa: e.target.value })}
              placeholder="Razão social ou nome fantasia do cliente"
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Visitador / Responsável *
            </span>
            <input
              value={form.responsavel}
              onChange={e => setForm({ ...form, responsavel: e.target.value })}
              placeholder="Quem realizou a visita"
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Nº do Relatório
            </span>
            <input
              value={form.numero}
              onChange={e => setForm({ ...form, numero: e.target.value })}
              className="input font-mono"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Data
              </span>
              <input
                type="date"
                value={form.data.slice(0, 10)}
                onChange={e => setForm({ ...form, data: new Date(e.target.value).toISOString() })}
                className="input"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Status
              </span>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as any })}
                className="input"
              >
                <option value="Realizada">Realizada</option>
                <option value="Agendada">Agendada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* SECTION 2: DETAILS */}
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-bold text-foreground mb-4">Detalhamento da Visita</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Motivo / Assunto Principal *
            </span>
            <input
              value={form.motivo}
              onChange={e => setForm({ ...form, motivo: e.target.value })}
              placeholder="Ex.: Apresentação de novos produtos, assistência técnica de rejunte, etc."
              className="input"
            />
          </label>
          
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Atividades Realizadas *
            </span>
            <textarea
              rows={4}
              value={form.atividades}
              onChange={e => setForm({ ...form, atividades: e.target.value })}
              placeholder="Detalhe o que foi feito na visita, feedbacks do cliente, problemas encontrados..."
              className="input min-h-[120px]"
            />
          </label>
          
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Observações / Próximos Passos
            </span>
            <textarea
              rows={2}
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações complementares, prazos de retorno, compromissos firmados..."
              className="input min-h-[60px]"
            />
          </label>
        </div>
      </section>

      {/* BOTTOM ACTIONS BAR */}
      <div className="flex flex-wrap gap-3 sticky bottom-4 z-10 no-print">
        <button
          onClick={handleGeneratePDF}
          disabled={loading}
          style={{ backgroundImage: 'var(--gradient-accent)' }}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-brand-red-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-60 disabled:hover:scale-100"
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
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
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
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>
    </div>
  )
}
export default RelatorioVisitasForm
