/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  BookOpen, 
  Library, 
  Clapperboard, 
  CirclePlus, 
  User, 
  Search, 
  Star,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Story } from './types';

const MOCK_STORIES: Story[] = [
  {
    id: '1',
    title: 'O Eco de Ravenwood',
    lastAccess: 'Ontem',
    chapter: 4,
    totalChapters: 12,
    progress: 35,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDac4njiL0so8btx-Invhc05rgGe075v3NFOLxlGe4Wkv5mTUIBP4aiSA7nPVR9wOmA2Y--pdMLddRTkwFhLtxsmCKPqh3q6KgY5KzVBir074iZyt3mdcvGaRMzDR_iwfFRLfIdzkHd9b9FjOjq8LZRLrTb3wd14wZFhUZiLluiCYNphbS22zBPAFtNPah8K7oRX2XJDlZWIS-tOgYgwkh7JbbSDJm-VBPPCsFJdQUVEYPjdJPPjmr1OdJf1_5wWKVwu7yRPzRzziM',
    genre: 'Mistério',
    status: 'in-progress'
  },
  {
    id: '2',
    title: 'Protocolo Neon',
    lastAccess: '2h atrás',
    chapter: 8,
    totalChapters: 10,
    progress: 80,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChgrpD--HRB5p3nj_UV1fNAQyOXP3jIGT8ALdFWXeUIGAa0R3MW8ZrUtIVD2w74yvdorT6Ix1Qrv_pS-i8zIj7r27tWgmhF8gFjl0zqd4Nha_U38tUtQaomuurb295ceIWcWOfQXlromiaJZN93QBGYtJLvwXdRcKqzbO4nIQesGhiLRH4VLmTDUmxuJIxDMd2_Gdj-IahomZa-lt0w0tmYdqsQRGJpMWm0_v76btmuflbn50p63Rq8CNT-Ea_z5MnnN6qTojmbk8',
    genre: 'Sci-Fi',
    status: 'in-progress'
  }
];

const COMPLETED_STORIES: Story[] = [
  {
    id: '3',
    title: 'A Herdeira de Cinzas',
    lastAccess: '',
    chapter: 0,
    totalChapters: 0,
    progress: 100,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2X_6QVApihgeowCHavhn_ArNioFPD5_3KZsDQ7T2W6zrM2cFPOCWuvOQ_p4-qoE8fPX8L8KXvjWhjBZnmJX9zXUHiBPyTyOV0_2ujhoyWeQmr5HUecFfmzxpwhg9RVui7TlJUrvWZS8ZjBdzv2-CSdXPyjRaDacnpIYAckR-blzG_HAUL9WXtUEPbo_8SYS2oxXomAvCy4G1rm-Fv3E69TaI4Iah97cA2Ld3HQJcmeePBkr_k7WkAROTl175kNKSt37A6Z4pY6B8',
    genre: 'Fantasia',
    status: 'completed',
    rating: 4.9,
    date: '15 Out'
  },
  {
    id: '4',
    title: 'Dunas de Orion',
    lastAccess: '',
    chapter: 0,
    totalChapters: 0,
    progress: 100,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB87B3MwcQ2HZRbve5LcmIMYpzY1eSPlJEc8StVL-5IZhViaYmIW7ILZZYwagsR15oXfYw7UXKxRtMeNDbkZpmXiQDTT-NELMeQKHcfEQJmj-56YOSFPy1RYqEm_Qz9xKVCztpu33Wzr9NGVLBENGeWKgJjE_HB-o1lMHyK80iY4YHRW4q-JLDf-ng3_OvdLXpxdz2znBnuEXRJnbFKqUXJhcukFD8P35QFTfMgJny_LKyv7Szz6zQ2D1gRWj7-4LrA_UF2gibTLoU',
    genre: 'Exploração',
    status: 'completed',
    rating: 4.7,
    date: '02 Out'
  }
];

export default function App() {
  const [activeFilter, setActiveFilter] = useState<'progress' | 'creations'>('progress');

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary/30 pb-32">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-black/70 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-violet-400" />
          <h1 className="font-serif italic text-xl font-bold text-violet-400 tracking-tight">Enredo.ai</h1>
        </div>
        <button className="p-2 text-zinc-500 hover:text-violet-300 transition-colors rounded-full hover:bg-white/5">
          <Search className="w-6 h-6" />
        </button>
      </header>

      <main className="pt-24 px-5 max-w-2xl mx-auto space-y-10">
        {/* Hero Section */}
        <section>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl font-semibold mb-1"
          >
            Minhas Histórias
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-on-surface-variant"
          >
            Continue suas jornadas ou gerencie suas criações.
          </motion.p>
        </section>

        {/* Filter Chips */}
        <nav className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <button 
            onClick={() => setActiveFilter('progress')}
            className={`px-5 py-3 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
              activeFilter === 'progress' 
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                : 'bg-surface-container-high text-on-surface-variant border border-white/10 hover:bg-surface-container-highest'
            }`}
          >
            Em progresso
          </button>
          <button 
            onClick={() => setActiveFilter('creations')}
            className={`px-5 py-3 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
              activeFilter === 'creations' 
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                : 'bg-surface-container-high text-on-surface-variant border border-white/10 hover:bg-surface-container-highest'
            }`}
          >
            Minhas criações
          </button>
        </nav>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {activeFilter === 'progress' && MOCK_STORIES.map((story, index) => (
              <StoryCard key={story.id} story={story} index={index} />
            ))}
          </AnimatePresence>

          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center bg-surface-container-lowest hover:bg-surface-container-low transition-colors cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
              <PlusCircle className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-xl font-semibold text-on-surface">Nova História</h3>
            <p className="text-zinc-500 text-sm mt-1">Comece a escrever sua própria jornada épica com IA.</p>
          </motion.div>
        </div>

        {/* Recently Completed */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Concluídas recentemente</h3>
            <button className="text-violet-400 text-sm font-bold hover:underline">Ver tudo</button>
          </div>
          <div className="space-y-3">
            {COMPLETED_STORIES.map((story, index) => (
              <HistoryListItem key={story.id} story={story} index={index} />
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-20 bg-black/70 backdrop-blur-xl border-t border-white/10 shadow-2xl">
        <NavItem icon={<Library />} label="Biblioteca" />
        <NavItem icon={<BookOpen />} label="Lendo" active />
        <NavItem icon={<Clapperboard />} label="Cenas" />
        <NavItem icon={<CirclePlus />} label="Criar" />
        <NavItem icon={<User />} label="Perfil" />
      </nav>
    </div>
  );
}

function StoryCard({ story, index }: { story: Story; index: number }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="relative group aspect-[3/4] rounded-2xl overflow-hidden bg-surface-container card-rim shadow-2xl transition-all active:scale-95 cursor-pointer"
    >
      <img 
        className="absolute inset-0 w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" 
        src={story.imageUrl} 
        alt={story.title}
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
      
      <div className="absolute top-4 right-4">
        <span className="px-3 py-1 bg-violet-600/90 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-widest leading-none">
          {story.genre}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col gap-1">
        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">Último acesso: {story.lastAccess}</p>
        <h3 className="font-serif text-2xl font-bold text-white leading-tight text-shadow-strong">{story.title}</h3>
        
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-semibold text-violet-300">
            <span>Capítulo {story.chapter} de {story.totalChapters}</span>
            <span>{story.progress}%</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${story.progress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-primary"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryListItem({ story, index }: { story: Story; index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-4 p-3 rounded-2xl bg-surface-container-low border border-white/5 hover:bg-surface-container transition-all cursor-pointer group"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
        <img 
          className="w-full h-full object-cover transition-transform group-hover:scale-110" 
          src={story.imageUrl} 
          alt={story.title}
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex-grow">
        <h4 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{story.title}</h4>
        <p className="text-zinc-500 text-xs">{story.genre} • Finalizado em {story.date}</p>
      </div>
      <div className="flex items-center gap-1 text-violet-400">
        <Star className="w-4 h-4 fill-current" />
        <span className="text-sm font-bold">{story.rating}</span>
      </div>
    </motion.div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-col items-center justify-center gap-1 transition-all ${
      active ? 'text-violet-400 font-bold scale-110' : 'text-zinc-500 hover:text-zinc-300'
    }`}>
      {active ? (
        <span className="[&>svg]:fill-current">{icon}</span>
      ) : icon}
      <span className="font-serif text-[10px] font-medium tracking-wide">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="w-1 h-1 bg-violet-400 rounded-full mt-1"
        />
      )}
    </button>
  );
}
