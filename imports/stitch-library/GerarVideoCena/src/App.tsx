/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  Settings, 
  X, 
  PlayCircle, 
  Brain, 
  Coins, 
  Lock, 
  Library, 
  BookOpen, 
  Clapperboard, 
  PlusCircle, 
  User 
} from 'lucide-react';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(true);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-on-surface font-sans selection:bg-violet-500/30">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-40 bg-black/70 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-3">
          <Menu className="w-6 h-6 text-violet-400 cursor-pointer" />
          <h1 className="text-2xl font-black text-violet-400 text-glow-violet font-serif tracking-tight">
            Enredo.ai
          </h1>
        </div>
        <Settings className="w-6 h-6 text-white/60 hover:text-violet-300 transition-colors cursor-pointer" />
      </header>

      {/* Main Content (Blurred Background) */}
      <main className="w-full max-w-md mx-auto pt-24 pb-32 px-4 min-h-screen">
        <div 
          onClick={() => setIsModalOpen(true)}
          className={`space-y-6 transition-all duration-700 cursor-pointer ${isModalOpen ? 'blur-md opacity-20 scale-95' : 'blur-0 opacity-100 scale-100'}`}
        >
          <div className="w-full aspect-[9/16] bg-surface-container-high rounded-3xl overflow-hidden relative shadow-2xl border border-white/5">
            <img 
              src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800" 
              alt="Cinematic Background" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </main>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm px-0 md:px-4 overflow-y-auto">
            {/* Clickable Backdrop to Close */}
            <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
            
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-modal w-full max-w-lg rounded-t-[32px] md:rounded-[32px] relative spotlight-violet mt-auto md:mt-0 max-h-[95vh] overflow-y-auto"
            >
              <div className="px-6 pt-8 pb-4 flex justify-between items-center">
                <h2 className="font-serif text-3xl font-semibold text-on-surface">Gerar Vídeo da Cena</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors active:scale-90"
                >
                  <X className="w-6 h-6 text-white/40" />
                </button>
              </div>

              <div className="px-6 space-y-6 pb-12">
                {/* Scene Preview Card */}
                <div className="bg-surface-container-low rounded-2xl p-4 rim-light flex gap-4 items-start border border-white/5">
                  <div className="w-20 h-28 flex-shrink-0 bg-surface-container rounded-xl overflow-hidden relative shadow-lg">
                    <img 
                      src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=200" 
                      className="w-full h-full object-cover grayscale brightness-50"
                      alt="Preview"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="w-10 h-10 text-violet-400 fill-violet-400/20" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-bold tracking-[0.1em] text-violet-400 uppercase">Cena Atual</span>
                    <p className="text-sm text-on-surface-variant leading-relaxed italic opacity-80">
                      "As sombras dançavam na parede enquanto ele segurava a carta. O segredo estava finalmente em suas mãos, mas o custo seria maior..."
                    </p>
                  </div>
                </div>

                {/* Profile Persona Selection */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-violet-400/50 p-1 bg-surface-container-high overflow-hidden shadow-[0_0_15px_rgba(167,139,250,0.2)]">
                        <img 
                          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200" 
                          className="w-full h-full object-cover rounded-full"
                          alt="Avatar"
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-on-surface">Sua Imagem Personalizada</h4>
                      <p className="text-xs text-on-surface-variant">Sua imagem será usada para dar um rosto ao protagonista</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsPersonalized(!isPersonalized)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${isPersonalized ? 'bg-violet-500' : 'bg-surface-container-highest'}`}
                  >
                    <motion.div 
                      animate={{ x: isPersonalized ? 24 : 4 }}
                      className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                {/* Technical Details */}
                <div className="bg-white/5 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-on-surface-variant flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Modelo
                    </span>
                    <span className="text-on-surface font-semibold">AI Video 2.0 (Premium)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-on-surface-variant flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      Custo
                    </span>
                    <span className="text-violet-400 font-bold">12 créditos cinematográficos</span>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex gap-3 items-start">
                    <Lock className="w-4 h-4 text-on-surface-variant mt-0.5" />
                    <p className="text-[11px] text-on-surface-variant leading-relaxed opacity-70">
                      Você controla se este vídeo será privado ou publicado. Dados biométricos não são armazenados após a geração.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-2">
                  <button className="w-full py-4 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded-2xl shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all active:scale-[0.98] duration-200">
                    Gerar Vídeo
                  </button>
                  <button className="w-full py-4 border border-white/20 hover:bg-white/5 text-on-surface font-medium rounded-2xl transition-all active:scale-[0.98] duration-200">
                    Gerar sem minha foto
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-40 bg-black/70 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center h-20 pb-safe px-2">
        <NavItem 
          icon={<Library className="w-6 h-6" />} 
          label="Biblioteca" 
          active={false} 
        />
        <NavItem 
          icon={<BookOpen className="w-6 h-6" />} 
          label="Lendo" 
          active={false} 
        />
        <NavItem 
          icon={<Clapperboard className="w-6 h-6" />} 
          label="Cenas" 
          active={true} 
        />
        <NavItem 
          icon={<PlusCircle className="w-6 h-6" />} 
          label="Criar" 
          active={false} 
        />
        <NavItem 
          icon={<User className="w-6 h-6" />} 
          label="Perfil" 
          active={false} 
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${active ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]' : 'text-white/40 hover:text-white/80'}`}>
      {icon}
      <span className="font-serif text-[10px] font-medium tracking-wide">{label}</span>
    </div>
  );
}
