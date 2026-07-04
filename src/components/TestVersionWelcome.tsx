import React, { useState, useEffect } from 'react'
import { Sparkles, Beaker, Code2, ArrowRight } from 'lucide-react'

export const TestVersionWelcome: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Exibir uma vez por sessão do navegador (até fechar a aba/janela)
    const hasSeen = sessionStorage.getItem('domestre.welcome_seen')
    if (!hasSeen) {
      // Pequeno delay para a animação ficar mais fluída após o carregamento inicial
      const timer = setTimeout(() => setIsOpen(true), 400)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    sessionStorage.setItem('domestre.welcome_seen', 'true')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-[420px] bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Graphic Area */}
        <div className="h-32 bg-gradient-to-br from-brand-navy to-brand-navy/90 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red rounded-full opacity-20 blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-red rounded-full opacity-20 blur-2xl"></div>
          
          <div className="h-16 w-16 bg-white rounded-2xl shadow-lg flex items-center justify-center rotate-3 transform z-10 relative">
            <span className="absolute inline-flex h-full w-full rounded-2xl bg-white/50 animate-ping" style={{ animationDuration: '3s' }}></span>
            <Beaker className="text-brand-red relative z-10" size={32} />
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 text-center bg-card">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/10 text-brand-red text-xs font-black uppercase tracking-wider mb-5">
            <Sparkles size={14} />
            <span>Versão de Teste</span>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-3 font-display">
            Bem-vindo ao Sistema!
          </h2>
          
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Esta é uma versão inicial de demonstração do nosso sistema. Explore, teste os fluxos e aproveite a experiência antes do lançamento oficial.
          </p>

          <div className="bg-secondary/40 rounded-2xl p-4 border border-border/50 text-left mb-8 flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 bg-brand-navy/5 rounded-xl flex items-center justify-center text-brand-navy">
              <Code2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">
                Desenvolvido por
              </p>
              <p className="text-sm font-bold text-foreground">
                Kauã Felipe <span className="text-muted-foreground font-normal mx-0.5">&amp;</span> Bruno Arantes
              </p>
            </div>
          </div>

          <button 
            onClick={handleClose}
            className="w-full h-12 bg-brand-navy text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-navy/90 hover:-translate-y-0.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Começar a Testar
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
