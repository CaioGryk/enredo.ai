/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { BookOpen, Apple } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-on-surface selection:bg-primary/30">
      {/* Hero Background Layer */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <img
          alt="Cinematic Library Background"
          className="w-full h-full object-cover opacity-25 grayscale scale-105"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAziP4deB8wPfmK0h_fsdbGwekaFQveaWTot49rOoau9FAvdRDjSJRnajM-Z3DsBeoQeLYhIDKEJbZJFjMXjqglHoGUDzQnsNq4YQP6bJ3rjwywengRf6SrV2FOFdaVC4ilNoQT-GnSRncRRyDenDDZnU9YGGaYopbXLNCofjoICnmhpyZv9Xtl9vI4NEu3clFzUf1ZmMEVdNVbyA8EgDTTG_zbROy_FIJup6q4Hgb80-ZGJ5qK9Uiy8yS-_PakP0cVdbzsGgCaC7Q"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 cinematic-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-5 py-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Brand Identity */}
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-6 shadow-2xl shadow-primary/5"
            >
              <BookOpen className="text-primary w-12 h-12" strokeWidth={1.5} />
            </motion.div>
            <h1 className="font-serif text-5xl sm:text-6xl text-primary italic tracking-tight mb-2 leading-none">
              Enredo.ai
            </h1>
            <p className="text-on-surface-variant/80 tracking-wide font-medium">
              Sua próxima história começa aqui.
            </p>
          </div>

          {/* Login Form Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-10 relative overflow-hidden">
            <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-secondary/70 tracking-[0.2em] block" htmlFor="email">
                  EMAIL
                </label>
                <input
                  className="w-full bg-transparent border-0 border-b border-white/10 py-3 px-0 text-on-surface text-base input-focus-effect transition-all placeholder:text-zinc-700"
                  id="email"
                  placeholder="nome@exemplo.com"
                  type="email"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-secondary/70 tracking-[0.2em] block" htmlFor="password">
                    SENHA
                  </label>
                  <a className="text-[10px] font-bold text-primary/80 hover:text-primary transition-colors uppercase tracking-wider underline-offset-4 hover:underline" href="#">
                    Esqueci minha senha
                  </a>
                </div>
                <input
                  className="w-full bg-transparent border-0 border-b border-white/10 py-3 px-0 text-on-surface text-base input-focus-effect transition-all placeholder:text-zinc-700"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                />
              </div>

              <div className="pt-2">
                <button
                  className="w-full bg-primary text-on-primary font-bold text-lg py-4 rounded-xl hover:bg-primary-container transition-all active:scale-[0.98] shadow-lg shadow-primary/10 cursor-pointer"
                  type="submit"
                >
                  Entrar
                </button>
              </div>
            </form>

            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-[#121212] px-4 text-zinc-500">ou continue com</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm group cursor-pointer">
                <img
                  alt="Google"
                  className="w-5 h-5 grayscale opacity-60 group-hover:opacity-100 transition-opacity"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsm_cax58cBiMENt3kGTajQxAaRaG86boyE3ZfZsMSxBaCArh69HVxTQN8xRACTWyPr4aJu3-y_XJYbiPbi8CpTMEggX-rGCslc-scr24WPEUZDEUfqLmj5yHFwIpTldAs6112kEDokE15oBjowevuCOBGeAbIgyUgOzTnclo42gtNM8keflCYAzBPwbPC2UIAZctlavqpFFJOpxDNyK5bJ1JnbvE5UE-nnXtyUitY_b4Lgi8ahm34WpgqxTVPNXPKeGh9sXp7Eg4"
                  referrerPolicy="no-referrer"
                />
                <span className="text-on-surface/80">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm group cursor-pointer">
                <Apple size={20} className="text-on-surface/60 group-hover:text-on-surface transition-colors" />
                <span className="text-on-surface/80">Apple</span>
              </button>
            </div>
          </div>

          {/* Footer Link */}
          <div className="text-center mt-10">
            <p className="text-on-surface-variant/70 text-sm">
              Não tem uma conta?{" "}
              <a className="text-primary font-bold hover:text-primary-container transition-colors ml-1 underline-offset-4 hover:underline" href="#">
                Criar conta
              </a>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer Nav */}
      <footer className="py-10 text-center mt-auto">
        <div className="flex justify-center gap-16 text-[10px] text-zinc-600 font-bold tracking-widest uppercase">
          <a className="hover:text-zinc-400 transition-colors" href="#">Termos</a>
          <a className="hover:text-zinc-400 transition-colors" href="#">Privacidade</a>
          <a className="hover:text-zinc-400 transition-colors" href="#">Suporte</a>
        </div>
      </footer>
    </div>
  );
}
