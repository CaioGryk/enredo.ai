import { LibraryBig, BookOpen, Clapperboard, CirclePlus, User } from 'lucide-react';
import { motion } from 'motion/react';

const navItems = [
  { icon: LibraryBig, label: 'Biblioteca', active: false },
  { icon: BookOpen, label: 'Lendo', active: false },
  { icon: Clapperboard, label: 'Cenas', active: false },
  { icon: CirclePlus, label: 'Criar', active: false },
  { icon: User, label: 'Perfil', active: true },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full z-50 bg-black/70 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center h-20 pb-safe px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.a
            key={index}
            href="#"
            whileTap={{ scale: 0.9 }}
            className={`flex flex-col items-center justify-center font-serif text-[10px] font-medium tracking-wide transition-all duration-150 ${
              item.active 
                ? 'text-violet-400 drop-shadow-[0_0_5px_rgba(167,139,250,0.8)]' 
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            <Icon size={24} className="mb-1" />
            {item.label}
          </motion.a>
        );
      })}
    </nav>
  );
}
