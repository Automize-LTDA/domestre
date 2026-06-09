import React from 'react'
import { Layout } from '../components/Layout'
import { RelatorioVisitasForm } from '../components/RelatorioVisitasForm'

export const NovaVisita: React.FC = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            Registro de visitas
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-brand-navy">
            Novo Relatório de Visita
          </h1>
          <p className="mt-2 text-muted-foreground">
            Registre os detalhes da visita realizada ao cliente ou parceiro comercial.
          </p>
        </header>

        <RelatorioVisitasForm />
      </div>
    </Layout>
  )
}
export default NovaVisita
