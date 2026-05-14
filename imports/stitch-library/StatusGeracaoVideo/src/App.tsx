/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Menu, 
  Settings, 
  Sparkles, 
  Play, 
  BookOpen, 
  Film, 
  EyeOff, 
  Share2, 
  Library, 
  PlusCircle, 
  UserCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulate progress and ready state
  useEffect(() => {
    if (!isReady) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setIsReady(true), 500);
            return 100;
          }
          return prev + 1;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isReady]);

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface selection:bg-primary/30">
      <Background />
      <Navbar />
      
      <main className="relative z-10 pt-24 pb-32 px-5 max-w-7xl mx-auto min-h-screen grid grid-cols-1 md:grid-cols-2 gap-8 content-start">
        <AnimatePresence mode="wait">
          {!isReady ? (
            <motion.section 
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center justify-center min-h-[400px] glass-panel rounded-2xl p-6 cinematic-glow"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
                <div className="relative w-24 h-24 rounded-full border-b-2 border-l-2 border-primary animate-spin flex items-center justify-center">
                  <Sparkles className="text-primary w-10 h-10" />
                </div>
              </div>
              <div className="text-center space-y-4 max-w-xs">
                <h2 className="font-serif text-3xl font-semibold">Gerando sua cena...</h2>
                <p className="text-on-surface-variant text-base opacity-80 leading-relaxed">
                  Isso pode levar até 30 segundos enquanto nossa IA orquestra sua narrativa.
                </p>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-6">
                  <motion.div 
                    className="h-full bg-primary shadow-[0_0_10px_rgba(167,139,250,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section 
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="relative aspect-video rounded-2xl overflow-hidden glass-panel group cursor-pointer border border-white/5 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=2000&auto=format&fit=crop" 
                  alt="City at night with purple neon lights"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(167,139,250,0.6)] group-hover:scale-110 transition-transform active:scale-95 duration-200">
                    <Play className="text-on-primary fill-on-primary w-10 h-10 translate-x-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest font-sans">
                    Cena Pronta
                  </span>
                  <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest font-sans">00:12</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setIsReady(false)}
                  className="w-full h-14 bg-primary-container text-on-primary-container font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg cinematic-glow"
                >
                  <BookOpen className="w-5 h-5" />
                  Voltar para História
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button className="h-12 glass-panel text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all">
                    <Film className="w-5 h-5 text-primary" />
                    Publicar
                  </button>
                  <button className="h-12 glass-panel text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all">
                    <EyeOff className="w-5 h-5 text-white/40" />
                    Privado
                  </button>
                </div>
                <button className="w-full h-12 flex items-center justify-center gap-2 text-white/60 hover:text-white transition-colors border border-white/5 rounded-xl bg-white/5">
                  <Share2 className="w-5 h-5" />
                  Compartilhar com o mundo
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}

function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-4">
        <Menu className="text-white/60 hover:text-primary transition-colors cursor-pointer w-6 h-6" />
        <span className="font-serif font-black text-2xl tracking-tight text-primary drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]">
          Enredo.ai
        </span>
      </div>
      <Settings className="text-white/60 hover:text-primary transition-colors cursor-pointer w-6 h-6" />
    </header>
  );
}

function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black"></div>
      <img 
        className="w-full h-full object-cover opacity-30 grayscale-[20%] scale-110" 
        src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop"
        alt="Ancient misty forest"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function BottomNav() {
  const tabs = [
    { icon: <Library />, label: 'Biblioteca' },
    { icon: <BookOpen />, label: 'Lendo' },
    { icon: <Film />, label: 'Cenas', active: true },
    { icon: <PlusCircle />, label: 'Criar' },
    { icon: <UserCircle />, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-black/60 backdrop-blur-2xl border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex justify-around items-center h-20 pb-safe px-2">
      {tabs.map((tab, i) => (
        <a 
          key={i}
          href="#" 
          className={`flex flex-col items-center justify-center transition-all active:scale-90 duration-150 p-2 ${
            tab.active ? 'text-primary drop-shadow-[0_0_5px_rgba(167,139,250,0.8)]' : 'text-white/40 hover:text-white/80'
          }`}
        >
          <span className="mb-1 w-6 h-6">{tab.icon}</span>
          <span className="font-serif text-[10px] font-medium tracking-wide">{tab.label}</span>
        </a>
      ))}
    </nav>
  );
}
