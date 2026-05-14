/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Camera, Image as ImageIcon, User, ChevronRight, RotateCw, PlusCircle, PenLine } from "lucide-react";

export default function ProfileSetup() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-5 overflow-hidden">
      {/* Background Cinematic Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900/50 to-black"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-900/30 blur-[120px] rounded-full"></div>
      </div>

      {/* Main Onboarding Container */}
      <main className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/10 mb-10 overflow-hidden rounded-full">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "75%" }}
            className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(206,189,255,0.5)]"
          />
        </div>

        {/* Header */}
        <header className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-4xl font-semibold text-on-surface mb-2"
          >
            Sua Identidade
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-sans text-on-surface-variant px-4 leading-relaxed"
          >
            Toda grande história precisa de um rosto. Como você quer ser visto em Enredo.ai?
          </motion.p>
        </header>

        {/* Profile Avatar Placeholder Section */}
        <div className="relative mb-12 group cursor-pointer">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-48 h-48 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center bg-surface-container-low transition-all duration-300 group-hover:border-primary/50 relative overflow-hidden"
          >
            <User className="text-outline w-20 h-20 group-hover:text-primary transition-colors duration-300" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
              <PlusCircle className="text-white w-10 h-10" />
            </div>
          </motion.div>
          {/* Contextual Action Badge */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="absolute bottom-2 right-2 bg-primary text-on-primary p-2.5 rounded-full shadow-lg cinematic-glow"
          >
            <PenLine className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Action Options */}
        <div className="w-full space-y-3">
          {[
            { icon: Camera, label: "Tirar foto", sublabel: null, type: "camera" },
            { icon: ImageIcon, label: "Escolher da galeria", sublabel: null, type: "gallery" },
            { 
              icon: User, 
              label: "Usar do Google", 
              sublabel: "Sincronização rápida", 
              type: "google",
              rightIcon: RotateCw
            },
          ].map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (index * 0.1) }}
              whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              whileTap={{ scale: 0.98 }}
              className="w-full glass-card rim-light flex items-center p-5 rounded-2xl group transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mr-4 group-hover:bg-primary/20 transition-colors">
                <item.icon className="text-primary w-6 h-6" />
              </div>
              <div className="flex flex-col items-start flex-1">
                <span className="font-sans text-lg font-semibold text-on-surface">{item.label}</span>
                {item.sublabel && (
                  <span className="text-[12px] text-on-surface-variant font-medium">{item.sublabel}</span>
                )}
              </div>
              {item.rightIcon ? (
                <item.rightIcon className="text-outline w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <ChevronRight className="text-outline w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Footer Actions */}
        <footer className="mt-12 w-full flex flex-col items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-2xl text-lg cinematic-glow shadow-[0_0_20px_rgba(206,189,255,0.3)]"
          >
            Confirmar Perfil
          </motion.button>
          <button className="w-full py-4 text-on-surface-variant font-sans text-xs uppercase tracking-[0.2em] font-bold hover:text-on-surface transition-colors">
            Pular por enquanto
          </button>
        </footer>
      </main>

      {/* Visual Embellishment: Background Bottom Fade */}
      <div className="fixed bottom-0 left-0 w-full h-32 pointer-events-none bg-gradient-to-t from-black to-transparent opacity-50" />
    </div>
  );
}
