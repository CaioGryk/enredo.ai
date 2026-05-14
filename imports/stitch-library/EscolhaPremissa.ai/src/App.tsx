/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  ChevronLeft, 
  Compass, 
  Terminal, 
  Sparkles, 
  CheckCircle2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Premise {
  id: string;
  title: string;
  description: string;
  tag: string;
  image: string;
  icon: any;
}

const PREMISES: Premise[] = [
  {
    id: "reliquia",
    title: "O Relíquia Esquecida",
    description: "Você descobre um artefato pulsante enterrado nas ruínas de uma biblioteca ancestral. Ele parece sussurrar segredos de uma civilização extinta.",
    tag: "MISTÉRIO",
    icon: Compass,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAL47yiPJcV4zNy0-EBr3EKTzxJKdo4vF8T4DNa_p9OmtD2HqfH5MnkFnrdjpvIJwk7eJosLjxmxCjYU40LppYgRV9R0-9KfTVBWYfI79a3CRAjQXu0p5vsuhmXEAXaXpL9NK0nY6T-Hn6e-MHBrxyMFldOqU7QHjToApo_3Sp5QXTSsqgeaPb8V3QDfEwJS9Dc1wMHAA9568nZCKAfnfZe6uu7uZAtygzrz922-fPaGXcfgd2PW-cecOGzcKZsldFXJDI_BRlr1vQ",
  },
  {
    id: "falha",
    title: "A Falha no Sistema",
    description: "A rede neural que governa a cidade começa a apagar memórias coletivas. Você é o único que ainda consegue lembrar da verdade.",
    tag: "DIFÍCIL",
    icon: Terminal,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCegk7KtyKbNuWdjRkIU2smEye68P1qwbZn8VjwJ_ph7pafyZLsOGT5rCM59qfGhqBn2xddNWtKeOAfeAWtJRq6vqs5BRtK1tQAom3vrHozGRr1NT3IoBUzccXESoU7cOlY2MiIBnn90JEvwecuerN7oNhLE1s3fXI_NwoQxNwxWa1Xi_AWxOPpkfTrJfDefRkRGITeRw3VR5YtAMnF8o9Dmit8OycZupGP0XT-PgqVhQUH58LC9IEa1MzCfbcuO8ouQeeW1NAaHz0",
  },
  {
    id: "pacto",
    title: "O Pacto Silencioso",
    description: "Nas montanhas geladas, você encontra uma entidade que oferece poder em troca de seu nome e de seu passado. Você aceitaria?",
    tag: "FANTASIA",
    icon: Sparkles,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBL4JMFCnG6ToyIB1ALzd3y35lXDaH9FJP47zX_RnqbK8xwBgfbFolYVG7lEEoXLXy6wXnsEPPWn_nk6PYgETTLm0TF73iKQSERV1UkvBtP5SXcGQELnJF9fkqrFcMfSjvZd-vMAjuNzE5dvX-yH66y4L4F3ym7Zg_JpqLThjvlr3WadUffiGySft65m5_8rOx7cM8zv9BMPy5SUcm6yNNJAu4XdnkM08WSoIf0hsviTD-6bK9sEdh0NrKWM3ghVKIcsrOHpfNWmek",
  },
];

export default function App() {
  const [selectedPremiseId, setSelectedPremiseId] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface selection:bg-primary/30 font-sans">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <button id="back-button" className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors group">
          <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-xs font-bold uppercase tracking-widest pt-0.5">Voltar</span>
        </button>
        
        <div className="flex items-center gap-1">
          <span className="font-serif italic text-2xl font-bold bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            Enredo.ai
          </span>
        </div>

        <div className="w-20" /> {/* Symmetry spacer */}
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-24 mb-32 px-6 max-w-5xl mx-auto w-full">
        {/* Intro Section */}
        <section className="mb-12 space-y-3">
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-primary text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]"
          >
            O Começo de Tudo
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl sm:text-5xl font-bold text-on-surface leading-tight"
          >
            Escolha sua Premissa
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-on-surface-variant text-base sm:text-lg max-w-2xl leading-relaxed"
          >
            Toda grande jornada começa com uma escolha. Selecione o ponto de partida que mais instiga sua curiosidade para moldar o destino desta narrativa.
          </motion.p>
        </section>

        {/* Premise Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {PREMISES.map((premise) => {
            const Icon = premise.icon;
            const isSelected = selectedPremiseId === premise.id;
            
            return (
              <motion.button
                key={premise.id}
                variants={itemVariants}
                onClick={() => setSelectedPremiseId(premise.id)}
                className={`group relative flex flex-col text-left rounded-2xl overflow-hidden glass-card transition-all duration-500 
                  ${isSelected ? 'ring-2 ring-primary bg-primary/10' : 'hover:ring-1 hover:ring-white/20'}`}
              >
                {/* Image Container */}
                <div className="aspect-[4/5] relative w-full overflow-hidden">
                  <img 
                    src={premise.image} 
                    alt={premise.title}
                    referrerPolicy="no-referrer"
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 scrim-bottom" />
                  
                  {/* Tag */}
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <span className="text-[10px] font-bold text-primary tracking-wider uppercase">{premise.tag}</span>
                  </div>

                  {/* Selection Checkmark */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-[2px]"
                      >
                        <div className="bg-primary text-on-primary p-3 rounded-full shadow-lg">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Content */}
                <div className="p-6 space-y-3 flex-1">
                  <div className="flex items-center gap-2.5 text-primary">
                    <Icon className="w-5 h-5 pt-0.5" />
                    <h3 className="font-serif text-xl font-semibold leading-none">{premise.title}</h3>
                  </div>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {premise.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </main>

      {/* Sticky Bottom Actions */}
      <footer className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background via-background/90 to-transparent pt-12">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <div className="w-full space-y-2">
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "33%" }}
                className="bg-primary h-full shadow-[0_0_15px_rgba(206,189,255,0.4)]"
              />
            </div>
            <p className="text-[10px] text-white/40 text-center font-bold tracking-[0.2em] uppercase">
              Passo 1 de 3: Contextualização
            </p>
          </div>

          <button 
            disabled={!selectedPremiseId}
            className={`w-full max-w-sm py-3.5 rounded-full font-bold text-sm uppercase tracking-widest transition-all duration-300
              ${selectedPremiseId 
                ? 'bg-primary text-on-primary shadow-[0_10px_30px_rgba(206,189,255,0.3)] hover:scale-[1.02] active:scale-95' 
                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'}`}
          >
            Confirmar Seleção
          </button>
        </div>
      </footer>
    </div>
  );
}
