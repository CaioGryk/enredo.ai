import { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Edit2, 
  Play, 
  Brain, 
  Lock, 
  LogOut, 
  Library, 
  Book, 
  Film, 
  PlusCircle, 
  User,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('VÍDEOS');

  const videos = [
    {
      id: 1,
      title: 'O Silêncio dos Astros',
      views: '14.2k',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJjSTAmWlxN6T1pLWcfTFydBwHocWBR1-kAHgpgT8dWrztaH2mqa8J68VLQ0B53UWbxzxVj5UYHFdk1pNCjo8gItjHbRzu93myYab39c64EMDCwPOIoCjmlqeP3lyMoFmfyJQ71jfHaGDQyepVOxwEsY2lCp948BlWpVcqXETajwbSGbRumCK933tXikH3uAVlgkTc85rafoSNxDEw9-rZueZ5_-XIV_FzuUp_9duULHCAP5F0uiFbC1iT2JRDhkJsyX3tid-gEbU'
    },
    {
      id: 2,
      title: 'Ruas de Neon',
      views: '8.5k',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6l-Cq6jEr_PjBiwnKJtTL8Q25Nh73NBL0fUm8m4VT7oI2x6qwQlvzVkjTEtlHH4XTauD0sk8ujlYKEo1IENzsY3xwjS71uO_84fUzk-S5C78UA2aWYOK14ycvMLA-d0_oDLYPA4I81q17e25lDoUWWDXmYGBFlLtpBdlDm4uZqA1KQIlzmbILteOCWjB_WcaeWJPN3WlkgePIGzaDUsO-r6kxqBzG5b0CgoFMo2_s6zS6I1E-zcalbfO-dPQPO-fJNpq56abaoAg'
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 glass-panel z-50 px-6 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="font-serif italic text-xl font-bold text-primary">Enredo.ai</h1>
        </div>
        <button className="text-zinc-500 hover:text-primary transition-colors p-2">
          <Search className="w-6 h-6" />
        </button>
      </header>

      <main className="pt-24 px-5 max-w-2xl mx-auto space-y-10">
        {/* Profile Section */}
        <section className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 p-1 bg-surface-container">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdxMyKWpeRMBePl6fQBs45JmbBDt_4sm_0WRLx-eO7f1ADFST5HekX94CIiGqz53iI76LGkl_gvya7YnCUt4A7um6ool6fDicvbWwm-pwOr9kiSgH3yrvwIpyDvEA8aBjjHc16Y-utRCeRwcdSAEe4UBdjsB6rS6m_bqQTOPUYLMPgiRLkQxSWsLZqFih6aMpoy-qzaUrYb6Mw-NuqwSJc4ikswx2kA5sS_-PeTLXT2rNDws_NKBs2fW4DqFBPXGBkXAnXhZ2dUzQ" 
                alt="Alexandre Ramos"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <button className="absolute bottom-0 right-0 bg-primary p-2 rounded-full shadow-lg border border-black/20 hover:scale-110 active:scale-95 transition-transform">
              <Edit2 className="w-4 h-4 text-on-primary" />
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold">Alexandre Ramos</h2>
            <p className="text-zinc-400 font-serif italic max-w-xs mx-auto text-sm leading-relaxed">
              "Tecendo mundos e explorando narrativas onde a tecnologia encontra a alma."
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-2">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-primary">24</span>
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Vídeos Publicados</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-primary">1.2k</span>
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Seguidores</span>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="border-b border-white/5">
          <nav className="flex justify-between">
            {['VÍDEOS', 'HISTÓRIAS CRIADAS', 'SALVOS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 pb-4 text-[10px] font-bold tracking-widest transition-all relative ${
                  activeTab === tab ? 'text-primary' : 'text-zinc-500'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-4"
          >
            {activeTab === 'VÍDEOS' && videos.map((video) => (
              <motion.div 
                key={video.id}
                whileHover={{ scale: 1.02 }}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-surface-container-highest group cursor-pointer"
              >
                <img 
                  src={video.image} 
                  alt={video.title}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end">
                  <p className="text-white text-sm font-semibold truncate">{video.title}</p>
                  <div className="flex items-center gap-1.5 text-primary-container mt-1">
                    <Play className="w-3 h-3 fill-current" />
                    <span className="text-[10px] font-bold">{video.views}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {activeTab !== 'VÍDEOS' && (
              <div className="col-span-2 py-20 text-center text-zinc-500 italic">
                Nenhum conteúdo encontrado nesta seção.
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Settings */}
        <section className="pt-6 space-y-4">
          <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Configurações</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-white/5 hover:bg-surface-container-high transition-colors group">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Consentimento de IA</p>
                  <p className="text-xs text-zinc-500">Personalização e treinamento</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-white/5 hover:bg-surface-container-high transition-colors group">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-xl text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Privacidade</p>
                  <p className="text-xs text-zinc-500">Dados e visibilidade da conta</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>

            <button className="w-full flex items-center gap-4 p-4 bg-error-container/10 rounded-2xl border border-error/10 hover:bg-error-container/20 transition-colors mt-4 text-error">
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-semibold">Sair da Conta</span>
            </button>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 glass-panel border-t flex justify-around items-center px-4 pb-safe">
        {[
          { icon: Library, label: 'Biblioteca' },
          { icon: Book, label: 'Lendo' },
          { icon: Film, label: 'Cenas' },
          { icon: PlusCircle, label: 'Criar' },
          { icon: User, label: 'Perfil', active: true }
        ].map((item) => (
          <button 
            key={item.label}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
              item.active ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <item.icon className={`w-6 h-6 ${item.active ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] font-serif font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
