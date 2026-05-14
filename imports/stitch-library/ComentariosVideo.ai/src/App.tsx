/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  X, 
  Heart, 
  Flag, 
  Send, 
  Library, 
  Book, 
  Film, 
  PlusCircle, 
  User 
} from 'lucide-react';

const COMMENTS = [
  {
    id: 1,
    user: "@narrador_obscuro",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuClVMz6QWQp6fpLCPpnfN_HjH1hfhyZhXvuu7xPZaEjIVJSpiOp8nKKAK23jbaCQ1_prIc6Cg8HLeczASA6Fe1BfIgfn_tCOsxFHNzkVelf72AxVnTTrDf583nXs-rLodiO_Ld087dAhYoYuVQwa0QKD88v0V7RTOXWmGV76NNC0DagDFL9NVDd4yT5Sny005g6RkXcedeCRyPIP5_pD8EIhi4xKV19kme3aBa-zu3_zIcO_5v68qtgocy7Lh1Cer0zEdVNuc7WO-M",
    text: "Essa reviravolta no terceiro ato me deixou sem palavras. A atmosfera está impecável!",
    time: "2h atrás",
    likes: 245,
    liked: false
  },
  {
    id: 2,
    user: "@clara_escrita",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCY_c8ojGo_io4XaXli3HIqbKtdVcNJnxD2vKq2nNTQj-h5pyOYpkwmV3inIZyLqsUvUjHPom0NnOYsE4pero6aT95GTPBWDHzDpq3XUw65LfrUY2s1FgWNiG5oWP5k0cc8Ee9BD3-qlZ9Iv5Y1-1hMSheQxpMsPBIGpAv2_IlyZg9s5gMf6aF69eqIG05N3JgFTt5j5KGnlzQuhadk7niN9vN-hPZUJjTTAv1gfsviwygddNvW9XbNZLtl3y8_XSmUKkPq6BR7nkg",
    text: "A escolha das palavras aqui é quase poética. É como se eu pudesse sentir o frio da cena.",
    time: "5h atrás",
    likes: 89,
    liked: true
  },
  {
    id: 3,
    user: "@velho_livreiro",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAgFKuSj_5LoC8T2Rpi6L5py2IfojTV71SFnp2QOsjfJM8Sw38shuj-8f7rHlQw_wVKi-GVrTerKkxjjEK7L68DENI22okHpDT4puDeitj97RjHDDC2NDh1AmVrWYPGs_iUn0JW7miwnnYrcL2qvfyw95_BXp_lHvtKjJLiIj7PvLNiT-UOVIBEEL0SOW1_UihxmizLRU7wxtvphw99hOrgvVjCaNgyvz8XLdkqgrIlg25szM7oqVR6r-zRIcG5yrfpRrjFOGsflZ8",
    text: "Lembra muito os clássicos do suspense gótico. Mal posso esperar pelo próximo episódio.",
    time: "1d atrás",
    likes: "1.1k",
    liked: false
  }
];

export default function App() {
  const [commentText, setCommentText] = useState("");
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);

  return (
    <div className="relative h-screen w-full flex flex-col font-sans overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYS0QcpG2qwYHw52Mxzj8yHJVzsTGDpTfNkr7_kU1bd7XHZuqRr0DPJaYR2UDMA-YGSl8usLOdJBxJc7Q-eRz_ZZgL5LADOl9QHyuAOAkht1SEfbs8zGAA540aQdnWplG37h4Tk6TfCqk5QeWxBpLfVtytq5n-tRU1xhASD2sfuY4p2jBytfQbi03xvIupDIEoZntwg8-LbJxbOGwt0tlWqUMT5n8kVrkeS69o4okwruOsvAWhfYryHtO8TfanEl-wEqefpEMfahU" 
          alt="Atmospheric forest"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 scrim-gradient" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-20 flex justify-between items-center px-6 pt-12 pb-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-violet-accent" />
          <span className="font-serif italic text-xl font-bold text-violet-accent tracking-tight">Enredo.ai</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-on-surface-variant hover:text-white transition-colors">
          <Search className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area (Spacers) */}
      <div className="flex-1" />

      {/* Bottom Sheet - Comments */}
      <AnimatePresence>
        {isCommentsOpen && (
          <motion.section
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-30 bg-black/60 glass-blur rounded-t-[32px] bottom-sheet-shadow border-t border-white/10 flex flex-col h-[70vh] max-h-[640px]"
          >
            {/* Sheet Handle */}
            <div className="w-full flex justify-center py-4">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-xl font-semibold">Comentários</h2>
                <span className="text-xs font-bold tracking-widest text-secondary flex items-center justify-center px-3 py-1 bg-white/10 rounded-full">1.2K</span>
              </div>
              <button 
                onClick={() => setIsCommentsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scroll-smooth overflow-x-hidden">
              {COMMENTS.map((comment) => (
                <motion.article 
                  key={comment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: comment.id * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-white/10 ring-2 ring-white/5">
                    <img 
                      src={comment.avatar} 
                      alt={comment.user} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold tracking-widest text-violet-accent uppercase">{comment.user}</span>
                      <span className="text-[10px] text-zinc-500">{comment.time}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-on-surface/90 font-medium">
                      {comment.text}
                    </p>
                    <div className="mt-4 flex items-center gap-6">
                      <button className={`flex items-center gap-2 text-[11px] font-bold tracking-wider transition-colors ${comment.liked ? 'text-violet-accent' : 'text-zinc-500 hover:text-white'}`}>
                        <Heart className={`w-4 h-4 ${comment.liked ? 'fill-current' : ''}`} />
                        {comment.likes}
                      </button>
                      <button className="text-zinc-600 hover:text-red-500 transition-colors">
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Bottom Input */}
            <div className="p-6 bg-black/20 backdrop-blur-xl border-t border-white/10 pb-10">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-3 focus-within:border-violet-accent/50 focus-within:bg-white/10 transition-all duration-300">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXhQNmbEtx1oUZ1DJrA7xS0bDJ7qd_8FKtTD5Pr_88FduSWCDXQ7Vq4qplLPLIQPJBbZW4l9JViQ7_G0-ALy3I7hLZccGIClOzwBHpZ2wjSi0LN2-sFpn8cQcwL_cuk7C4hp_c5UAtQSvdHiLxZS1ljlzHrw33K-jR2xxVX_xv_f2w0woBaICx-dljnsQiBnGB8EfySwUV3k8hGlCpSgP2QiqmjkcsKszVmPRupXh4bih773ONrpkM3avdqV6y7m8hxPnPNj6AKqI" 
                    alt="Current user" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <input 
                  type="text" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="flex-1 bg-transparent border-none text-sm text-on-surface placeholder:text-zinc-500 focus:ring-0 outline-none"
                />
                <button 
                  className={`transition-all duration-300 ${commentText.trim() ? 'text-violet-accent scale-110 opacity-100' : 'text-zinc-600 opacity-50'}`}
                  disabled={!commentText.trim()}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-40 h-24 bg-black/60 backdrop-blur-xl border-t border-white/10 flex justify-around items-center px-4 pt-2 pb-safe shadow-2xl shadow-black">
        <NavItem icon={<Library className="w-6 h-6" />} label="Biblioteca" />
        <NavItem icon={<Book className="w-6 h-6" />} label="Lendo" />
        <NavItem icon={<Film className="w-6 h-6" />} label="Cenas" active />
        <NavItem icon={<PlusCircle className="w-6 h-6" />} label="Criar" />
        <NavItem icon={<User className="w-6 h-6" />} label="Perfil" />
      </nav>

      {/* Toggle Button if Closed */}
      {!isCommentsOpen && (
        <motion.button
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setIsCommentsOpen(true)}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-violet-accent px-6 py-3 rounded-full font-serif font-bold text-on-primary shadow-lg shadow-violet-accent/20"
        >
          Ver Comentários (1.2k)
        </motion.button>
      )}
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 group ${active ? 'text-violet-accent' : 'text-zinc-500 hover:text-zinc-300'}`}>
      <div className={`relative transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
        {active && (
          <motion.div 
            layoutId="active-indicator"
            className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-violet-accent rounded-full border border-black" 
          />
        )}
      </div>
      <span className="font-serif text-[10px] font-medium tracking-tight">{label}</span>
    </button>
  );
}

