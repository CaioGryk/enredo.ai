/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Cinematic Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[150px] rounded-full"
        ></motion.div>
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-[-10%] right-[-20%] w-[70%] h-[70%] bg-violet-900/30 blur-[150px] rounded-full"
        ></motion.div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           className="relative"
        >
          {/* Logo Graphic */}
          <div className="w-24 h-24 mb-8 bg-primary rounded-[2rem] rotate-12 flex items-center justify-center shadow-[0_0_40px_rgba(206,189,255,0.4)]">
             <div className="w-12 h-1 bg-on-primary rounded-full -rotate-45 translate-y-1"></div>
             <div className="w-8 h-1 bg-on-primary rounded-full -rotate-45 -translate-y-1 -translate-x-1"></div>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ letterSpacing: "0.5em", opacity: 0 }}
          animate={{ letterSpacing: "0.15em", opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="font-serif text-6xl font-bold text-white mb-4 uppercase"
        >
          Enredo
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="text-on-surface-variant font-sans tracking-widest text-sm"
        >
          O DESTINO É SEU
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          onClick={onComplete}
          className="mt-20 px-10 py-4 bg-white/5 border border-white/10 rounded-full text-white font-sans tracking-wide hover:bg-white/10 transition-colors active:scale-95 duration-300"
        >
          Começar Jornada
        </motion.button>
      </div>
    </div>
  );
}
