import React from 'react'
import { Layout } from '../components/Layout'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useQueryClient } from '@tanstack/react-query'
import { Download, RefreshCw, Trash2 } from 'lucide-react'

interface CardProps {
  title: string
  desc: string
  danger?: boolean
  children: React.ReactNode
}

const ConfigCard: React.FC<CardProps> = ({ title, desc, children, danger }) => {
  return (
    <section className={`rounded-2xl bg-card border p-6 shadow-[var(--shadow-soft)] ${
      danger ? 'border-destructive/30' : 'border-border'
    }`}>
      <h2 className={`text-lg font-bold ${danger ? 'text-destructive' : 'text-foreground'}`}>
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export const Configuracoes: React.FC = () => {
  const { user, fullName, role } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  async function handleBackup() {
    try {
      const [avariasRes, visitasRes] = await Promise.all([
        supabase.from('relatorios_avarias').select('*, itens:itens_relatorio_avaria(*)'),
        supabase.from('relatorios_visitas').select('*')
      ])

      if (avariasRes.error) throw avariasRes.error
      if (visitasRes.error) throw visitasRes.error

      const backupData = {
        exportedAt: new Date().toISOString(),
        avarias: avariasRes.data || [],
        visitas: visitasRes.data || []
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-mestre-saas-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      showToast('Backup JSON baixado com sucesso!', 'success')
    } catch (e: any) {
      console.error(e)
      showToast('Falha ao gerar backup: ' + e.message, 'error')
    }
  }

  function handleClearDrafts() {
    localStorage.removeItem('domestre.draft.v1')
    localStorage.removeItem('domestre.draft_visita.v1')
    showToast('Rascunhos locais limpos com sucesso!', 'success')
  }

  async function handleDangerWipe() {
    if (!confirm('ATENÇÃO: Apagar permanentemente TODO o seu histórico de relatórios? Essa ação não pode ser desfeita.')) {
      return
    }

    try {
      // 1. Get all avarias reports created by this user first to delete child items first
      const { data: userReports } = await supabase
        .from('relatorios_avarias')
        .select('id')
        .eq('created_by', user?.id || '')

      if (userReports && userReports.length > 0) {
        const reportIds = userReports.map(r => r.id)
        const { error: childErr } = await supabase
          .from('itens_relatorio_avaria')
          .delete()
          .in('relatorio_id', reportIds)

        if (childErr) throw childErr
      }

      // 2. Delete parent avarias reports
      const { error: avariasErr } = await supabase
        .from('relatorios_avarias')
        .delete()
        .eq('created_by', user?.id || '')

      // 3. Delete visitas reports
      const { error: visitasErr } = await supabase
        .from('relatorios_visitas')
        .delete()
        .eq('created_by', user?.id || '')

      if (avariasErr) throw avariasErr
      if (visitasErr) throw visitasErr

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['relatorios-avarias'] })
      queryClient.invalidateQueries({ queryKey: ['relatorios-visitas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })

      const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000'
      // Log action in history
      await supabase.from('historico').insert({
        user_id: isMockUser ? null : user?.id,
        action: 'WIPE_ALL_DATA',
        details: { wiped_by: user?.email }
      })

      showToast('Todo o seu histórico de relatórios foi apagado permanentemente.', 'success')
    } catch (e: any) {
      console.error(e)
      showToast('Erro ao apagar histórico: ' + e.message, 'error')
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 lg:py-12">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            Sistema
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-brand-navy">
            Configurações
          </h1>
        </header>

        <div className="space-y-4">
          {/* Card 1: Perfil do Usuário */}
          <ConfigCard 
            title="Perfil do Usuário" 
            desc="Informações do seu perfil ativo no sistema."
          >
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>{' '}
                <span className="font-semibold text-foreground">{fullName || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Usuário:</span>{' '}
                <span className="font-semibold text-foreground">{user?.email?.split('@')[0] || user?.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Nível de acesso:</span>{' '}
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                  role === 'admin' 
                    ? 'bg-[#E53935]/10 text-[#E53935]' 
                    : 'bg-[#233A7A]/10 text-[#233A7A]'
                }`}>
                  {role === 'admin' ? 'Administrador' : 'Colaborador'}
                </span>
              </div>
            </div>
          </ConfigCard>

          {/* Card 2: Exportar dados */}
          <ConfigCard 
            title="Exportar dados" 
            desc="Baixe um backup completo em JSON contendo todos os relatórios de avarias e visitas registrados."
          >
            <button
              onClick={handleBackup}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition"
            >
              <Download size={16} /> Baixar JSON
            </button>
          </ConfigCard>

          {/* Card 3: Rascunho */}
          <ConfigCard 
            title="Rascunhos locais" 
            desc="Limpe todos os rascunhos em andamento de relatórios de avarias e visitas salvos neste navegador."
          >
            <button
              onClick={handleClearDrafts}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary transition"
            >
              <RefreshCw size={16} /> Limpar rascunhos
            </button>
          </ConfigCard>

          {/* Card 4: Danger Zone */}
          <ConfigCard 
            title="Zona de perigo" 
            desc="Apaga permanentemente todo o seu histórico de relatórios cadastrados."
            danger={true}
          >
            <button
              onClick={handleDangerWipe}
              className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground hover:opacity-90 transition"
            >
              <Trash2 size={16} /> Apagar tudo
            </button>
          </ConfigCard>
        </div>
      </div>
    </Layout>
  )
}
export default Configuracoes
