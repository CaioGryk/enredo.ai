/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, cloneElement, ReactElement } from 'react';
import { 
  Search, 
  Library, 
  BookOpen, 
  Film, 
  PlusCircle, 
  User, 
  Sparkles, 
  Rocket, 
  CheckCircle2 
} from 'lucide-react';
import { motion } from 'motion/react';

const GENRES = [
  'Ficção Científica',
  'Fantasia',
  'Horror',
  'Romance',
  'Noir',
  'Mistério'
];

const TONES = [
  'Sombrio',
  'Épico',
  'Sarcástico',
  'Poético'
];

const PREMISES = [
  {
    title: 'O Eco de Vidro',
    description: 'Uma investigação sobre a última memória biológica existente em Neo-Brasil.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBk_YHGpdJk-0F60i4gL1ryIIxLGGT7UuiRqWbJR5BxNp9wcJayLHbNLnekRBx_5SQjRm6tWsUeofTjn48uz-ist-_Rfxhwz7QKCQBHN3g8h4KeJLeHjtXJ-OBWEbVnxJxz41RESlYjWGDJfYlsXyIHF-9vcWo4ng-8i_HJpV_iBr6XeUTUHZUx2olYTY5ng67xm6tVcRYPF5ybrsyjhjWpDrP97dg_h1ewIOVF_xPoaSDSzkpcPCP6tpsXAjnXdsCS1xjRwhyxmWM'
  },
  {
    title: 'Fragmentos de Ontem',
    description: 'A jornada de uma vendedora de sonhos que começa a sonhar seus próprios crimes.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-ITvZbswpLXsSQWC7xIRNk76ADVWjyabCeG-dOOJBzTVVFYWmgAArLAqxQbvORdBqO_EDXTR3HRhi9-PhORlWaeP_3OpADGvHQjP8BMjFTRyHB8z7FNal4q7mvKP_AonFNvSuSMO9eQtrP1x7LHi25-Y0cAEjnRHp7cdQRjJsR6GcJXjyEMSwK3n2c5K0Nn7RBMGEnawDz90LHLAMGnNAqL9DBC4VxFK7OTOL8EI2ZuAqMbrtZjgSEbNDKZnnfbOmvW-iRvKnrLY'
  },
  {
    title: 'Códice do Silêncio',
    description: 'Um thriller político onde o silêncio é a única moeda que garante a sobrevivência.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvgnElLD-96sRSguTVanNb9ZyUzqdWxovb3dKNWVCR84dUuEViL2rSB-zmHyt5KMJ73R7PfPx2_hoqzG_i1hx-ZXnOtSd0OAwnImGar6GaflgR2-AXSrH0w1OXcRgjXyfp0T9xF-ubtJLnOQ_x1xrhL-z_5ns6ER2qj9E3xPvC5E12YL5aaqRRP6TIdFW1zH3qksL-nO72b1KpQzEWb_INXYemf43Ir_wxByBxqx2ObNH74klOrjoQzdFBiSqbcAVjXWo-Ij18WIQ'
  }
];

export default function App() {
  const [selectedGenre, setSelectedGenre] = useState('Ficção Científica');
  const [selectedTone, setSelectedTone] = useState('Épico');

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-black/70 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-violet-400" />
          <h1 className="font-serif italic text-xl font-bold text-violet-400">Enredo.ai</h1>
        </div>
        <button className="p-2 text-zinc-500 hover:text-violet-300 transition-colors">
          <Search className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-32 px-5 max-w-2xl mx-auto w-full space-y-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <span className="text-[10px] font-bold tracking-widest text-primary-container uppercase">Novo Arco</span>
          <h2 className="font-serif text-3xl font-semibold text-on-surface">Criar História</h2>
          <p className="text-on-surface-variant">Defina as sementes do seu próximo universo cinematográfico.</p>
        </motion.div>

        {/* Inputs */}
        <section className="space-y-8">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Palavras-chave</label>
            <input 
              type="text" 
              placeholder="Ex: Cyberpunk, Neon, Melancolia..."
              className="w-full bg-transparent border-0 border-b border-white/20 focus:border-violet-400 focus:ring-0 py-3 text-on-surface placeholder:text-zinc-600 transition-all font-serif italic text-lg"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Gênero</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`rim-light px-4 py-3 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between
                    ${selectedGenre === genre 
                      ? 'glass-panel border-violet-400/50 bg-violet-400/10 text-violet-400' 
                      : 'bg-zinc-900 text-on-surface-variant hover:bg-zinc-800'
                    }`}
                >
                  {genre}
                  {selectedGenre === genre && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Tom Narrativo</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-6 py-2 rounded-full border text-sm transition-all
                    ${selectedTone === tone 
                      ? 'bg-white/5 border-white/20 text-white shadow-lg' 
                      : 'border-white/10 text-zinc-400 hover:border-violet-400/50 hover:text-white'
                    }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* AI Feedback Section */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="rim-light glass-panel rounded-2xl p-6 space-y-6 relative overflow-hidden"
        >
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="animate-pulse">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="font-semibold text-lg text-primary">Conceito da História</h3>
          </div>

          <div className="p-4 bg-black/40 rounded-xl border-l-2 border-violet-400">
            <p className="font-serif text-lg italic leading-relaxed text-on-surface opacity-90">
              "Em um mundo onde o neon nunca apaga e as memórias são vendidas em frascos de vidro, um ex-detetive descobre que sua própria infância foi um rascunho descartado..."
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">Premissas Sugeridas</label>
            <div className="space-y-3">
              {PREMISES.map((premise, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ x: 4 }}
                  className="flex gap-4 items-start p-3 hover:bg-white/5 rounded-xl transition-colors group cursor-pointer"
                >
                  <div className="w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                    <img 
                      src={premise.image} 
                      alt={premise.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="py-1">
                    <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{premise.title}</h4>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{premise.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <div className="pt-4 pb-8">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-900/20 transition-all flex items-center justify-center gap-2 group"
          >
            <span>Gerar Universo</span>
            <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        </div>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-2 h-24 bg-black/70 backdrop-blur-xl border-t border-white/10 flex justify-around items-center">
        <NavButton icon={<Library />} label="Biblioteca" />
        <NavButton icon={<BookOpen />} label="Lendo" />
        <NavButton icon={<Film />} label="Cenas" />
        <NavButton icon={<PlusCircle />} label="Criar" active />
        <NavButton icon={<User />} label="Perfil" />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all
      ${active ? 'text-violet-400 scale-110' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
    >
      {cloneElement(icon as ReactElement, { 
        className: `w-6 h-6 ${active ? 'fill-current' : ''}` 
      })}
      <span className="font-serif text-[10px] font-medium uppercase tracking-tight">{label}</span>
    </button>
  );
}
