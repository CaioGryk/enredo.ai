/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookOpen, Check, Heart, MessageSquare, MoreHorizontal, PlusCircle, Settings, User } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center overflow-x-hidden pb-24">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-dark flex justify-between items-center px-6 h-16 max-w-md md:max-w-xl lg:max-w-2xl mx-auto md:rounded-b-2xl">
        <div className="text-xl font-black text-violet-accent drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] font-serif tracking-tight cursor-pointer">
          Enredo.ai
        </div>
        <div className="flex gap-4">
          <button className="text-white/60 hover:text-violet-accent transition-colors active:scale-95">
            <MoreHorizontal size={24} />
          </button>
          <button className="text-white/60 hover:text-violet-accent transition-colors active:scale-95">
            <Settings size={24} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-md px-5 mt-20 space-y-6">
        {/* Story Hero Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative h-[480px] w-full rounded-xl overflow-hidden glass shadow-2xl group cursor-pointer"
          id="hero-card"
        >
          <img 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4lgDGxTFMw3vu9un6JG6Qyq0uiTIdFWUAGER3VGBwC7lw5yGJoKxYmn3VW_ilYl9U2yTaLHUbEeSEXVwxoX_8VlNY99jIpr96gOec2geK1aMMp7jq4IZuMVGHd53mvfGQS7o4i1USbPvxUbyM560IdgeSniY-2-1RObGHGRTF8JhCMZ6mkHh1M6j9tF28L64EI4g8YWI5GD03Nwdce7E5p9VHLtaLhgt1dMVpvq-8oCvic6qcE89QgVaLumJOICiNQCo61SCbBcg" 
            alt="A Herdeira de Cinzas cover art"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          
          {/* Metadata Chips */}
          <div className="absolute top-4 right-4 h-max">
            <span className="bg-violet-accent/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
              Candidata à Biblioteca
            </span>
          </div>

          {/* Story Info */}
          <div className="absolute bottom-0 left-0 p-6 w-full space-y-3">
            <h1 className="text-3xl font-serif font-bold text-white leading-tight">
              A Herdeira de Cinzas
            </h1>
            <div className="flex items-center gap-2 text-white/70">
              <div className="w-6 h-6 rounded-full bg-violet-accent/20 flex items-center justify-center border border-violet-accent/30">
                <User size={14} className="text-violet-accent" />
              </div>
              <span className="text-sm font-medium">@clara_escrita</span>
            </div>
            
            {/* Stats Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 group/stat">
                  <Heart size={16} className="text-violet-accent fill-violet-accent" />
                  <span className="text-xs font-bold">1.2k</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/60">
                  <MessageSquare size={16} />
                  <span className="text-xs font-bold">450</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/60">
                  <BookOpen size={16} />
                  <span className="text-xs font-bold">890</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Promotion Status Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass rounded-xl p-6 border border-white/5"
          id="status-section"
        >
          <h3 className="text-xs font-bold text-violet-accent uppercase tracking-[0.2em] mb-6">
            STATUS DA PROMOÇÃO
          </h3>
          <div className="relative space-y-6">
            {/* Vertical Line */}
            <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-white/10" />
            
            {/* Steps */}
            <StatusStep status="completed" label="Publicada" />
            <StatusStep status="completed" label="Candidata à Biblioteca" />
            <StatusStep status="active" label="Em revisão editorial" />
            <StatusStep status="disabled" label="Selecionada" />
          </div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="mt-6 p-4 bg-violet-accent/5 rounded-lg border border-violet-accent/10"
          >
            <p className="text-sm text-white/70 font-medium leading-relaxed italic">
              "O engajamento da comunidade ajuda sua história a chegar aos nossos editores."
            </p>
          </motion.div>
        </motion.section>

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="pb-8 space-y-4"
          id="cta-section"
        >
          <button className="w-full bg-primary-container text-on-primary-container font-bold py-5 rounded-xl shadow-[0_0_30px_rgba(167,139,250,0.3)] hover:shadow-[0_0_40px_rgba(167,139,250,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
            <span className="text-lg">Enviar para Curadoria Final</span>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <PlusCircle size={20} className="rotate-[-45deg] group-hover:rotate-0 transition-transform duration-300" />
            </motion.div>
          </button>
          <p className="text-center text-[10px] text-white/40 uppercase tracking-[0.25em] font-bold">
            Aguarde o processamento dos dados
          </p>
        </motion.section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 glass-dark flex justify-around items-center h-20 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] max-w-md md:max-w-xl lg:max-w-2xl mx-auto md:rounded-t-2xl">
        <NavIcon icon={<BookOpen size={20} />} label="Biblioteca" />
        <NavIcon icon={<BookOpen size={20} />} label="Lendo" />
        <NavIcon icon={<MoreHorizontal size={20} />} label="Cenas" />
        <NavIcon icon={<PlusCircle size={24} />} label="Criar" active />
        <NavIcon icon={<User size={20} />} label="Perfil" />
      </nav>
    </div>
  );
}

function StatusStep({ status, label }: { status: 'completed' | 'active' | 'disabled', label: string }) {
  const iconMap = {
    completed: (
      <div className="z-10 w-6 h-6 rounded-full bg-violet-accent flex items-center justify-center">
        <Check size={14} className="text-black stroke-[3]" />
      </div>
    ),
    active: (
      <div className="z-10 w-6 h-6 rounded-full bg-surface-container border-2 border-violet-accent flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-2 h-2 rounded-full bg-violet-accent" 
        />
      </div>
    ),
    disabled: (
      <div className="z-10 w-6 h-6 rounded-full bg-surface-container flex items-center justify-center border border-white/20" />
    )
  };

  const textStyle = {
    completed: "text-white/90 font-bold",
    active: "text-violet-accent font-bold",
    disabled: "text-white/20 font-bold"
  };

  return (
    <div className="flex items-center gap-4 relative">
      {iconMap[status]}
      <span className={`text-sm tracking-wide ${textStyle[status]}`}>{label}</span>
    </div>
  );
}

function NavIcon({ icon, label, active = false }: { icon: ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${active ? 'text-violet-accent' : 'text-white/40 hover:text-white/80'}`}>
      <div className={active ? 'drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]' : ''}>
        {icon}
      </div>
      <span className="font-serif text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}
