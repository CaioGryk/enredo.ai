import { Menu, Settings } from 'lucide-react';
import { motion } from 'motion/react';

export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-black/70 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-4">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          className="text-violet-400 cursor-pointer p-1"
        >
          <Menu size={24} />
        </motion.button>
        <h1 className="font-serif font-black tracking-tight text-2xl text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]">
          Enredo.ai
        </h1>
      </div>
      <div className="flex items-center">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          className="text-white/60 hover:text-violet-300 transition-colors cursor-pointer p-1"
        >
          <Settings size={24} />
        </motion.button>
      </div>
    </header>
  );
}
