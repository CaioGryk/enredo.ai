import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, X } from 'lucide-react';

interface Character {
  id: string;
  role: string;
  name: string;
  description: string;
  imageUrl: string;
}

const characters: Character[] = [
  {
    id: 'elias',
    role: 'O Renegado',
    name: 'Elias Thorne',
    description: 'Um ex-militar assombrado por decisões do passado, buscando redenção nas cinzas de uma cidade que ele outrora jurou proteger.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNBGCqTvLL-esUf-1AuOPnbEY7a8T9kgnYnVutiaojKsRccjUkfliKrPnKStc4mJXsMRarKCjJ9NGfgefryOMNinUDYlHwFwBB66lIdbgy5QB5PZdZMZajOPL_sJ1hwQ6Qx1ijzoqx8NQjmKjNCIZfM02mz_S-XU5ehLSukwjvyqkqOLuELlZR583BXcvZNbp_-nmb5iEpulDogocmAZVvvWnqRGTNmfqfwI46DPIr61u7ng_2WL5SRRgbyCB-I9GzwnfBpoaeKBc',
  },
  {
    id: 'valeria',
    role: 'A Estrategista',
    name: 'Valeria Vance',
    description: 'Mestra das sombras e da diplomacia, Valeria acredita que a caneta é mais letal que a espada, controlando impérios com um sussurro.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAW0UUM0ermxdc_J4z1NgYkbT94SX4XuGOudZG5MgUDz3JZnVfmcSU0WToR0eDsMoluubIGiOgabCdHkNwT89j9Of7kXcRdN4YZ57Ax5dgTYtJ152UTJDrr4yBFMgCxfeaFqPtE1czxrbnKrIQsFTuu-BYo-8Rula4IPbZlfl_wzXe2K9YOOFWxW8kr7zRrgallM7sAKK22A7QTi7JLha0bqEhScXAJ9nG9fNuoMrMtCdDXPRqEvfTdJjguR9Iv-lNAhlEPRgn-ius',
  },
  {
    id: 'kaelan',
    role: 'O Explorador',
    name: 'Kaelan Sunstrider',
    description: 'Um jovem movido pela curiosidade insaciável, capaz de ler as estrelas e encontrar caminhos onde outros veem apenas o vazio.',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVndpWLUFUSnA6FNrsZHlMaStZhiBb3okHEMgbMV3l3HWmVBN6BJqrzwYhEBNEQPhS8I0LLnKcEOkrRRE4nx2LyGXSrtB6ZYLGkDi7jLZQPlFknoD-bVhfRLqxAXtKwyWQDCluCXqiUnlatRXQl6iFBldYT2nIotJz7JJLhdo_3_5n13bIRuscOpdU-cXlI6KrMsAo80I6IEunv433UKEjA5YNzHMv04ANjw6z4-JhtVNePdEs_JBTm4T8V7p3NqGCxE35EXHFymw',
  },
];

export default function App() {
  const [selectedId, setSelectedId] = useState<string>('elias');

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col selection:bg-primary/30">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-black/70 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <BookOpen className="text-primary w-6 h-6" />
          <h1 className="font-serif italic text-xl font-bold text-primary tracking-tight">Enredo.ai</h1>
        </div>
        <button className="text-white/50 hover:text-primary transition-colors cursor-pointer">
          <X className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 flex flex-col pt-24 pb-32 px-5 max-w-lg mx-auto w-full">
        {/* Header Section */}
        <section className="mb-10 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-3xl font-semibold mb-2"
          >
            Quem você será?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-on-surface-variant text-base"
          >
            Cada escolha define um novo destino na sua jornada literária.
          </motion.p>
        </section>

        {/* Character Selection Grid */}
        <section className="flex flex-col gap-6">
          {characters.map((character, index) => (
            <motion.div
              key={character.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => setSelectedId(character.id)}
              className={`relative aspect-[3/4] rounded-xl overflow-hidden glass-card rim-light group cursor-pointer transition-all duration-300 ${
                selectedId === character.id ? 'ring-2 ring-primary scale-[1.02]' : 'hover:ring-1 hover:ring-white/30'
              }`}
            >
              <img 
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                  selectedId === character.id ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'
                }`}
                src={character.imageUrl}
                alt={character.name}
              />
              <div className="absolute inset-0 gradient-overlay" />
              
              {/* Active Indicator Chip */}
              <AnimatePresence>
                {selectedId === character.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-4 right-4 bg-primary text-on-primary text-[10px] sm:text-xs font-bold tracking-widest px-3 py-1 rounded-full shadow-lg"
                  >
                    SELECIONADO
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-0 left-0 w-full p-6">
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-1 block ${
                  selectedId === character.id ? 'text-primary' : 'text-secondary'
                }`}>
                  {character.role}
                </span>
                <h3 className="text-xl font-bold text-on-surface mb-2">{character.name}</h3>
                <p className="text-on-surface-variant text-sm line-clamp-3 font-medium opacity-90 leading-relaxed">
                  {character.description}
                </p>
              </div>
            </motion.div>
          ))}
        </section>
      </main>

      {/* Fixed Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 w-full bg-black/70 backdrop-blur-xl border-t border-white/10 px-6 py-6 z-50">
        <div className="max-w-lg mx-auto w-full">
          <button className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-lg cinematic-violet-glow transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(206,189,255,0.2)] cursor-pointer">
            Confirmar Escolha
          </button>
        </div>
      </footer>
    </div>
  );
}
