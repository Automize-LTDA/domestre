import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { RelatorioAvariasForm } from '../components/RelatorioAvariasForm'
import { supabase } from '../supabaseClient'
import { Calendar, User, LoaderCircle } from 'lucide-react'

export const ExportarRelatorio: React.FC = () => {
  const [collaborators, setCollaborators] = useState<{ name: string; date: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCollaborators() {
      try {
        const { data, error } = await supabase
          .from('relatorios_avarias')
          .select('responsavel, data')
          .order('data', { ascending: false })

        if (error) throw error

        if (data) {
          const unique: Record<string, string> = {}
          data.forEach(item => {
            const name = item.responsavel.trim()
            if (name && !unique[name]) {
              unique[name] = item.data
            }
          })

          const list = Object.entries(unique).map(([name, date]) => ({
            name,
            date
          }))
          setCollaborators(list)
        }
      } catch (err) {
        console.error('Error fetching collaborators:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCollaborators()
  }, [])

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 lg:py-12">
        <div 
          style={{ backgroundImage: 'var(--gradient-hero)' }} 
          className="rounded-t-2xl p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
            Modo rápido
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold">
            Exportar Relatório em PDF
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/80">
            Preenchimento simples, estilo formulário.
          </p>
        </div>

        <div className="rounded-b-2xl bg-card border border-border border-t-0 p-6">
          <RelatorioAvariasForm compact={true} />
        </div>

        {/* Collaborators Registry */}
        <div className="mt-6 rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
            <User size={18} className="text-brand-navy" />
            Colaboradores com Registros
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Colaboradores que já geraram relatórios de avaria e a data do último registro.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground gap-2 text-xs">
              <LoaderCircle size={16} className="animate-spin" />
              Carregando colaboradores...
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground italic">
              Nenhum colaborador registrou avarias ainda.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {collaborators.map((colab, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center font-bold text-xs shrink-0">
                      {colab.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {colab.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0 font-medium">
                    <Calendar size={12} className="text-brand-red" />
                    {new Date(colab.date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
export default ExportarRelatorio
