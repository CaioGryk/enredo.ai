/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  Star, 
  Castle, 
  Moon, 
  Flame, 
  Play, 
  Library, 
  Book, 
  Clapperboard, 
  PlusCircle, 
  User 
} from 'lucide-react';

// --- Components ---

const Header = () => (
  <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 glass-panel border-b border-white/10">
    <div className="flex items-center gap-2">
      <BookOpen className="w-6 h-6 text-violet-400" />
      <span className="font-serif italic text-xl font-bold text-violet-400">Enredo.ai</span>
    </div>
    <div className="flex items-center gap-4">
      <button className="text-zinc-500 hover:text-violet-300 transition-colors p-2">
        <Search className="w-5 h-5" />
      </button>
    </div>
  </header>
);

const Hero = () => (
  <section className="relative w-full h-[618px] flex items-end">
    <div className="absolute inset-0 z-0">
      <img 
        alt="Cinematic Hero Art" 
        className="w-full h-full object-cover" 
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-H_9ABZWkqiBtiNV-hzqx-PAmqch6pecu8vq7OPXZIsQN6I0WDOQuAG8ds-0KE-kKmuIzNp9PMM4N23kyuSi3cveIYwQkhHaIhqhoyR0Eyzyyaw6c4y4jAlJedBQHSgjcPoO0zDSRSDb6rQdx1FzyRMc8OuaqBt9lLET8soF9fYjsbWvxTamLEp8v59roJKwctjuj4d11-oEUaMTezhBQqGT45oF9kY5TP6W5j0t1ztQCxt0_VCU7boHHO3NBw5xVDcynfic9jbU"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 hero-gradient"></div>
    </div>
    <div className="relative z-10 px-6 w-full pb-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/30 border border-violet-400/20 mb-4 backdrop-blur-md"
      >
        <Sparkles className="w-3.5 h-3.5 text-violet-400 fill-violet-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-100 font-sans">Enredo.ai Original</span>
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-serif text-5xl md:text-6xl font-bold text-on-surface mb-2 leading-[1.1] tracking-tight"
      >
        Sombras de Aethelgard
      </motion.h1>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-3 mb-6"
      >
        <span className="text-on-surface-variant text-[11px] font-bold tracking-widest border border-outline-variant px-2 py-0.5 rounded uppercase">FANTASIA NEGRA</span>
        <div className="flex items-center gap-1 text-primary">
          <Star className="w-4.5 h-4.5 fill-primary" />
          <span className="font-sans text-sm font-semibold">4.9</span>
        </div>
        <span className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase">18+</span>
      </motion.div>
    </div>
  </section>
);

const Synopsis = () => (
  <section className="px-6 mt-2">
    <motion.p 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      className="font-serif text-lg text-on-surface-variant max-w-2xl leading-relaxed"
    >
      Em um reino onde a luz é uma mercadoria e as sombras sussurram segredos proibidos, você deve navegar pelas intrigas da corte celestial. Suas escolhas ditarão se o sol voltará a brilhar ou se o eterno eclipse consumirá o que resta da humanidade.
    </motion.p>
  </section>
);

const PremiseSection = () => {
  const [selected, setSelected] = useState(1);
  const premises = [
    { id: 0, icon: <Castle className="w-6 h-6" />, title: 'O Hereditário', desc: 'Comece como o último descendente de uma linhagem caída nos portões da capital.', recom: false },
    { id: 1, icon: <Moon className="w-6 h-6" />, title: 'O Infiltrado', desc: 'Inicie sua jornada nas sombras, trabalhando para a guilda dos tecelões de sonhos.', recom: true },
    { id: 2, icon: <Flame className="w-6 h-6" />, title: 'O Renegado', desc: 'Acorde nas masmorras de Aethelgard sem memórias, apenas com uma marca ardente.', recom: false },
  ];

  return (
    <section className="mt-16 px-6">
      <h2 className="font-serif text-xl font-semibold text-on-surface mb-6">Escolha seu ponto de partida</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {premises.map((p) => (
          <motion.div 
            key={p.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(p.id)}
            className={`bg-surface-container border p-6 rounded-xl rim-light transition-all cursor-pointer relative overflow-hidden ${
              selected === p.id ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-white/5 hover:bg-surface-container-high'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={selected === p.id ? 'text-violet-400' : 'text-primary-container'}>
                {p.icon}
              </div>
              {p.recom && (
                <span className="bg-violet-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">RECOMENDADO</span>
              )}
            </div>
            <h3 className="font-sans text-base font-semibold mb-1">{p.title}</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const CharacterSection = () => {
  const characters = [
    { 
      name: 'Elara Thorne', 
      role: 'Cavaleira das Sombras', 
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmiFoDiQfPF0ymssMAJE_tU7oMz-G_6zAW_3hqdBDPTiKO-mEDwTKbzuJmaRFAz2d2WhoUTRpS5UuRHSFGLKizV6QgO5S6Dd4Qm1K26hNS_IrKxwmsQj8GmXcAHvQTVSUihcQu1vfztUoH1DkFtV0UM4Wk52TKuwZBcaDVM7QLIEg64Sb4dE0kriOmTQdlN_jYQZkJmpM_uaGyKsYXHJu6cyAOmYxNWuAAOCUrAfA0Tyh-sNlNB7A9CJGz6y_K9QMNLciG3HRreHw'
    },
    { 
      name: 'Mago Kaelen', 
      role: 'Tecelão de Arcanos', 
      isHighlighted: true,
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqqizm4fE1bVWxMSTx3qJdl_akhfXMpXmvM6CkKzFyoi5tFvcrpjt1bYuhOCMyOGSD6aS1t58j6N3K8whhUnq_yVM-n1od2Evsr-HmuUhGibkCU4EcYC0xatw22sV5prYKYt_KPURvdY3DFe0Xw6dvDUJXzOTnEyP3_IdPfIA8q2G53ZJY9iYlBKFzulxyS1Sk7DsbPWnU_zU2siGJCRd5f4GjMnRP6b_Z7xBtSP4aqeIKFNsbFpAJAsx-fHRyYaL1SQGxU2PTMJc'
    },
    { 
      name: 'Lyra Vance', 
      role: 'Ladina de Aluguel', 
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBONtdzhSgqiCgxGEvLVe5jtrsjDPcm3bfv-8EPlvqpHeA7Sl_R9ax6IVuJVTLCyZkgu0yWweHH1xmRoqa0p7aFuOFoyGJsc5TrXD1iDm09HwnlBiB6enk4reQbqIyoH2V4vpMeDsQvgcW46HSnXfDW19HPFNoOV_fDTv9d3eI9vvnRvT8CDiO5x3Lr3IPpCLSYcqgSmJayAVyne6OywYXwX0sF2HJOWfty2V2RmwBBCwDKnL4riWBemxcJZXWnSCvsxwP-C77_KHE'
    },
  ];

  return (
    <section className="mt-16 px-6">
      <h2 className="font-serif text-xl font-semibold text-on-surface mb-6">Escolha seu personagem</h2>
      <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
        {characters.map((c, i) => (
          <div key={i} className="flex-none w-48 group cursor-pointer">
            <div className={`aspect-[3/4] rounded-xl overflow-hidden mb-3 border transition-all duration-300 ${
              c.isHighlighted ? 'border-primary border-2 shadow-lg shadow-primary/20 scale-100' : 'border-white/10 grayscale group-hover:grayscale-0 group-hover:border-primary/50'
            }`}>
              <img 
                alt={c.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                src={c.img}
                referrerPolicy="no-referrer"
              />
            </div>
            <p className={`font-sans text-sm font-semibold text-center mb-0.5 ${c.isHighlighted ? 'text-primary' : 'text-on-surface'}`}>{c.name}</p>
            <p className={`text-[10px] uppercase font-bold tracking-[0.2em] text-center ${c.isHighlighted ? 'text-violet-400' : 'text-zinc-500'}`}>{c.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const BottomNav = () => {
  const items = [
    { icon: <Library className="w-6 h-6" />, label: 'Biblioteca' },
    { icon: <Book className="w-6 h-6" />, label: 'Lendo', active: true },
    { icon: <Clapperboard className="w-6 h-6" />, label: 'Cenas' },
    { icon: <PlusCircle className="w-6 h-6" />, label: 'Criar' },
    { icon: <User className="w-6 h-6" />, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-20 glass-panel border-t border-white/10 shadow-2xl">
      {items.map((item, i) => (
        <button 
          key={i}
          className={`flex flex-col items-center justify-center gap-1 transition-all p-2 rounded-full hover:bg-white/5 ${
            item.active ? 'text-violet-400 scale-110' : 'text-zinc-500'
          }`}
        >
          {item.icon}
          <span className="font-serif text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

const CTAButton = () => (
  <div className="fixed bottom-24 left-0 w-full px-6 z-40 md:static md:mt-16 md:mb-12 max-w-lg mx-auto">
    <motion.button 
      whileHover={{ scale: 1.02, backgroundColor: '#a78bfa' }}
      whileTap={{ scale: 0.98 }}
      className="w-full bg-violet-600 py-6 rounded-xl font-bold text-white shadow-xl shadow-violet-900/40 flex items-center justify-center gap-2 transition-all"
    >
      <Play className="w-5 h-5 fill-white" />
      Iniciar História
    </motion.button>
  </div>
);

// --- Main App ---

export default function App() {
  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="max-w-7xl mx-auto">
        <Hero />
        <Synopsis />
        <PremiseSection />
        <CharacterSection />
        <CTAButton />
      </main>
      <BottomNav />
    </div>
  );
}
