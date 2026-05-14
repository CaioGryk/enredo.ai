import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Library, 
  BookOpen, 
  Clapperboard, 
  PlusCircle, 
  User, 
  ArrowRight 
} from 'lucide-react';

// Common UI Components
const IconButton = ({ children, label, active = false, onClick }: { children: React.ReactNode, label?: string, active?: boolean, onClick?: () => void }) => (
  <div className="flex flex-col items-center gap-1 group">
    <motion.button 
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 transition-all duration-300 ${active ? 'text-cinematic-violet bg-white/20' : 'text-white'}`}
    >
      {children}
    </motion.button>
    {label && <span className="text-[10px] font-bold tracking-widest uppercase text-white/80 text-shadow-premium">{label}</span>}
  </div>
);

const NavItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <motion.a 
    href="#"
    whileTap={{ scale: 0.9 }}
    className={`flex flex-col items-center justify-center transition-all duration-300 ${active ? 'text-cinematic-violet' : 'text-white/40 hover:text-white/80'}`}
  >
    <Icon className="w-6 h-6" fill={active ? "currentColor" : "none"} />
    <span className="font-serif text-[10px] uppercase tracking-tighter mt-1">{label}</span>
  </motion.a>
);

export default function App() {
  const [liked, setLiked] = useState(false);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-cinematic-black select-none">
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <img 
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUcPJmSCo8X6z4QCxv81sRQHbMmCt94MRyANjsWClfzUZG_oTjHmwVpe93hzNF386vBVL3COdJc-H-mIgU9ZEr_P5VctAHIjwf4or466Y2AEkKJWFsQ0dEocvTQquT4YEoCUvD2Bad9OfB7vhjpCPTwYLvnEo8-JL3FEyahBCwosFk9ZBmRz-lo5Avg_e8WL4MdEfNTzZTE_LbWaiKkV7M3-5rQKS3tpu3032gHIdoKi6rz0fo_ukQbgDC-jQ7wxL0hqagoY1qrS8" 
          alt="Cyberpunk Alley Background"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
      </div>

      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 pt-10 pb-8 bg-transparent">
        <div className="flex flex-col">
          <motion.span 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif font-bold text-2xl text-cinematic-violet tracking-widest uppercase"
          >
            Enredo.ai
          </motion.span>
          <span className="text-[8px] font-bold text-white/60 tracking-[0.2em] mt-1 uppercase">
            ORIGINAL ENREDO.AI
          </span>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          className="text-white/80 hover:text-white transition-colors"
        >
          <Search className="w-7 h-7" />
        </motion.button>
      </header>

      {/* Right Interaction Rail */}
      <aside className="fixed right-4 bottom-32 z-40 flex flex-col items-center gap-6">
        <IconButton active={liked} onClick={() => setLiked(!liked)} label="5.2k">
          <Heart fill={liked ? "currentColor" : "none"} />
        </IconButton>
        
        <IconButton label="120">
          <MessageCircle />
        </IconButton>
        
        <IconButton>
          <Bookmark />
        </IconButton>
        
        <IconButton>
          <Share2 />
        </IconButton>
      </aside>

      {/* Main Content Area */}
      <main className="fixed bottom-24 left-0 w-full px-6 z-40">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4 mb-6"
        >
          {/* Badges */}
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-cinematic-violet text-black font-bold text-[9px] tracking-widest rounded-sm">
              GRÁTIS
            </span>
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md text-white font-bold text-[9px] tracking-widest rounded-sm border border-white/10">
              ORIGINAL
            </span>
          </div>

          {/* Creator Profile */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-cinematic-violet p-0.5 overflow-hidden">
              <img 
                className="w-full h-full object-cover rounded-full"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuATdxg9XapH_oYSJLD1Hs8XjnDkoCrgL0R0AYXPse5zGQZ1uxjQj6RUeJBE0N6dceD9uKfPiNyDzOMnYUR7dd2cT1cdBsYJi4_WbpGzNfe59IX4-ffM96mDebuyt1cnm3gMaP0BmRM5jcw40VjWnmcaZV707RbHbpMal1mBVNrOGP5AE4ujpG9OW3TC-abVOW7RXjSt3jhjVC60Q8936w92UAI0_jIQsJPuQBSIfIXYMGW97AUQqB6FEekPlzeqkPtSuJpRihBJZkw" 
                alt="Creator Avatar"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-base text-white font-bold tracking-tight">@cyber_scrivener</span>
          </div>

          {/* Story Metadata */}
          <div className="flex flex-col gap-1 pr-16 text-shadow-premium">
            <h1 className="font-serif text-3xl font-bold text-white tracking-tight leading-tight">
              Protocolo Neon
            </h1>
            <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">
              A consciência digital de Maya piscava em vermelho enquanto o protocolo final era iniciado no beco sem saída da memória...
            </p>
          </div>

          {/* Primary Action Button */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-2 w-full py-4.5 bg-cinematic-violet text-cinematic-black font-bold text-sm tracking-[0.1em] rounded-xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(206,189,255,0.4)] transition-all"
          >
            ENTRAR NESTA HISTÓRIA
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </main>

      {/* Progress Bar Overlay */}
      <div className="fixed bottom-[84px] left-0 w-full h-[2px] bg-white/10 z-50">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "33.33%" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="h-full bg-cinematic-violet shadow-[0_0_12px_rgba(206,189,255,0.8)]" 
        />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 h-22 rounded-t-[2.5rem] border-t border-white/5 bg-black/80 backdrop-blur-2xl flex justify-around items-center px-8 pb-4 shadow-2xl">
        <NavItem icon={Library} label="Biblioteca" />
        <NavItem icon={BookOpen} label="Lendo" />
        <NavItem icon={Clapperboard} label="Cenas" active />
        <NavItem icon={PlusCircle} label="Criar" />
        <NavItem icon={User} label="Perfil" />
      </nav>

    </div>
  );
}
