import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Gift, Send, LoaderCircle, Package, User, Building2, AlignLeft, Hash } from 'lucide-react'

const BRINDES_DISPONIVEIS = [
  'Camiseta Oficial',
  'Boné',
  'Caneta Premium',
  'Mochila',
  'Garrafa Térmica',
  'Outro (Especificar)'
]

export const SolicitarBrindes: React.FC = () => {
  const { user, fullName } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [empresaId, setEmpresaId] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [brinde, setBrinde] = useState('')
  const [brindeEspecifico, setBrindeEspecifico] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [justificativa, setJustificativa] = useState('')

  // Buscar empresas cadastradas
  const { data: empresas } = useQuery({
    queryKey: ['empresas-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data
    }
  })

  // Buscar histórico de solicitações
  const { data: solicitacoes, isLoading } = useQuery({
    queryKey: ['solicitacoes-brindes', user?.id],
    queryFn: async () => {
      // Se for admin, pode querer ver todas (opcional), mas vamos filtrar pelo usuário por padrão a menos que especificado
      const { data, error } = await supabase
        .from('solicitacoes_brindes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!user?.id
  })

  // Mutação para criar nova solicitação
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!empresaNome) throw new Error('Selecione uma empresa.')
      if (!brinde) throw new Error('Selecione o brinde.')
      if (quantidade < 1) throw new Error('Quantidade deve ser pelo menos 1.')
      
      const brindeFinal = brinde === 'Outro (Especificar)' ? brindeEspecifico : brinde

      const { error } = await supabase
        .from('solicitacoes_brindes')
        .insert({
          user_id: user?.id,
          requester_name: fullName || user?.email,
          empresa_id: empresaId || null,
          empresa_nome: empresaNome,
          brinde_tipo: brindeFinal,
          quantidade: quantidade,
          justificativa: justificativa || 'Nenhuma',
          status: 'Pendente'
        })
      
      if (error) throw error
    },
    onSuccess: () => {
      showToast('Sua solicitação de brindes foi enviada!', 'success')
      setEmpresaId('')
      setEmpresaNome('')
      setBrinde('')
      setBrindeEspecifico('')
      setQuantidade(1)
      setJustificativa('')
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
    const s = (status || '').toLowerCase()
    if (s.includes('pendente')) return 'bg-gray-100 text-gray-700 border-gray-200'
    if (s.includes('aprovado')) return 'bg-blue-100 text-blue-700 border-blue-200'
    if (s.includes('recusado')) return 'bg-red-100 text-red-700 border-red-200'
    if (s.includes('enviado')) return 'bg-purple-100 text-purple-700 border-purple-200'
    if (s.includes('entregue')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    return 'bg-secondary text-foreground border-border'
  }

  const getStatusDot = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s.includes('pendente')) return 'bg-gray-500'
    if (s.includes('aprovado')) return 'bg-blue-500'
    if (s.includes('recusado')) return 'bg-red-500'
    if (s.includes('enviado')) return 'bg-purple-500'
    if (s.includes('entregue')) return 'bg-emerald-500'
    return 'bg-gray-400'
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <header className="mb-8 flex items-center gap-4">
          <div className="h-16 w-16 bg-brand-navy/10 rounded-2xl flex items-center justify-center shrink-0">
            <Gift className="h-8 w-8 text-brand-navy" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">
              Solicitar Brindes
            </h1>
            <p className="mt-1 text-muted-foreground">
              Solicite materiais para as empresas parceiras.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-8">
          
          {/* Formulário */}
          <div>
            <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-3xl overflow-hidden sticky top-24">
              <div className="p-6 border-b border-border bg-secondary/30">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <Package size={18} className="text-brand-red" />
                  Nova Solicitação
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                
                {/* Empresa */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Empresa <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      required
                      value={empresaNome}
                      onChange={e => {
                        setEmpresaNome(e.target.value)
                        const emp = empresas?.find(em => em.name === e.target.value)
                        setEmpresaId(emp ? emp.id : '')
                      }}
                      className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors appearance-none"
                    >
                      <option value="">Selecione a empresa...</option>
                      {empresas?.map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Brinde */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Brinde <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      required
                      value={brinde}
                      onChange={e => setBrinde(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors appearance-none"
                    >
                      <option value="">Selecione o brinde...</option>
                      {BRINDES_DISPONIVEIS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Brinde Específico (se 'Outro') */}
                {brinde === 'Outro (Especificar)' && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">
                      Especifique o Brinde <span className="text-brand-red">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={brindeEspecifico}
                      onChange={e => setBrindeEspecifico(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors"
                      placeholder="Qual brinde deseja?"
                    />
                  </div>
                )}

                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Quantidade <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      required
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={e => setQuantidade(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors"
                    />
                  </div>
                </div>

                {/* Justificativa */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Justificativa
                  </label>
                  <div className="relative">
                    <AlignLeft className="absolute left-4 top-[14px] h-4 w-4 text-muted-foreground" />
                    <textarea
                      value={justificativa}
                      onChange={e => setJustificativa(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors min-h-[80px] resize-y"
                      placeholder="Motivo da solicitação..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full h-12 bg-brand-navy text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-red transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:pointer-events-none mt-4"
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

          {/* Histórico Tabela */}
          <div className="overflow-hidden">
            <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-3xl overflow-hidden h-full">
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-secondary/40 text-xs uppercase font-bold text-muted-foreground border-b border-border tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Vendedor</th>
                      <th className="px-6 py-4">Empresa</th>
                      <th className="px-6 py-4 text-center">Brinde</th>
                      <th className="px-6 py-4 text-center">Quantidade</th>
                      <th className="px-6 py-4">Justificativa</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Obs. Adm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                          <LoaderCircle className="h-6 w-6 animate-spin mx-auto text-brand-red mb-2" />
                          Carregando dados...
                        </td>
                      </tr>
                    ) : !solicitacoes || solicitacoes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                          Nenhuma solicitação encontrada.
                        </td>
                      </tr>
                    ) : (
                      solicitacoes.map((sol) => (
                        <tr key={sol.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground text-xs">
                              {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(sol.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-muted-foreground" />
                              <span className="font-medium">{sol.requester_name || sol.promotor_name || 'Vendedor'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 font-medium">
                              <Building2 size={14} className="text-brand-navy" />
                              {sol.empresa_nome || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-secondary border border-border">
                              <Gift size={16} className="text-brand-red" />
                            </div>
                            <div className="text-[11px] font-semibold mt-1 max-w-[120px] truncate mx-auto" title={sol.brinde_tipo}>
                              {sol.brinde_tipo || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-base">
                            {sol.quantidade || 1}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-muted-foreground italic text-xs max-w-[150px] block truncate" title={sol.justificativa}>
                              {sol.justificativa || 'Nenhuma'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(sol.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(sol.status)}`}></span>
                              {sol.status || 'PENDENTE'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-muted-foreground text-xs max-w-[150px] block truncate" title={sol.observacao_admin}>
                              {sol.observacao_admin || '---'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
export default SolicitarBrindes
