import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface NotificationCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  variant?: 'default' | 'premium' | 'error' | 'transactional';
  backgroundImage?: string;
}

export default function NotificationCard({
  icon,
  title,
  description,
  buttonLabel,
  variant = 'default',
  backgroundImage,
}: NotificationCardProps) {
  const isError = variant === 'error';
  const isPremium = variant === 'premium';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card p-6 rounded-xl flex flex-col items-center text-center justify-between min-h-[320px] relative overflow-hidden group transition-all ${
        isError ? 'border-error/20 bg-error-container/5' : 'hover:bg-white/5'
      }`}
    >
      {backgroundImage && (
        <div className="absolute inset-0 -z-20">
          <img 
            className="w-full h-full object-cover opacity-20 grayscale brightness-50" 
            src={backgroundImage} 
            alt="Background"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      
      {variant === 'transactional' && (
        <div className="absolute inset-0 -z-10 opacity-20 transition-opacity group-hover:opacity-30">
          <div className="w-full h-full bg-gradient-to-br from-violet-900/40 to-black"></div>
        </div>
      )}

      <div className="flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ring-1 transition-all ${
          isError 
            ? 'bg-error-container/10 ring-error/30 text-error' 
            : isPremium 
              ? 'bg-violet-950/40 ring-violet-400/50 text-violet-400'
              : 'bg-surface-container-high ring-white/10 group-hover:ring-violet-400/30'
        }`}>
          {icon}
        </div>
        <h3 className={`text-title-sm mb-3 ${isError ? 'text-error' : ''}`}>{title}</h3>
        <p className="text-on-surface-variant text-body-md opacity-80 max-w-[240px]">
          {description}
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        className={`w-full py-3 px-6 font-bold rounded-lg mt-6 transition-all shadow-lg ${
          isPremium 
            ? 'bg-violet-400 text-black font-extrabold shadow-[0_0_20px_rgba(167,139,250,0.5)]'
            : isError
              ? 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'
              : variant === 'transactional'
                ? 'border border-white/20 text-white hover:bg-white/5'
                : 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(167,139,250,0.3)]'
        }`}
      >
        {buttonLabel}
      </motion.button>
    </motion.div>
  );
}
