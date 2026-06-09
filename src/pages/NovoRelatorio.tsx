import React from 'react'
import { Layout } from '../components/Layout'
import { RelatorioAvariasForm } from '../components/RelatorioAvariasForm'

export const NovoRelatorio: React.FC = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            Registro de avarias
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-brand-navy">
            Novo Relatório
          </h1>
          <p className="mt-2 text-muted-foreground">
            Preencha os dados, selecione os materiais e gere o PDF.
          </p>
        </header>

        <RelatorioAvariasForm />
      </div>
    </Layout>
  )
}
export default NovoRelatorio
