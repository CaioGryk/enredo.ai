/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Menu, 
  Settings, 
  BookOpen, 
  MessageCircle, 
  Sword, 
  Sparkles, 
  Film, 
  Send,
  Zap,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export default function App() {
  const [inputValue, setInputValue] = useState('');

  const choices = [
    { id: 'close', text: 'Tentar fechar o livro à força', icon: <BookOpen className="w-5 h-5 text-brand-violet" /> },
    { id: 'talk', text: 'Falar com o guarda', icon: <MessageCircle className="w-5 h-5 text-brand-violet" /> },
    { id: 'dagger', text: 'Desembainhar adaga', icon: <Sword className="w-5 h-5 text-brand-violet" /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-surface-base selection:bg-brand-violet/30">
      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 glass border-b border-white/10 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="text-white/60 hover:text-brand-violet transition-colors">
            <Menu size={24} />
          </button>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-sm tracking-tight text-brand-violet leading-tight">
              O Eco de Ravenwood
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
              Capítulo 4: O Véu de Sombras
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6">
            <span className="text-brand-violet font-serif text-sm font-medium cursor-pointer">Lendo</span>
            <span className="text-white/60 hover:text-brand-violet transition-colors font-serif text-sm font-medium cursor-pointer">Biblioteca</span>
            <span className="text-white/60 hover:text-brand-violet transition-colors font-serif text-sm font-medium cursor-pointer">Cenas</span>
          </nav>
          <button className="text-white/60 hover:text-brand-violet transition-colors">
            <Settings size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute -bottom-[1px] left-0 w-full h-[2px] bg-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '45%' }}
            className="h-full bg-brand-violet shadow-[0_0_8px_rgba(167,139,250,0.8)]"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-56 px-6 max-w-2xl mx-auto w-full overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Hero Visual */}
          <div className="relative w-full aspect-[3/4] md:aspect-[16/9] rounded-2xl overflow-hidden mb-8 shadow-2xl border border-white/5 group">
            <img 
              alt="Cena da Biblioteca" 
              className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-1000 group-hover:scale-105" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDE_VapqBEoCcogcb4Pvabva_nb4MMiDRlOglDLeY6-mi57QgP_0KAkKuw34nfdw1PvGHbsMUPrbz3KlcmyZWOHy2F5tUQj-XsAOwr74zK4qYZ-9b2wYK2MOlExZW5FHiI11bk0kVCJ0ipLEwsxze18fzbWhPZlwH5QLkUr2cwJXJ_kWWO0jbLS5ZUH55-YO-N9-HqoTOjlbWwFUmy1FelMk-eYCOFG7fwdkkIdfGxRf7kh9RIAIGbQvL4YvwyeI3ezeynFTYcnu0k"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent opacity-60" />
            
            <div className="absolute top-4 right-4">
              <span className="bg-black/60 backdrop-blur-md text-brand-violet px-3 py-1 rounded-full text-[10px] font-bold tracking-tight border border-white/10 uppercase">
                AI Generated Scene
              </span>
            </div>
          </div>

          {/* Story Text */}
          <article className="space-y-8 mb-12">
            <p className="drop-cap font-serif text-lg text-[#e5e2e1] leading-relaxed">
              O ar na biblioteca de Alexandria parecia subitamente mais denso, impregnado com o cheiro de pergaminho antigo e o aroma metálico de uma tempestade iminente. As sombras nas paredes, antes estáticas, agora dançavam em um ritmo frenético, como se os segredos guardados naquelas prateleiras estivessem lutando para escapar da celulose e da tinta.
            </p>
            <p className="text-gradient font-serif text-lg leading-relaxed prose-fade">
              Você sente o peso do livro em suas mãos. "O Véu de Sombras" vibra levemente, uma pulsação rítmica que ecoa as batidas do seu próprio coração. Na entrada, o vulto de um guarda se move, o metal de sua armadura rangendo no silêncio sepulcral. O tempo parece desacelerar. Cada escolha agora poderá selar o destino de Ravenwood para sempre.
            </p>
          </article>

          {/* Choice Selection */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Escolha seu caminho</h3>
            {choices.map((choice, index) => (
              <motion.button
                key={choice.id}
                whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="w-full bg-surface-panel/50 border border-white/5 p-5 rounded-2xl flex items-center justify-between group transition-all"
              >
                <span className="text-[#e5e2e1] font-medium">{choice.text}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {choice.icon}
                </div>
              </motion.button>
            ))}
          </section>
        </motion.div>
      </main>

      {/* Footer Interface */}
      <footer className="fixed bottom-0 w-full z-50">
        {/* Status Bar */}
        <div className="bg-black/40 backdrop-blur-xl border-t border-white/5 px-6 py-2 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">AI Ultra Model</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
              <Zap size={12} className="text-white/30" />
              <span className="text-[10px] text-white/40 font-bold tracking-wider">1.2s</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-brand-violet/10 px-3 py-1 rounded-lg border border-brand-violet/20">
            <Coins size={12} className="text-brand-violet" />
            <span className="text-[10px] text-brand-violet font-bold tabular-nums">420 CRÉDITOS</span>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-black/80 backdrop-blur-2xl border-t border-white/10 px-6 pt-4 pb-8">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Tool Buttons */}
            <div className="flex gap-2">
              <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-colors group">
                <Sparkles size={16} className="text-brand-violet transition-transform group-hover:rotate-12" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Gerar Imagem</span>
              </button>
              <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-colors group">
                <Film size={16} className="text-brand-violet transition-transform group-hover:scale-110" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Gerar Vídeo</span>
              </button>
            </div>

            {/* Main Input */}
            <div className="relative group">
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="O que você faz a seguir?..."
                className="w-full bg-transparent border-0 border-b-2 border-white/10 py-4 pr-12 text-[#e5e2e1] focus:ring-0 focus:border-brand-violet transition-all placeholder:text-white/20"
              />
              <button className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-brand-violet hover:scale-110 active:scale-95 transition-transform">
                <Send size={24} />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
