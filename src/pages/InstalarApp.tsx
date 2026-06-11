import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { 
  Smartphone, 
  Apple, 
  Share, 
  PlusSquare, 
  Download, 
  CheckCircle2, 
  Info,
  ChevronRight,
  X,
  HelpCircle
} from 'lucide-react'

// Interface para o evento PWA no Chrome/Android
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export const InstalarApp: React.FC = () => {
  const [platform, setPlatform] = useState<'ios' | 'android'>('android')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [showAndroidAlert, setShowAndroidAlert] = useState(false)

  useEffect(() => {
    // Detectar plataforma
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios')
    } else {
      setPlatform('android')
    }

    // Verificar se já está rodando em modo standalone (instalado)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true)
    }

    // Ouvir o evento beforeinstallprompt do Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Ouvir evento de app instalado
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) {
      setShowAndroidAlert(true)
      return
    }
    
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`Escolha do usuário: ${outcome}`)
    setDeferredPrompt(null)
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 lg:py-12">
        
        {/* HEADER */}
        <header className="mb-8 text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            Aplicativo Móvel
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-brand-navy">
            Instalar no Celular
          </h1>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            Tenha o sistema <span className="text-brand-red font-bold">Do Mestre</span> sempre à mão. Acesse rapidamente pela tela inicial do seu aparelho com carregamento instantâneo e visualização em tela cheia.
          </p>
        </header>

        {isInstalled ? (
          /* CASO JÁ ESTEJA INSTALADO */
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-8 text-center max-w-xl mx-auto shadow-[var(--shadow-soft)]">
            <div className="mx-auto h-16 w-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-foreground">Aplicativo Instalado!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você já está utilizando o sistema em sua versão de aplicativo móvel.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-12 gap-8 items-start">
            
            {/* SELETOR DE PLATAFORMA (Esquerda) */}
            <div className="md:col-span-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                Escolha seu Sistema
              </h3>
              
              <button
                onClick={() => setPlatform('android')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-300 ${
                  platform === 'android'
                    ? 'border-brand-navy bg-brand-navy text-primary-foreground shadow-[var(--shadow-soft)]'
                    : 'border-border bg-card text-foreground hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Smartphone size={20} className={platform === 'android' ? 'text-brand-gold' : 'text-muted-foreground'} />
                  <div>
                    <div className="font-bold text-sm">Celular Android</div>
                    <div className="text-[10px] opacity-80">Samsung, Motorola, Xiaomi, etc.</div>
                  </div>
                </div>
                <ChevronRight size={16} className="opacity-60" />
              </button>

              <button
                onClick={() => setPlatform('ios')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-300 ${
                  platform === 'ios'
                    ? 'border-brand-navy bg-brand-navy text-primary-foreground shadow-[var(--shadow-soft)]'
                    : 'border-border bg-card text-foreground hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Apple size={20} className={platform === 'ios' ? 'text-brand-gold' : 'text-muted-foreground'} />
                  <div>
                    <div className="font-bold text-sm">iPhone (iOS)</div>
                    <div className="text-[10px] opacity-80">Dispositivos Apple</div>
                  </div>
                </div>
                <ChevronRight size={16} className="opacity-60" />
              </button>
            </div>

            {/* INSTRUÇÕES E AÇÃO (Direita) */}
            <div className="md:col-span-8 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-soft)]">
              
              {/* ANDROID */}
              {platform === 'android' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-foreground">Instalar no Android</h2>
                      <p className="text-xs text-muted-foreground">Instale como aplicativo diretamente do navegador</p>
                    </div>
                  </div>

                  {/* Botão Rápido para Android */}
                  <div className="p-5 rounded-2xl bg-brand-navy/5 border border-brand-navy/10 flex flex-col items-center text-center gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-base text-brand-navy">Instalação Rápida no Android</div>
                      <p className="text-xs text-muted-foreground max-w-sm">Clique no botão abaixo para iniciar a instalação nativa em seu celular.</p>
                    </div>
                    
                    <button
                      onClick={handleAndroidInstall}
                      style={{ backgroundImage: 'var(--gradient-accent)' }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-brand-red-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-[0.99] transition-transform cursor-pointer"
                    >
                      <Download size={18} /> Instalar no Android
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <HelpCircle size={16} className="text-brand-red" />
                      Passo a Passo Manual (Caso o botão não funcione)
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-secondary/40 p-4 rounded-xl space-y-2">
                        <div className="h-6 w-6 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center">1</div>
                        <p className="text-xs font-bold text-foreground">Abra o menu do Chrome</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">Toque nos <strong className="font-semibold text-brand-red">três pontos verticais</strong> no canto superior direito do navegador.</p>
                      </div>
                      <div className="bg-secondary/40 p-4 rounded-xl space-y-2">
                        <div className="h-6 w-6 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center">2</div>
                        <p className="text-xs font-bold text-foreground">Adicionar à tela inicial</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">Toque em <strong className="font-semibold text-brand-red">"Instalar aplicativo"</strong> ou <strong className="font-semibold text-brand-red">"Adicionar à tela de início"</strong> e confirme.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* iOS (iPhone/iPad) */}
              {platform === 'ios' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="h-10 w-10 rounded-lg bg-gray-500/10 text-foreground flex items-center justify-center">
                      <Apple size={22} />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-foreground">Instalar no iPhone (iOS)</h2>
                      <p className="text-xs text-muted-foreground">Instale como aplicativo através do navegador Safari</p>
                    </div>
                  </div>

                  {/* Botão Rápido/Simulado para iOS */}
                  <div className="p-5 rounded-2xl bg-brand-navy/5 border border-brand-navy/10 flex flex-col items-center text-center gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-base text-brand-navy">Instalação no iPhone</div>
                      <p className="text-xs text-muted-foreground max-w-sm">Clique no botão abaixo para abrir o guia interativo de instalação do iOS.</p>
                    </div>

                    <button
                      onClick={() => setShowIosModal(true)}
                      style={{ backgroundImage: 'var(--gradient-accent)' }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-brand-red-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] active:scale-[0.99] transition-transform cursor-pointer"
                    >
                      <Download size={18} /> Instalar no iPhone
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <HelpCircle size={16} className="text-brand-red" />
                      Guia rápido de passos
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-secondary/40 p-4 rounded-xl flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Abra este site no navegador <strong className="font-semibold text-brand-red">Safari</strong> do seu iPhone.
                        </p>
                      </div>
                      <div className="bg-secondary/40 p-4 rounded-xl flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Toque no ícone de <strong className="font-semibold text-brand-red">Compartilhar</strong> <Share size={14} className="inline text-blue-500" /> (o quadrado com seta para cima na parte inferior).
                        </p>
                      </div>
                      <div className="bg-secondary/40 p-4 rounded-xl flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Role para baixo e selecione a opção <strong className="font-semibold text-brand-red">"Adicionar à Tela de Início"</strong> <PlusSquare size={14} className="inline" /> e clique em <strong className="font-semibold text-brand-red">Adicionar</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* MODAL INTERATIVO PARA IOS */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-border shadow-[var(--shadow-elegant)] overflow-hidden flex flex-col">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <Apple size={20} className="text-brand-navy" />
                <span className="font-bold text-foreground">Como instalar no iPhone</span>
              </div>
              <button 
                onClick={() => setShowIosModal(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Siga os <strong className="text-foreground">3 passos rápidos</strong> abaixo para ter o aplicativo em sua tela de início:
                </p>
              </div>

              {/* Passos ilustrados */}
              <div className="space-y-4">
                <div className="flex gap-4 items-center bg-secondary/30 p-3 rounded-xl">
                  <div className="h-8 w-8 bg-brand-navy text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="text-xs text-foreground">
                    Clique no botão de <strong className="font-bold text-brand-red">Compartilhar</strong> <Share size={16} className="inline text-blue-500 mx-1" /> na barra inferior do navegador Safari.
                  </div>
                </div>

                <div className="flex gap-4 items-center bg-secondary/30 p-3 rounded-xl">
                  <div className="h-8 w-8 bg-brand-navy text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="text-xs text-foreground">
                    Role a lista que abrir e toque em <strong className="font-bold text-brand-red">"Adicionar à Tela de Início"</strong> <PlusSquare size={16} className="inline text-muted-foreground mx-1" />.
                  </div>
                </div>

                <div className="flex gap-4 items-center bg-secondary/30 p-3 rounded-xl">
                  <div className="h-8 w-8 bg-brand-navy text-white font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="text-xs text-foreground">
                    Toque em <strong className="font-bold text-brand-red">"Adicionar"</strong> no canto superior direito para confirmar.
                  </div>
                </div>
              </div>

              {/* Dica do Navegador */}
              <div className="flex gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-600 leading-normal">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> Certifique-se de estar utilizando o navegador <strong>Safari</strong>. No Chrome de iOS ou outros navegadores, esta opção não estará disponível.
                </span>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-border bg-secondary/20 text-center">
              <button
                onClick={() => setShowIosModal(false)}
                className="w-full py-2.5 rounded-xl bg-brand-navy text-primary-foreground text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                Entendi, vou instalar!
              </button>
            </div>

          </div>
        </div>
      )}
      {/* MODAL DE AVISO ANDROID */}
      {showAndroidAlert && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-border shadow-[var(--shadow-elegant)] overflow-hidden flex flex-col">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-amber-500/10 text-amber-800 dark:text-amber-500">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Info size={18} />
                <span>Instalação do Aplicativo</span>
              </div>
              <button 
                onClick={() => setShowAndroidAlert(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground leading-relaxed font-bold">
                A instalação rápida automática não está disponível no seu navegador neste momento.
              </p>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                Isso geralmente acontece por alguns motivos comuns:
              </p>

              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1.5">
                <li>O aplicativo já está instalado no seu dispositivo celular.</li>
                <li>Você não está utilizando o navegador <strong>Google Chrome</strong> oficial.</li>
                <li>O site está rodando em ambiente local de teste (localhost) sem criptografia segura.</li>
              </ul>

              <div className="p-3.5 bg-brand-navy/5 border border-brand-navy/10 rounded-xl text-xs text-brand-navy dark:text-foreground leading-normal font-medium mt-2">
                Por favor, siga as instruções rápidas do <strong>Passo a Passo Manual</strong> logo abaixo na página para fixar o sistema na tela inicial.
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-border bg-secondary/20 text-center">
              <button
                onClick={() => setShowAndroidAlert(false)}
                className="w-full py-2.5 rounded-xl bg-brand-navy text-primary-foreground text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                Entendi, ver Passo a Passo
              </button>
            </div>

          </div>
        </div>
      )}

    </Layout>
  )
}

export default InstalarApp
