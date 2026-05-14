/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Settings, 
  ShieldCheck, 
  ChevronRight, 
  CameraOff, 
  Download, 
  Trash2,
  Library,
  BookOpen,
  Clapperboard,
  PlusCircle,
  User
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Shared Simple Components ---

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={cn(
      "relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none",
      checked ? "bg-primary-container" : "bg-surface-container-highest"
    )}
  >
    <motion.div 
      animate={{ x: checked ? 26 : 2 }}
      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </button>
);

const SettingsItem = ({ 
  title, 
  description, 
  control, 
  icon: Icon,
  variant = 'default',
  onClick
}: { 
  title: string, 
  description?: string, 
  control?: React.ReactNode, 
  icon?: any,
  variant?: 'default' | 'destructive',
  onClick?: () => void
}) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors",
      onClick && "active:bg-white/10"
    )}
  >
    <div className="flex items-center gap-4 flex-1">
      {Icon && <Icon className={cn("w-5 h-5", variant === 'destructive' ? "text-error" : "text-on-surface-variant")} />}
      <div className="flex-1 pr-2">
        <p className={cn("text-sm font-semibold", variant === 'destructive' && "text-error")}>{title}</p>
        {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
      </div>
    </div>
    {control || (onClick && <ChevronRight className="w-4 h-4 text-on-surface-variant opacity-40" />)}
  </div>
);

// --- Main Screens ---

export default function App() {
  const [toggles, setToggles] = React.useState({
    profileVideo: true,
    publicByDefault: false,
    publicComments: true
  });

  return (
    <div className="min-h-screen bg-background text-on-surface pb-32">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/70 backdrop-blur-xl border-b border-white/10 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <ArrowLeft className="w-6 h-6 text-on-surface-variant cursor-pointer haptic-feedback" />
          <h1 className="text-primary-container font-serif font-bold text-xl drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]">
            Consentimentos IA
          </h1>
        </div>
        <Settings className="w-6 h-6 text-on-surface-variant cursor-pointer haptic-feedback" />
      </header>

      <main className="pt-24 px-5 max-w-2xl mx-auto space-y-8">
        
        {/* Profile Card Section */}
        <section className="relative h-48 rounded-2xl overflow-hidden glass-card group">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800" 
              alt="Background" 
              className="w-full h-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
          
          <div className="relative h-full flex items-end p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-primary-container overflow-hidden shadow-[0_0_20px_rgba(167,139,250,0.4)]">
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="font-semibold text-lg">Processamento de Rosto</p>
                <p className="text-[10px] font-bold tracking-widest text-primary uppercase">Ativo Localmente</p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Shield */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-white/5 flex gap-4">
          <ShieldCheck className="w-6 h-6 text-primary-container shrink-0 mt-0.5" />
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Sua foto de perfil (Google ou câmera) é processada localmente para gerar rostos consistentes nas suas histórias. Seus dados biométricos nunca deixam o dispositivo.
          </p>
        </div>

        {/* Video Customization */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-semibold px-1">Personalização de Vídeo</h2>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/10">
            <SettingsItem 
              title="Permitir uso de foto de perfil em vídeos IA"
              description="Gera personagens baseados na sua aparência."
              control={<Toggle checked={toggles.profileVideo} onChange={(v) => setToggles(t => ({...t, profileVideo: v}))} />}
            />
            <SettingsItem 
              title="Tornar vídeos gerados públicos por padrão"
              description="Seu conteúdo aparecerá no feed 'Cenas'."
              control={<Toggle checked={toggles.publicByDefault} onChange={(v) => setToggles(t => ({...t, publicByDefault: v}))} />}
            />
            <SettingsItem 
              title="Permitir comentários em vídeos públicos"
              description="Outros leitores poderão interagir com suas criações."
              control={<Toggle checked={toggles.publicComments} onChange={(v) => setToggles(t => ({...t, publicComments: v}))} />}
            />
          </div>
        </section>

        {/* Data & History */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-semibold px-1">Dados e Histórico</h2>
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/10">
            <SettingsItem 
              title="Remover foto de perfil"
              icon={CameraOff}
              onClick={() => {}}
            />
            <SettingsItem 
              title="Baixar histórico de mídia"
              icon={Download}
              onClick={() => {}}
            />
            <SettingsItem 
              title="Excluir dados de IA"
              icon={Trash2}
              variant="destructive"
              onClick={() => {}}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 flex flex-col items-center gap-3 opacity-60">
          <a href="#" className="text-xs font-bold tracking-wider text-primary-container border-b border-primary-container/30 pb-0.5">
            POLÍTICA DE PRIVACIDADE
          </a>
          <p className="text-[10px] text-center max-w-[280px] leading-relaxed italic">
            As preferências aqui definidas afetam como o motor narrativo Enredo.ai processa seus conteúdos visuais.
          </p>
        </footer>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 h-20 bg-black/80 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center px-4">
        <NavItem icon={Library} label="Biblioteca" />
        <NavItem icon={BookOpen} label="Lendo" />
        <NavItem icon={Clapperboard} label="Cenas" />
        <NavItem icon={PlusCircle} label="Criar" />
        <NavItem icon={User} label="Perfil" active />
      </nav>
    </div>
  );
}

const NavItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <div className={cn(
    "flex flex-col items-center gap-1 cursor-pointer transition-all haptic-feedback px-3",
    active ? "text-primary-container drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]" : "text-white/40 hover:text-white/80"
  )}>
    <Icon className={cn("w-6 h-6", active && "fill-primary-container/20")} />
    <span className="text-[10px] font-serif font-medium tracking-wide uppercase">{label}</span>
  </div>
);
