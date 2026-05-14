/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { BookText, Search, Sparkles, Clapperboard, Palette, Copyright } from "lucide-react";
import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#0A0A0A]">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-black/70 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <BookText className="w-6 h-6 text-[#cebdff]" />
          <span className="font-serif italic text-xl font-bold text-[#cebdff] tracking-tight">Enredo.ai</span>
        </div>
        <div className="flex items-center gap-6">
          <button className="hidden md:block font-bold text-[12px] tracking-[0.1em] text-zinc-500 hover:text-[#cebdff] transition-colors uppercase">Planos</button>
          <button className="hidden md:block font-bold text-[12px] tracking-[0.1em] text-zinc-500 hover:text-[#cebdff] transition-colors uppercase">Sobre</button>
          <Search className="w-5 h-5 text-zinc-500 hover:text-[#cebdff] transition-colors cursor-pointer" />
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative flex-grow flex flex-col items-center justify-center pt-16">
        {/* Background Image with Gradients */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/50 z-10" />
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6DmzBNcV-VOKy0AlIMcveT0FckzGErl54OP6emvYzs6CZFLra8Wq7fWleOpMrhU-bSIqA5weQbbncgXVucgeiYDjj20NDiTQBYtGQ57VgDUu0cI-vcn3BY6DIuwG0Ayp8DonywgNopGkpOiE_7DOyXSa2w0il-Zz_DqLmsqC5lFMbgTi-iRI1qEbEa8TgmuVx1xzXzWcRiAF-t0sL0nizJuqksAIcdEuMz78pwx30b0nIXErNz0orQcIG1TIRSW1oUx6oe2MdEgA" 
            alt="Cinematic background" 
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content Overlay */}
        <section className="relative z-20 container mx-auto px-5 text-center max-w-4xl flex flex-col items-center py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <span className="font-bold text-[12px] tracking-[0.3em] text-[#cebdff] bg-[#cebdff]/10 px-4 py-1.5 rounded-full border border-[#cebdff]/20 uppercase">
              IA Narrativa
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-serif text-5xl md:text-7xl font-bold text-[#e5e2e1] mb-8 italic text-glow"
          >
            Enredo.ai
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-serif text-lg md:text-xl text-[#cac4d4] max-w-2xl mb-12 leading-relaxed"
          >
            Sua história, sua voz, seu destino. Mergulhe em universos infinitos onde cada escolha molda a realidade.
          </motion.p>

          {/* Action Cluster */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center justify-center mb-16"
          >
            <button className="group relative px-16 py-4 bg-[#cebdff] text-[#381385] font-bold rounded-lg transition-all active:scale-95 overflow-hidden w-full md:w-auto text-xl">
              <span className="relative z-10">Começar agora</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
            <button className="px-16 py-4 border border-white/20 text-[#e5e2e1] font-semibold rounded-lg hover:bg-white/5 transition-all active:scale-95 w-full md:w-auto text-xl">
              Entrar
            </button>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
            <FeatureCard 
              icon={<Sparkles className="w-6 h-6 text-[#cebdff]" />}
              title="IA Criativa"
              description="Narrativas geradas em tempo real com base nas suas decisões mais íntimas."
              delay={0.8}
            />
            <FeatureCard 
              icon={<Clapperboard className="w-6 h-6 text-[#cebdff]" />}
              title="Multiverso"
              description="De épicos de fantasia a mistérios cyberpunk, explore gêneros sem limites."
              delay={0.9}
            />
            <FeatureCard 
              icon={<Palette className="w-6 h-6 text-[#cebdff]" />}
              title="Visual Imersivo"
              description="Artes cinematográficas exclusivas acompanham cada capítulo da sua jornada."
              delay={1.0}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-10 px-5 border-t border-white/5 bg-[#0A0A0A]">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Copyright className="w-3 h-3" />
            <p className="font-bold text-[10px] tracking-widest uppercase">2024 ENREDO.AI — TODOS OS DIREITOS RESERVADOS</p>
          </div>
          <div className="flex gap-10">
            <a href="#" className="font-bold text-[10px] tracking-widest text-zinc-500 hover:text-[#cebdff] transition-colors uppercase">Termos</a>
            <a href="#" className="font-bold text-[10px] tracking-widest text-zinc-500 hover:text-[#cebdff] transition-colors uppercase">Privacidade</a>
            <a href="#" className="font-bold text-[10px] tracking-widest text-zinc-500 hover:text-[#cebdff] transition-colors uppercase">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      className="glass-panel p-6 rounded-2xl border border-white/5 rim-light"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-[#e5e2e1] mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}
