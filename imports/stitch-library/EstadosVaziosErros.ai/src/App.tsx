/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import NotificationCard from './components/NotificationCard';
import { LibraryBig, Coins, WifiOff, Lock, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-on-surface pb-32">
      <Header />

      <main className="pt-24 px-5 max-w-4xl mx-auto space-y-6">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <p className="text-label-caps text-violet-400 mb-1">STATUS DO SISTEMA</p>
          <h2 className="text-headline-md">Central de Notificações</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Journey Not Started */}
          <NotificationCard
            icon={<LibraryBig size={32} className="text-white/40" />}
            title="Sua jornada ainda não começou."
            description="O palco está vazio e as cortinas fechadas. Que tal dar o primeiro passo?"
            buttonLabel="Explorar Biblioteca"
          />

          {/* 2. No Credits */}
          <NotificationCard
            variant="transactional"
            icon={<Coins size={32} className="text-tertiary" />}
            title="Seus créditos acabaram."
            description="O Oráculo exige mais essência para continuar tecendo os fios da sua história."
            buttonLabel="Comprar Créditos"
          />

          {/* 3. AI Connection Lost */}
          <NotificationCard
            variant="error"
            icon={<WifiOff size={32} />}
            title="Conexão perdida com o Oráculo AI."
            description="Um vácuo temporal interrompeu a narrativa. Tente reconectar-se ao fluxo."
            buttonLabel="Tentar Novamente"
          />

          {/* 4. Premium Locked */}
          <NotificationCard
            variant="premium"
            backgroundImage="https://lh3.googleusercontent.com/aida-public/AB6AXuC4_IwcUcO6owUlQZw4YAxtCnnd-0IPi9DtSI0oIR_ZTr8yUcgZp06VcxzwY7FNQtpf4y3kTNBiqab_vC0_TsVbBagOrB2qBNi0Yz9G6gPcfoI-RtNI4Wp_UWriCPbZD8NqGFjfQ6LMvNkvkzEtJiOpcalnjMbhQhzsyFxI31ZGAG4E2u7V6iu5qMzreBVW-Rojo6LRcBrZtU1G-CKUHB5WrK_iNBXpo7I48Bf0pkgCmANNuAiFvZC15iR2U2u8NLXvjmFnIDlzMZI"
            icon={<Lock size={32} />}
            title="Conteúdo Premium"
            description="Estas crônicas lendárias são reservadas para os membros da Ordem Real."
            buttonLabel="Assinar Agora"
          />
        </div>

        {/* Feedback Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-16 glass-card rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 border-violet-400/10"
        >
          <div className="flex-1 space-y-2">
            <HelpCircle size={40} className="text-violet-400" />
            <h4 className="text-title-sm">Ainda precisa de ajuda?</h4>
            <p className="text-on-surface-variant text-body-md">
              Nossos escribas estão prontos para ajudar você a recuperar sua trilha narrativa. 
              Entre em contato com o suporte técnico.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="w-full md:w-auto px-16 py-3 border border-violet-400/30 text-violet-400 rounded-full font-bold hover:bg-violet-400/10 transition-colors"
            >
              Falar com Suporte
            </motion.button>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
