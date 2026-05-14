import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookCopy as StoriesIcon, 
  Search, 
  Zap, 
  ShieldAlert as BlockIcon, 
  Video as VideoIcon, 
  Clapperboard as MovieIcon, 
  PlusCircle, 
  Star,
  Library,
  BookOpen,
  Clapperboard,
  Plus,
  User
} from "lucide-react";

// --- Components ---

function Badge({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "gold" }) {
  const styles = {
    primary: "bg-primary/20 text-primary border-primary/20",
    gold: "bg-tertiary text-on-tertiary border-tertiary/20"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${styles[variant]}`}>
      {children}
    </span>
  );
}

function BenefitCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="glass-card p-4 rounded-xl flex flex-col items-center text-center group transition-colors hover:border-primary/30"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
      <p className="text-[10px] text-on-surface-variant leading-relaxed">{description}</p>
    </motion.div>
  );
}

function PlanCard({ 
  title, 
  description, 
  price, 
  period, 
  featured = false,
  ctaText
}: { 
  title: string; 
  description: string; 
  price: string; 
  period: string; 
  featured?: boolean;
  ctaText: string;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card p-6 rounded-2xl relative overflow-hidden ${featured ? "premium-border gold-glow ring-1 ring-tertiary/30" : "border-white/10"}`}
    >
      {featured && (
        <div className="absolute -top-1 right-6">
          <Badge variant="gold">Melhor Valor</Badge>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className={`text-xl font-serif font-bold ${featured ? "text-tertiary" : "text-on-surface"}`}>{title}</h4>
          <p className="text-sm text-on-surface-variant mt-1">{description}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-serif font-bold text-on-surface">{price}</span>
          <span className="text-sm text-on-surface-variant ml-1">{period}</span>
        </div>
      </div>

      <motion.button 
        whileTap={{ scale: 0.98 }}
        className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
          featured 
            ? "bg-tertiary text-on-tertiary hover:brightness-110 shadow-tertiary/20" 
            : "border border-white/20 text-on-surface hover:bg-white/5 shadow-black/40"
        }`}
      >
        {ctaText}
      </motion.button>
    </motion.div>
  );
}

function CreditOption({ amount, price }: { amount: string; price: string }) {
  return (
    <div className="glass-card p-4 rounded-xl flex items-center justify-between hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center">
          <Star className="w-5 h-5 text-primary fill-primary/20" />
        </div>
        <div>
          <p className="font-bold text-on-surface">{amount} Créditos</p>
          <p className="text-xs text-on-surface-variant">{price}</p>
        </div>
      </div>
      <motion.button 
        whileTap={{ scale: 0.9 }}
        className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all"
      >
        <PlusCircle className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState("perfil");

  return (
    <div className="min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-20 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <StoriesIcon className="w-6 h-6 text-primary" />
          <h1 className="font-serif italic text-2xl font-bold text-primary tracking-tight">Enredo.ai</h1>
        </div>
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
          <Search className="w-6 h-6" />
        </button>
      </header>

      <main className="pt-28 px-5 max-w-2xl mx-auto space-y-12">
        {/* Hero Section */}
        <section className="relative rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-video flex items-center justify-center text-center p-8 cinematic-glow">
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10"></div>
            <img 
              className="w-full h-full object-cover scale-105" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-pAHSZF7Zsj92l5Ndh0v4IGNPbCWneKQHQ1UAm0oJadtyoRxXJQQEwZY1kDF4iCUWouNwsBbeO9wj-enJB7IB5ExCv_UADdFWJfsJ_Ofyl9ujUZcODaK3jrkEPHSyLXeulUsJBtiTsPv5p2J8yXvJ4mKyEaPw_3f0OOdEd0O7uZTPlzjyuTRxDX3AGxvtt4UW-sS8Q85DdweZtMbgAPDg_GDBjE6blWCHxov9MCF6ks-EElBxUm7f9h595yqCVI1J_98f2L3nnZI" 
              alt="Cosmic Library Background"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="relative z-20 space-y-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block"
            >
              <Badge variant="gold">Upgrade</Badge>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl font-serif font-bold text-on-surface leading-tight tracking-tight"
            >
              Assinatura<br />Enredo.ai
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-on-surface-variant max-w-sm mx-auto leading-relaxed"
            >
              Transforme suas ideias em obras-primas cinematográficas com poder ilimitado.
            </motion.p>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="grid grid-cols-2 gap-4">
          <BenefitCard 
            icon={Zap} 
            title="Modelos Ultra" 
            description="Acesso aos motores de IA mais avançados do mundo." 
          />
          <BenefitCard 
            icon={BlockIcon} 
            title="Sem anúncios" 
            description="Foco total na sua história, sem distrações comerciais." 
          />
          <BenefitCard 
            icon={VideoIcon} 
            title="Vídeo Ilimitado" 
            description="Produza cenas visuais ricas sem se preocupar com limites." 
          />
          <BenefitCard 
            icon={MovieIcon} 
            title="Créditos Cinemáticos" 
            description="Prioridade máxima em cada renderização realizada." 
          />
        </section>

        {/* Subscription Plans */}
        <section className="space-y-4 pt-4">
          <PlanCard 
            title="Plano Anual"
            description="Economize 40% ao ano"
            price="R$ 29,90"
            period="/mês"
            featured
            ctaText="Assinar Agora"
          />
          <PlanCard 
            title="Plano Mensal"
            description="Flexibilidade total de cancelamento"
            price="R$ 49,90"
            period="/mês"
            ctaText="Começar Assinatura"
          />
        </section>

        {/* Buy Credits Section */}
        <section className="space-y-6 pt-4">
          <h3 className="text-xl font-serif font-bold text-on-surface ml-1">Comprar Créditos</h3>
          <div className="space-y-3">
            <CreditOption amount="500" price="R$ 19,90" />
            <CreditOption amount="1500" price="R$ 49,90" />
            <CreditOption amount="5000" price="R$ 129,90" />
          </div>
        </section>

        {/* Footer Info */}
        <p className="text-center text-on-surface-variant/40 text-xs py-8">
          Dúvidas sobre sua assinatura? <a href="#" className="text-primary hover:underline transition-all">Consulte nossa central de ajuda.</a>
        </p>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 h-24 bg-black/80 backdrop-blur-2xl border-t border-white/5 px-4 flex justify-around items-center">
        {[
          { id: "biblioteca", icon: Library, label: "Biblioteca" },
          { id: "lendo", icon: BookOpen, label: "Lendo" },
          { id: "cenas", icon: Clapperboard, label: "Cenas" },
          { id: "criar", icon: Plus, label: "Criar", special: true },
          { id: "perfil", icon: User, label: "Perfil" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 relative ${
              activeTab === tab.id ? "text-primary scale-110" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${tab.special ? "bg-primary/10" : ""}`}>
              <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? "fill-primary/20" : ""}`} />
            </div>
            <span className="text-[10px] font-medium font-serif mt-1">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="tab-indicator"
                className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(206,189,255,0.8)]"
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
