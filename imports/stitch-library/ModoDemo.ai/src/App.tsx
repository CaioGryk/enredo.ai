import React from 'react';
import { 
  Menu, 
  Settings, 
  Lock, 
  BookOpen, 
  Book, 
  Film, 
  PlusCircle, 
  UserCircle 
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/70 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 text-violet-accent" />
          <h1 className="font-serif font-black tracking-tight text-2xl text-violet-accent text-glow">
            Enredo.ai
          </h1>
        </div>
        <Settings className="w-6 h-6 text-white/60" />
      </header>

      {/* Main Content */}
      <main className="relative flex-grow pt-16 pb-20 flex flex-col items-center justify-center">
        {/* Background Grid Simulation (Blurred) */}
        <div className="absolute inset-0 z-0 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 opacity-30 blur-md pointer-events-none scale-105">
          {[
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDdllxZxQOgWV5Kw0PWIu4b72yex6Yh-7qpSZovQ1m3Nd5nQFS6eJnXrVouvvVKpwH7aZbgUAXRbRe5nyMpLx58ZzXayV5BfQKcoRndKOsNd_iTSbUfFUq2E_xEBER7fHj4u6qi0p4PQSsBzG0lZvtucxQRn9BgZi-QGXHp55eDaBzx2YRSEWngSWnc3gmCwwUC6urjChJQ4yFJb2x0EIlyddGYi9bgpQ_R8KQhu9Iwg3GkMUrZdTYzkNA6R6tsdL1w9Xmhbr6U3No",
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDtY1SwQcw2Ithx3m6TJ36vKhLZtYjCbSmRBe4izexUSB3fsAerjcr9Swc6SFIDnyRAJOGm-hRJkvQ081AZz3TeYY7rlpt8Kn7nFtPUV98V7oyGYe2leJg6kngjVFwAxDAz4VHRKoTkmQHZNQ2ijLnkjtcVJtpB1Ay-syn28pSamxwWAWNBPieUBudPFyQhWtrU-JyLSeKWW99Ct7Pq4vY0iKYgoVrNjEVUd66P7KBOQ3ePAvTUS-iwZ1Ky4sNWhB20wKwTEzAVNiw",
            "https://lh3.googleusercontent.com/aida-public/AB6AXuAjwNY0m1tT7_qrI-FruGlS_A-qV2a360kQIeXYszMS20HevIJ7r2AaKNspctsxCRDtuYH9xKp1O9LBdN-HqsehMS1roT-iK4tDbupI-VFY1oTSIqpChXHyWiZ2M-zJHh-ZbxoO_wxXWfTtPNymIZJZeV9XxS2MnHCVB39_lcwmpy63zAuhPcn1CoNfLW8IZhkmNgc891LuqIAHM4JvwSkjRz9evbID1enuCtcOSvPcHk54l6U0UeIEBg5Ur8-r2rhoM6ODQhWs9G8",
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDgSH0Jt7cBWnWAfkqsgJtb6fGIhZspE7457nTecWAa9uH5bXl57MBt8MYuCOAClTREwBBoI0SBOWJ1qWBaLKnvamy5biddM72MoTCJ9L7rBpoxwq4__TqSUuBFuGtjo4xbHooEB-De5HreD-cniLz6ixFJxi8BkrBpUKHHKl5IBUjsWCIyf1j4O1ZuAnIANsPg0F6mV8LRTq-WGivE87ni2p0udUzWom3qmbe01yC7LERKgbumCwl7rloA8vT3JY-MPwYtL6W9B4c"
          ].map((src, i) => (
            <div key={i} className="aspect-[3/4] bg-surface rounded-xl overflow-hidden relative">
              <img src={src} alt="Story Concept" className="w-full h-full object-cover" />
              <div className="absolute inset-0 story-gradient"></div>
            </div>
          ))}
        </div>

        {/* Central Conversion Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-[calc(100%-40px)] max-w-md p-8 bg-black/60 blur-backdrop border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(167,139,250,0.15)] flex flex-col items-center text-center"
        >
          {/* Glass Ring Icon */}
          <div className="w-20 h-20 mb-8 rounded-full flex items-center justify-center glass-ring">
            <Lock className="w-10 h-10 text-violet-accent fill-violet-accent/20" />
          </div>

          <h2 className="text-3xl font-serif font-semibold text-on-surface mb-3 leading-tight">
            Sua jornada ainda não começou.
          </h2>
          
          <p className="text-on-surface-variant mb-10 max-w-[280px] leading-relaxed">
            Crie sua conta para salvar histórias, comentar e gerar cenas cinematográficas com IA.
          </p>

          <div className="w-full flex flex-col gap-4">
            <button className="w-full py-4 px-8 bg-violet-accent text-[#381385] font-bold rounded-xl shadow-[0_0_15px_rgba(167,139,250,0.4)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
              Criar Conta
            </button>
            
            <button className="w-full py-4 px-8 bg-transparent border border-white/20 text-on-surface font-semibold rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer">
              Entrar
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 w-full">
            <button className="text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white/60 transition-colors cursor-pointer">
              Acesso de Visitante
            </button>
          </div>
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 bg-black/70 blur-backdrop border-t border-white/5 flex justify-around items-center h-20 pb-safe px-2">
        <NavItem icon={<BookOpen />} label="Biblioteca" />
        <NavItem icon={<Book />} label="Lendo" />
        <NavItem icon={<Film />} label="Cenas" />
        <NavItem icon={<PlusCircle />} label="Criar" />
        <NavItem icon={<UserCircle />} label="Perfil" active />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${active ? 'text-violet-accent text-glow' : 'text-white/40 hover:text-white/80'}`}>
      <div className={active ? 'scale-110' : ''}>
        {icon}
      </div>
      <span className="font-serif text-[10px] font-medium tracking-wide">{label}</span>
    </div>
  );
}
