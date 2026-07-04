import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { 
  Gift, Send, LoaderCircle, Package, Building2, AlignLeft, Hash, 
  Search, X, CheckCircle2, Clock, Inbox, AlertTriangle, Plus
} from 'lucide-react'

import canetaImg from '../assets/brinde_caneta.png'
import boneImg from '../assets/bone-mestre.png'
import cadernoImg from '../assets/brinde_caderneta.png'
import chaveiroImg from '../assets/brinde_chaveiro.png'

// Mock do catálogo
const CATALOGO_BRINDES = [
  {
    id: 'caneta',
    nome: 'Caneta Ecológica',
    descricao: 'Caneta de metal de alta qualidade com escrita macia e gravação da marca Do Mestre.',
    imagem: canetaImg,
    premium: true
  },
  {
    id: 'bone',
    nome: 'Boné Bordado',
    descricao: 'Boné premium estilo trucker preto com mascote bordado de alta definição da marca Do Mestre.',
    imagem: boneImg,
    premium: true
  },
  {
    id: 'caderno',
    nome: 'Caderneta Do Mestre',
    descricao: 'Caderneta de anotações estilo moleskine preto com mascote da marca Do Mestre impresso.',
    imagem: cadernoImg,
    premium: true
  },
  {
    id: 'chaveiro',
    nome: 'Chaveiro Abridor',
    descricao: 'Chaveiro de metal com acabamento escovado e logotipo do mascote Do Mestre.',
    imagem: chaveiroImg,
    premium: true
  }
]

export const SolicitarBrindes: React.FC = () => {
  const { user, fullName } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estado do Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedBrindeObj, setSelectedBrindeObj] = useState<typeof CATALOGO_BRINDES[0] | null>(null)
  
  // Estado do Formulário
  const [empresaId, setEmpresaId] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [brindeManual, setBrindeManual] = useState('')
  const [quantidade, setQuantidade] = useState<number | ''>(1)
  const [justificativa, setJustificativa] = useState('')

  // Buscar empresas
  const { data: empresas } = useQuery({
    queryKey: ['empresas-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, name').order('name')
      if (error) throw error
      return data
    }
  })

  // Buscar histórico
  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-brindes', user?.id],
    queryFn: async () => {
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

  // Mutação de Envio
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!empresaNome) throw new Error('Selecione uma empresa.')
      
      const brindeFinal = selectedBrindeObj ? selectedBrindeObj.nome : brindeManual
      if (!brindeFinal) throw new Error('Selecione um brinde.')
      if (quantidade === '' || quantidade < 1) throw new Error('Quantidade deve ser pelo menos 1.')
      
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
      showToast('Sua solicitação de brindes foi enviada com sucesso!', 'success')
      closeModal()
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-brindes'] })
    },
    onError: (err: any) => {
      showToast(err.message || 'Falha ao enviar a solicitação.', 'error')
    }
  })

  const handleOpenModal = (brinde?: typeof CATALOGO_BRINDES[0]) => {
    setSelectedBrindeObj(brinde || null)
    setEmpresaId('')
    setEmpresaNome('')
    setBrindeManual(brinde ? brinde.nome : '')
    setQuantidade(1)
    setJustificativa('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setTimeout(() => {
      setSelectedBrindeObj(null)
      setBrindeManual('')
    }, 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  // Filtragem
  const filteredSolicitacoes = useMemo(() => {
    return solicitacoes.filter(sol => {
      const s = (sol.status || '').toLowerCase()
      const t = activeTab.toLowerCase()
      const matchTab = t === 'todos' || s.includes(t)
      
      if (!matchTab) return false
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          (sol.brinde_tipo || '').toLowerCase().includes(search) ||
          (sol.empresa_nome || '').toLowerCase().includes(search) ||
          (sol.requester_name || '').toLowerCase().includes(search)
        )
      }
      return true
    })
  }, [solicitacoes, activeTab, searchTerm])

  // Estatísticas
  const stats = useMemo(() => {
    let total = 0, pendentes = 0, aprovados = 0, entregues = 0
    solicitacoes.forEach(sol => {
      total += (sol.quantidade || 1)
      const s = (sol.status || '').toLowerCase()
      if (s.includes('pendente') || s.includes('aguardando')) pendentes += (sol.quantidade || 1)
      if (s.includes('aprovado')) aprovados += (sol.quantidade || 1)
      if (s.includes('entregue')) entregues += (sol.quantidade || 1)
    })
    return { total, pendentes, aprovados, entregues }
  }, [solicitacoes])

  // Helpers de Cor
  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s.includes('pendente') || s.includes('aguardando')) return 'bg-amber-100 text-amber-700 border-amber-200'
    if (s.includes('aprovado') || s.includes('enviado') || s.includes('entregue')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (s.includes('recusado')) return 'bg-rose-100 text-rose-700 border-rose-200'
    return 'bg-secondary text-foreground border-border'
  }
  const getStatusDot = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s.includes('pendente') || s.includes('aguardando')) return 'bg-amber-500'
    if (s.includes('aprovado') || s.includes('enviado') || s.includes('entregue')) return 'bg-emerald-500'
    if (s.includes('recusado')) return 'bg-rose-500'
    return 'bg-gray-400'
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* HEADER DA PÁGINA */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
              Operação Comercial
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-brand-navy flex items-center gap-3">
              <Gift size={32} className="text-brand-navy" />
              Solicitação de Brindes
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Solicite brindes promocionais e institucionais para entrega aos clientes em visitas comerciais.
            </p>
          </div>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-xl bg-brand-navy px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-navy/20 hover:bg-brand-navy/90 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            Nova Solicitação
          </button>
        </header>

        {/* CARDS DE ESTATÍSTICAS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-2xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-brand-navy/10 flex items-center justify-center text-brand-navy shrink-0">
              <Inbox size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Total Solicitado</p>
              <p className="text-2xl font-black text-foreground leading-none">{stats.total}</p>
            </div>
          </div>
          <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-2xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Aguardando</p>
              <p className="text-2xl font-black text-foreground leading-none">{stats.pendentes}</p>
            </div>
          </div>
          <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-2xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Aprovados</p>
              <p className="text-2xl font-black text-foreground leading-none">{stats.aprovados}</p>
            </div>
          </div>
          <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-2xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Gift size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Entregues</p>
              <p className="text-2xl font-black text-foreground leading-none">{stats.entregues}</p>
            </div>
          </div>
        </div>

        {/* CATÁLOGO DE PRODUTOS */}
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[32px] p-6 sm:p-8 mb-8">
          <div className="mb-8">
            <h2 className="text-sm font-black text-brand-red flex items-center gap-2 uppercase tracking-widest">
              <Package size={16} />
              Brindes Oficiais Disponíveis
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Clique em "Solicitar" em qualquer brinde abaixo para preencher o formulário automaticamente.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {CATALOGO_BRINDES.map(brinde => (
              <div key={brinde.id} className="group flex flex-col bg-background border border-border rounded-2xl overflow-hidden hover:border-brand-navy/30 hover:shadow-lg hover:shadow-brand-navy/5 transition-all">
                <div className="aspect-[4/3] relative overflow-hidden bg-secondary">
                  <img 
                    src={brinde.imagem} 
                    alt={brinde.nome} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {brinde.premium && (
                    <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-sm">
                      Premium
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-foreground text-sm mb-1 line-clamp-1">{brinde.nome}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
                    {brinde.descricao}
                  </p>
                  <button
                    onClick={() => handleOpenModal(brinde)}
                    className="w-full h-9 bg-secondary text-brand-navy font-bold text-xs rounded-xl hover:bg-brand-navy hover:text-white transition-colors border border-border/50 shadow-sm"
                  >
                    Solicitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 bg-card border border-border shadow-[var(--shadow-soft)] rounded-2xl md:rounded-full p-2">
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto px-2 pb-2 md:pb-0 scrollbar-hide">
            {['Todos', 'Pendentes', 'Aprovados', 'Recusados', 'Entregues'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-brand-navy text-white shadow-md' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72 shrink-0 pr-2 pb-2 md:pb-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground md:top-[20px]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar brinde ou empresa..."
              className="w-full h-10 md:mt-0 mt-0 rounded-full border border-border bg-background pl-11 pr-4 text-xs focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-colors"
            />
          </div>
        </div>

        {/* TABELA DE HISTÓRICO */}
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[24px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/40 text-[10px] uppercase font-black text-muted-foreground border-b border-border tracking-[0.1em]">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4 text-center">Brinde</th>
                  <th className="px-6 py-4 text-center">Quantidade</th>
                  <th className="px-6 py-4">Justificativa</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Obs. Adm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">
                      <LoaderCircle className="h-6 w-6 animate-spin mx-auto text-brand-red mb-3" />
                      <p className="font-semibold text-xs uppercase tracking-wider">Carregando dados...</p>
                    </td>
                  </tr>
                ) : filteredSolicitacoes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">
                      <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground/50">
                        <Inbox size={20} />
                      </div>
                      <p className="font-semibold text-sm">Nenhuma solicitação encontrada.</p>
                      <p className="text-xs mt-1 opacity-70">Ajuste os filtros ou crie uma nova.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSolicitacoes.map((sol) => (
                    <tr key={sol.id} className="hover:bg-secondary/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground text-[11px]">
                          {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground">
                          {new Date(sol.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Building2 size={13} className="text-brand-navy opacity-70" />
                          {sol.empresa_nome || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-secondary border border-border group-hover:border-brand-navy/20 group-hover:bg-brand-navy/5 transition-colors">
                          <Gift size={14} className="text-brand-navy/70" />
                        </div>
                        <div className="text-[10px] font-bold mt-1.5 max-w-[120px] truncate mx-auto text-foreground/80" title={sol.brinde_tipo}>
                          {sol.brinde_tipo || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-sm text-foreground">
                        {sol.quantidade || 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground font-medium text-[11px] max-w-[150px] block truncate" title={sol.justificativa}>
                          {sol.justificativa || 'Nenhuma'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusColor(sol.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(sol.status)} shadow-sm`}></span>
                          {sol.status === 'pendente' ? 'PENDENTE' : 
                           (sol.status === 'enviado' || sol.status === 'aprovado' || sol.status === 'entregue') ? 'ENTREGUE' : 
                           sol.status === 'recusado' ? 'RECUSADO' : 
                           (sol.status || 'PENDENTE').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground/60 font-medium text-[11px] max-w-[150px] block truncate" title={sol.observacao_admin}>
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

      {/* MODAL DE SOLICITAÇÃO FLUTUANTE */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            
            <button onClick={closeModal} className="absolute top-5 right-5 h-8 w-8 rounded-full bg-secondary text-muted-foreground hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors z-20">
              <X size={16} />
            </button>

            {/* Cabeçalho do Modal (Com ou Sem Imagem dependendo da Origem) */}
            {selectedBrindeObj ? (
              <div className="h-28 relative overflow-hidden bg-brand-navy/5 flex items-center px-6 border-b border-border">
                <div>
                  <p className="text-[10px] font-black text-brand-red uppercase tracking-wider mb-1">NOVA SOLICITAÇÃO</p>
                  <h2 className="text-xl font-black text-brand-navy font-display flex items-center gap-2">
                    <Gift size={22} className="text-brand-navy" />
                    {selectedBrindeObj.nome}
                  </h2>
                </div>
              </div>
            ) : (
              <div className="h-28 relative overflow-hidden bg-brand-navy/5 flex items-center px-6 border-b border-border">
                <div>
                  <h2 className="text-xl font-black text-brand-navy font-display flex items-center gap-2">
                    <Gift size={22} className="text-brand-red" />
                    Solicitar Brinde
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Preencha os dados abaixo para fazer uma nova solicitação manual.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  As solicitações estão sujeitas à aprovação da diretoria e disponibilidade em estoque. Certifique-se de preencher a justificativa caso a quantidade seja alta.
                </p>
              </div>

              {/* Se não veio com brinde pré-selecionado, mostra o campo para selecionar */}
              {!selectedBrindeObj && (
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1.5 uppercase tracking-wider">
                    Brinde Desejado <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      required
                      value={brindeManual}
                      onChange={e => setBrindeManual(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-xs font-bold focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors appearance-none"
                    >
                      <option value="">Selecione o brinde...</option>
                      {CATALOGO_BRINDES.map(b => (
                        <option key={b.id} value={b.nome}>{b.nome}</option>
                      ))}
                      <option value="Outro (Especificar)">Outro (Especificar)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Se selecionou 'Outro', abre campo texto livre */}
              {!selectedBrindeObj && brindeManual === 'Outro (Especificar)' && (
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1.5 uppercase tracking-wider">
                    Qual Brinde? <span className="text-brand-red">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    onChange={e => setBrindeManual(e.target.value)} // Sobrescreve 'Outro' pelo que digitar, pra mandar pro BD
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs font-medium focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors"
                    placeholder="Descreva o material promocional..."
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1.5 uppercase tracking-wider">
                  Empresa Destino <span className="text-brand-red">*</span>
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
                    className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-xs font-medium focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors appearance-none"
                  >
                    <option value="">Selecione a empresa do cliente...</option>
                    {empresas?.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1.5 uppercase tracking-wider">
                    Quantidade <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      required
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={e => setQuantidade(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-xs font-bold focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Status Inicial
                  </label>
                  <div className="w-full rounded-xl border border-dashed border-border bg-secondary/50 px-4 py-3 text-xs font-bold text-amber-600 flex items-center gap-2 opacity-80 cursor-not-allowed">
                    <Clock size={14} /> Aguardando
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1.5 uppercase tracking-wider">
                  Justificativa (Opcional)
                </label>
                <div className="relative">
                  <AlignLeft className="absolute left-4 top-[14px] h-4 w-4 text-muted-foreground" />
                  <textarea
                    value={justificativa}
                    onChange={e => setJustificativa(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-xs font-medium focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy transition-colors min-h-[80px] resize-y"
                    placeholder="Motivo da solicitação para aprovação rápida..."
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full h-12 bg-brand-navy text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-brand-navy/90 hover:scale-[1.01] transition-all shadow-lg shadow-brand-navy/20 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {createMutation.isPending ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <>
                      Confirmar Solicitação
                      <Send size={16} />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
export default SolicitarBrindes
