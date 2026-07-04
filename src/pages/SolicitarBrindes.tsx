import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Gift, Send, LoaderCircle, Package, MapPin, Info } from 'lucide-react'

export const SolicitarBrindes: React.FC = () => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [itens, setItens] = useState('')
  const [endereco, setEndereco] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Buscar solicitações existentes
  const { data: solicitacoes, isLoading } = useQuery({
    queryKey: ['solicitacoes-brindes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_brindes')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!user?.id
  })

  // Mutação para criar nova solicitação
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!itens.trim()) throw new Error('Descreva os brindes desejados.')
      
      const { error } = await supabase
        .from('solicitacoes_brindes')
        .insert({
          itens_solicitados: itens,
          endereco_entrega: endereco,
          observacoes: observacoes,
          created_by: user?.id,
          status: 'Pendente'
        })
      
      if (error) throw error
    },
    onSuccess: () => {
      showToast('Sua solicitação de brindes foi enviada!', 'success')
      setItens('')
      setEndereco('')
      setObservacoes('')
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-brindes'] })
    },
    onError: (err: any) => {
      showToast(err.message || 'Falha ao enviar a solicitação.', 'error')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Aprovado': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Enviado': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Entregue': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Cancelado': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-secondary text-foreground border-border'
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <header className="mb-8 flex items-center gap-4">
          <div className="h-16 w-16 bg-brand-red/10 rounded-2xl flex items-center justify-center shrink-0">
            <Gift className="h-8 w-8 text-brand-red" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">
              Solicitar Brindes
            </h1>
            <p className="mt-1 text-muted-foreground">
              Peça materiais de marketing, brindes ou uniformes.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Formulário */}
          <div className="lg:col-span-5">
            <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-border bg-secondary/30">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <Package size={18} className="text-brand-red" />
                  Nova Solicitação
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Brindes / Materiais Desejados <span className="text-brand-red">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Ex: 3 bonés, 2 camisetas tamanho G, etc.
                  </p>
                  <textarea
                    required
                    value={itens}
                    onChange={e => setItens(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors min-h-[100px] resize-y"
                    placeholder="Descreva o que você precisa..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Endereço ou Filial para Entrega
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={endereco}
                      onChange={e => setEndereco(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-12 pr-4 py-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors"
                      placeholder="Ex: Filial Centro, Rua das Flores 123..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Observações (Opcional)
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors min-h-[80px] resize-y"
                    placeholder="Alguma observação importante para o envio?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending || !itens.trim()}
                  className="w-full h-12 bg-brand-navy text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-red transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {createMutation.isPending ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <>
                      Enviar Solicitação
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Histórico */}
          <div className="lg:col-span-7">
            <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-3xl overflow-hidden h-full">
              <div className="p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <Info size={18} className="text-brand-navy" />
                  Minhas Solicitações
                </h2>
              </div>
              <div className="p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <LoaderCircle className="h-8 w-8 animate-spin text-brand-red mb-4" />
                    <p className="text-sm text-muted-foreground font-medium">Carregando histórico...</p>
                  </div>
                ) : !solicitacoes || solicitacoes.length === 0 ? (
                  <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl">
                    <Gift className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h3 className="text-lg font-bold text-foreground">Nenhum brinde solicitado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Quando você fizer solicitações, o status de entrega aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {solicitacoes.map((sol) => (
                      <div key={sol.id} className="p-5 rounded-2xl border border-border hover:border-brand-navy/30 hover:shadow-md transition-all bg-background">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(sol.status)}`}>
                            {sol.status}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(sol.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'long', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-3 leading-relaxed whitespace-pre-wrap">
                          {sol.itens_solicitados}
                        </p>
                        
                        {sol.endereco_entrega && (
                          <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border/60">
                            <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground/80">Entrega: </span>
                              {sol.endereco_entrega}
                            </p>
                          </div>
                        )}
                        {sol.observacoes && (
                          <div className="flex items-start gap-2 mt-2">
                            <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground/80">Obs: </span>
                              {sol.observacoes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
export default SolicitarBrindes
