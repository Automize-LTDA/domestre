import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { generateReportPDF } from '../utils/pdfGenerator'
import { 
  Minus, 
  Printer, 
  Save, 
  Trash2,
  FileDown,
  LoaderCircle
} from 'lucide-react'

// Material list
export const MATERIALS = [
  "Argamassa AC1",
  "Argamassa AC2",
  "Argamassa AC3",
  "Tinta Emborrachada 3,6L",
  "Tinta Emborrachada 18L",
  "Manta Líquida",
  "Rejunte Tipo 2",
  "Rejunte Siliconado",
  "Rejunte Piscinas",
  "Argamassa Impermeabilizante"
]

// Import images downloaded locally
import argamassaAc1 from '../assets/argamassa-ac1-BmpV27ny.jpeg'
import argamassaAc2 from '../assets/argamassa-ac2-CQZ9wPOC.jpeg'
import argamassaAc3 from '../assets/argamassa-ac3-B8WQUbpj.jpeg'
import tintaEmborrachada from '../assets/tinta-emborrachada-BbL48fij.jpeg'
import mantaLiquida from '../assets/manta-liquida-Cr8zedL_.jpeg'
import rejunteTipo2 from '../assets/rejunte-tipo2-N3UJjJ3P.jpeg'
import rejunteSiliconado from '../assets/rejunte-siliconado-BMqhJzFT.jpeg'
import rejuntePiscinas from '../assets/rejunte-piscinas-DJ6NXkgV.jpeg'
import argamassaImpermeabilizante from '../assets/argamassa-impermeabilizante-CTVnaWh2.jpeg'

export const MATERIAL_IMAGES: Record<string, string> = {
  "Argamassa AC1": argamassaAc1,
  "Argamassa AC2": argamassaAc2,
  "Argamassa AC3": argamassaAc3,
  "Tinta Emborrachada 3,6L": tintaEmborrachada,
  "Tinta Emborrachada 18L": tintaEmborrachada,
  "Manta Líquida": mantaLiquida,
  "Rejunte Tipo 2": rejunteTipo2,
  "Rejunte Siliconado": rejunteSiliconado,
  "Rejunte Piscinas": rejuntePiscinas,
  "Argamassa Impermeabilizante": argamassaImpermeabilizante
}

export interface ReportItem {
  id: string
  material: string
  quantidade: number
  tipoAvaria: string
}

export interface ReportData {
  empresa: string
  responsavel: string
  numero: string
  data: string
  itens: ReportItem[]
  situacao: string
  observacoes: string
}

interface RelatorioFormProps {
  compact?: boolean
}

const DRAFT_KEY = 'domestre.draft.v1'

export const RelatorioAvariasForm: React.FC<RelatorioFormProps> = ({ compact = false }) => {
  const { user, fullName } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState<ReportData>({
    empresa: '',
    responsavel: fullName || user?.email?.split('@')[0] || '',
    numero: '',
    data: new Date().toISOString(),
    itens: [],
    situacao: '',
    observacoes: ''
  })

  const [loading, setLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Fetch next report number from Supabase using MAX to avoid duplicate key conflicts
  async function fetchNextReportNumber() {
    try {
      const year = new Date().getFullYear()
      // Use MAX of existing numbers (sorted desc, limit 1) instead of COUNT
      // COUNT fails when records are deleted or partial inserts leave orphaned rows
      const { data } = await supabase
        .from('relatorios_avarias')
        .select('numero')
        .like('numero', `${year}-%`)
        .order('numero', { ascending: false })
        .limit(1)

      const lastNum = data?.[0]?.numero
        ? parseInt(data[0].numero.split('-')[1]) || 0
        : 0
      const nextNum = lastNum + 1
      const generatedNumber = `${year}-${String(nextNum).padStart(4, '0')}`

      setForm(prev => ({ ...prev, numero: generatedNumber }))
    } catch (err) {
      console.error('Error fetching report number:', err)
    }
  }

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Always clear the cached numero so it gets regenerated fresh from DB
        setForm({ ...parsed, numero: '' })
      } catch (e) {
        console.error('Error parsing draft:', e)
      }
    }
    setIsLoaded(true)
    fetchNextReportNumber()
  }, [])

  // Auto-fill responsible user name when it is resolved
  useEffect(() => {
    if (fullName && !form.responsavel) {
      setForm(prev => ({ ...prev, responsavel: fullName }))
    }
  }, [fullName])

  // Save draft to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    }
  }, [form, isLoaded])

  // Memoized total quantities
  const totalQuantities = useMemo(() => {
    return form.itens.reduce((acc, item) => acc + item.quantidade, 0)
  }, [form.itens])

  // Add material selection
  function handleAddMaterial(materialName: string) {
    setForm(prev => {
      // Find if same material exists without custom breakdown description
      const existing = prev.itens.find(item => item.material === materialName && !item.tipoAvaria)
      if (existing) {
        return {
          ...prev,
          itens: prev.itens.map(item => 
            item.id === existing.id 
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          )
        }
      }
      const newItem: ReportItem = {
        id: crypto.randomUUID(),
        material: materialName,
        quantidade: 1,
        tipoAvaria: ''
      }
      return {
        ...prev,
        itens: [...prev.itens, newItem]
      }
    })
  }

  // Remove material (decrement or delete)
  function handleRemoveMaterial(materialName: string) {
    setForm(prev => {
      // Find last added item of this material
      const existingWithoutDesc = [...prev.itens].reverse().find(item => item.material === materialName && !item.tipoAvaria)
      const existing = existingWithoutDesc || [...prev.itens].reverse().find(item => item.material === materialName)
      
      if (!existing) return prev

      if (existing.quantidade <= 1) {
        return {
          ...prev,
          itens: prev.itens.filter(item => item.id !== existing.id)
        }
      } else {
        return {
          ...prev,
          itens: prev.itens.map(item => 
            item.id === existing.id 
              ? { ...item, quantidade: item.quantidade - 1 }
              : item
          )
        }
      }
    })
  }

  // Remove specific item ID from the table
  function handleRemoveItem(itemId: string) {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== itemId)
    }))
  }

  // Update item quantity directly
  function handleUpdateItemQty(itemId: string, qtyStr: string) {
    const qty = Number(qtyStr)
    if (isNaN(qty) || qty <= 0) return
    setForm(prev => ({
      ...prev,
      itens: prev.itens.map(item => 
        item.id === itemId ? { ...item, quantidade: qty } : item
      )
    }))
  }

  // Update item observation/avaria directly
  function handleUpdateItemAvaria(itemId: string, avaria: string) {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.map(item => 
        item.id === itemId ? { ...item, tipoAvaria: avaria } : item
      )
    }))
  }

  // Validate form before save/export
  function validateForm(): boolean {
    if (!form.empresa.trim()) {
      showToast('Por favor, informe o nome da empresa atendida.', 'error')
      return false
    }
    if (!form.responsavel.trim()) {
      showToast('Por favor, informe o responsável pelo registro.', 'error')
      return false
    }
    if (form.itens.length === 0) {
      showToast('Selecione pelo menos um material avariado.', 'error')
      return false
    }
    return true
  }

  // Format final report payload for Supabase
  function getPreparedReport() {
    return {
      numero: form.numero.trim(),
      empresa: form.empresa.trim(),
      responsavel: form.responsavel.trim(),
      data: form.data,
      situacao: form.situacao.trim(),
      observacoes: form.observacoes.trim(),
      totalItens: totalQuantities,
      itens: form.itens.map(item => ({
        ...item,
        tipoAvaria: item.tipoAvaria.trim() ? item.tipoAvaria : form.situacao.trim()
      }))
    }
  }

  // Clear form and draft
  function resetForm() {
    setForm({
      empresa: '',
      responsavel: fullName || user?.email?.split('@')[0] || '',
      numero: '',
      data: new Date().toISOString(),
      itens: [],
      situacao: '',
      observacoes: ''
    })
    localStorage.removeItem(DRAFT_KEY)
    fetchNextReportNumber()
  }

  // Insert report data into Supabase
  async function saveReportToDatabase(preparedReport: ReturnType<typeof getPreparedReport>) {
    setLoading(true)
    const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000'
    try {
      // Insert report header
      const { data: insertedReport, error: reportErr } = await supabase
        .from('relatorios_avarias')
        .insert({
          numero: preparedReport.numero,
          empresa: preparedReport.empresa,
          responsavel: preparedReport.responsavel,
          data: preparedReport.data,
          situacao: preparedReport.situacao,
          observacoes: preparedReport.observacoes,
          total_itens: preparedReport.totalItens,
          created_by: isMockUser ? null : user?.id
        })
        .select()
        .single()

      if (reportErr) throw reportErr

      // Insert report items
      const itemsToInsert = preparedReport.itens.map(item => ({
        relatorio_id: insertedReport.id,
        material: item.material,
        quantidade: item.quantidade,
        tipo_avaria: item.tipoAvaria
      }))

      const { error: itemsErr } = await supabase
        .from('itens_relatorio_avaria')
        .insert(itemsToInsert)

      if (itemsErr) throw itemsErr

      // Log action in history
      await supabase.from('historico').insert({
        user_id: isMockUser ? null : user?.id,
        action: 'CREATE_REPORT_AVARIA',
        details: { report_number: preparedReport.numero, empresa: preparedReport.empresa }
      })

      return insertedReport
    } catch (e: any) {
      console.error('Supabase error:', e)
      showToast('Falha ao salvar relatório no banco de dados.', 'error')
      // Regenerate number to avoid duplicate key on retry
      fetchNextReportNumber()
      throw e
    } finally {
      setLoading(false)
    }
  }

  // Handle Save
  async function handleSave() {
    if (!validateForm()) return
    const prepared = getPreparedReport()
    try {
      await saveReportToDatabase(prepared)
      resetForm()
      showToast('Relatório de Avarias salvo com sucesso!', 'success')
    } catch (e) {
      // Error handled inside saveReportToDatabase
    }
  }

  // Handle Generate PDF
  async function handleGeneratePDF() {
    if (!validateForm()) return
    const prepared = getPreparedReport()
    try {
      await saveReportToDatabase(prepared)
      generateReportPDF(prepared)
      resetForm()
      showToast('Relatório de Avarias gerado e exportado com sucesso!', 'success')
    } catch (e) {
      // Error handled inside saveReportToDatabase
    }
  }

  return (
    <div className={`space-y-6 ${compact ? 'space-y-4' : ''}`}>
      {/* SECTION 1: REPORT DATA */}
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-bold text-foreground mb-4">Dados do Relatório</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Empresa atendida *
            </span>
            <input
              value={form.empresa}
              onChange={e => setForm({ ...form, empresa: e.target.value })}
              placeholder="Nome da empresa onde ocorreu a avaria"
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Responsável *
            </span>
            <input
              value={form.responsavel}
              onChange={e => setForm({ ...form, responsavel: e.target.value })}
              placeholder="Nome de quem registrou"
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
        </div>
      </section>

      {/* SECTION 2: MATERIAL GRID SELECTION */}
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-bold text-foreground mb-1">Selecione o material</h2>
        <p className="text-sm text-muted-foreground mb-4">Toque em um material para registrar a avaria</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MATERIALS.map(matName => {
            const matQty = form.itens
              .filter(item => item.material === matName)
              .reduce((acc, item) => acc + item.quantidade, 0)
            const isSelected = matQty > 0

            return (
              <button
                key={matName}
                type="button"
                onClick={() => handleAddMaterial(matName)}
                onContextMenu={e => {
                  e.preventDefault()
                  handleRemoveMaterial(matName)
                }}
                className={`relative rounded-xl border-2 overflow-hidden text-left text-sm font-semibold transition-all duration-200 flex flex-col ${
                  isSelected
                    ? 'border-brand-red bg-brand-red text-brand-red-foreground shadow-[var(--shadow-glow)] scale-[1.02]'
                    : 'border-border bg-secondary text-foreground hover:border-brand-navy hover:-translate-y-0.5'
                }`}
              >
                <div className="aspect-square w-full bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src={MATERIAL_IMAGES[matName]}
                    alt={matName}
                    loading="lazy"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
                <div className="px-3 py-2 leading-tight flex-1 flex items-center">
                  {matName}
                </div>
                {isSelected && (
                  <>
                    <span className="absolute top-2 right-2 inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-full bg-brand-red text-brand-red-foreground shadow-md text-xs font-bold font-mono">
                      {matQty}
                    </span>
                    <span
                      role="button"
                      aria-label={`Remover 1 de ${matName}`}
                      onClick={e => {
                        e.stopPropagation()
                        handleRemoveMaterial(matName)
                      }}
                      className="absolute top-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-red border border-brand-red shadow-md hover:bg-brand-red hover:text-brand-red-foreground transition-colors"
                    >
                      <Minus size={14} />
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground leading-normal">
          Toque novamente para somar +1. Use o botão <Minus size={12} className="inline" /> (ou clique com o botão direito) para remover 1. Edite a quantidade e o tipo de avaria na tabela abaixo.
        </p>
      </section>

      {/* SECTION 3: REGISTERED ITEMS TABLE */}
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-foreground">Itens registrados</h2>
          <div className="flex gap-2 text-xs">
            <div className="rounded-lg px-3 py-2 border bg-secondary border-border text-foreground">
              <div className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Total de itens</div>
              <div className="text-lg font-bold font-display leading-tight">{form.itens.length}</div>
            </div>
            <div className="rounded-lg px-3 py-2 border bg-brand-red text-brand-red-foreground border-brand-red">
              <div className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Soma das qtd.</div>
              <div className="text-lg font-bold font-display leading-tight">{totalQuantities}</div>
            </div>
          </div>
        </div>

        {form.itens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
            Nenhum item adicionado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-3">Material</th>
                  <th className="py-3 px-3 w-32 text-center">Quantidade</th>
                  <th className="py-3 px-3">Observação / Tipo de avaria</th>
                  <th className="py-3 px-3 w-20 text-center text-right">Remover</th>
                </tr>
              </thead>
              <tbody>
                {form.itens.map(item => {
                  return (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="py-3 px-3 font-semibold text-foreground">{item.material}</td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={e => handleUpdateItemQty(item.id, e.target.value)}
                          className="input h-9 w-20 font-mono text-center mx-auto"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={item.tipoAvaria}
                          onChange={e => handleUpdateItemAvaria(item.id, e.target.value)}
                          placeholder="Ex: Embalagem rasgada / Obs. adicional..."
                          className="input h-9 w-full"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remover Item"
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 4: FINAL DESCRIPTION */}
      <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-bold text-foreground mb-4">Descrição final</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Tipo de avaria (aplicado a todos os itens sem tipo definido)
            </span>
            <textarea
              rows={3}
              value={form.situacao}
              onChange={e => setForm({ ...form, situacao: e.target.value })}
              placeholder="Ex.: Embalagem rasgada, produto vencido, umidade..."
              className="input min-h-[90px]"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Observações
            </span>
            <textarea
              rows={2}
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Outros detalhes ou observações relevantes"
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
export default RelatorioAvariasForm
