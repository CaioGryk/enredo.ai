/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { useState } from "react";

export default function App() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden pt-12 pb-20">
      {/* Background Cinematic Visual */}
      <div className="fixed inset-0 z-0">
        <img
          alt="Background"
          className="w-full h-full object-cover opacity-25 grayscale-[0.1]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfYUZkLm4Wt-y4kgFfISkOqJYv3PvyLMeHS40AxKFf-YqpAEb04EehjMVmSqWslbIt0qzLJKj5dHE4RBqLFKNPqxjqv7dzkLGyx2e4jz8WWy8tarVnWcS1erPx2sB-pN7JSn3cXUHXNAp2GXkK1bhnBu16fk5ZKmqEIfQLYLSerFk5FxLOiqa8yRRsNB_Cmti6Q_yK5ZWIInVJZzvAd7IMd-T3zBLY-9ZT2piNI5BC3mvYlRvOkmvL-i99CLeSOtPe6PhbOuPKXDA"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background"></div>
      </div>

      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        className="z-10 w-full max-w-[480px] flex flex-col items-center px-edge-margin"
      >
        {/* Brand Header */}
        <header className="text-center space-y-3 mb-10">
          <div className="flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-primary text-[40px] opacity-90">
              auto_stories
            </span>
          </div>
          <h1 className="font-serif text-5xl italic text-primary tracking-tight leading-none">
            Enredo.ai
          </h1>
          <p className="text-on-surface-variant max-w-[280px] mx-auto opacity-70 leading-relaxed text-base">
            Sua história, seu universo. Comece sua jornada literária agora.
          </p>
        </header>

        {/* Form Card */}
        <div className="glass-panel rim-light cinematic-shadow w-full p-6 sm:p-10 rounded-2xl space-y-10 transition-all duration-500">
          <div className="space-y-1 text-center">
            <h2 className="font-serif text-3xl text-on-surface tracking-tight font-semibold">
              Crie sua conta
            </h2>
            <p className="text-on-surface-variant/60 text-sm">
              Insira seus detalhes para começar.
            </p>
          </div>

          <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
            {/* Name Field */}
            <div className="space-y-2 group">
              <label
                className="text-[10px] text-on-surface-variant/80 tracking-[0.2em] block font-bold"
                htmlFor="name"
              >
                NOME COMPLETO
              </label>
              <div className="flex items-center border-b border-white/10 pb-3 group-focus-within:border-primary/60 transition-all duration-300">
                <span className="material-symbols-outlined text-zinc-600 mr-3 text-xl group-focus-within:text-primary transition-colors">
                  person
                </span>
                <input
                  className="bg-transparent border-none focus:ring-0 w-full p-0 text-on-surface placeholder:text-zinc-600 text-base"
                  id="name"
                  name="name"
                  placeholder="Como devemos te chamar?"
                  type="text"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2 group">
              <label
                className="text-[10px] text-on-surface-variant/80 tracking-[0.2em] block font-bold"
                htmlFor="email"
              >
                E-MAIL
              </label>
              <div className="flex items-center border-b border-white/10 pb-3 group-focus-within:border-primary/60 transition-all duration-300">
                <span className="material-symbols-outlined text-zinc-600 mr-3 text-xl group-focus-within:text-primary transition-colors">
                  mail
                </span>
                <input
                  className="bg-transparent border-none focus:ring-0 w-full p-0 text-on-surface placeholder:text-zinc-600 text-base"
                  id="email"
                  name="email"
                  placeholder="seu@exemplo.com"
                  type="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2 group">
              <label
                className="text-[10px] text-on-surface-variant/80 tracking-[0.2em] block font-bold"
                htmlFor="password"
              >
                SENHA
              </label>
              <div className="flex items-center border-b border-white/10 pb-3 group-focus-within:border-primary/60 transition-all duration-300">
                <span className="material-symbols-outlined text-zinc-600 mr-3 text-xl group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  className="bg-transparent border-none focus:ring-0 w-full p-0 text-on-surface placeholder:text-zinc-600 text-base"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="material-symbols-outlined text-zinc-600 cursor-pointer hover:text-primary transition-colors text-xl"
                  type="button"
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2 group">
              <label
                className="text-[10px] text-on-surface-variant/80 tracking-[0.2em] block font-bold"
                htmlFor="confirm_password"
              >
                CONFIRMAR SENHA
              </label>
              <div className="flex items-center border-b border-white/10 pb-3 group-focus-within:border-primary/60 transition-all duration-300">
                <span className="material-symbols-outlined text-zinc-600 mr-3 text-xl group-focus-within:text-primary transition-colors">
                  lock_reset
                </span>
                <input
                  className="bg-transparent border-none focus:ring-0 w-full p-0 text-on-surface placeholder:text-zinc-600 text-base"
                  id="confirm_password"
                  name="confirm_password"
                  placeholder="••••••••"
                  type="password"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-3 pt-2">
              <div className="flex items-center h-5">
                <input
                  className="w-5 h-5 rounded border-white/10 bg-surface/50 text-primary focus:ring-primary/40 focus:ring-offset-0 transition-all cursor-pointer"
                  id="terms"
                  name="terms"
                  type="checkbox"
                />
              </div>
              <label
                className="text-[13px] text-on-surface-variant/80 leading-snug select-none cursor-pointer"
                htmlFor="terms"
              >
                Eu concordo com os{" "}
                <a
                  className="text-primary/90 hover:text-primary hover:underline underline-offset-4 transition-all"
                  href="#"
                >
                  Termos de Uso
                </a>{" "}
                e a{" "}
                <a
                  className="text-primary/90 hover:text-primary hover:underline underline-offset-4 transition-all"
                  href="#"
                >
                  Política de Privacidade
                </a>
                .
              </label>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-[56px] bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300 flex items-center justify-center space-x-2 relative overflow-hidden group"
                type="submit"
              >
                <span className="text-xl relative z-10">Criar Minha Conta</span>
                <span className="material-symbols-outlined relative z-10 group-hover:translate-x-1 transition-transform">
                  chevron_right
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </motion.button>
            </div>
          </form>
        </div>

        {/* Footer Navigation */}
        <footer className="text-center mt-10 mb-20 w-full">
          <p className="text-on-surface-variant/70 text-sm">
            Já possui uma conta?{" "}
            <a
              className="text-primary font-semibold hover:text-primary-container transition-all ml-1 underline-offset-4 hover:underline"
              href="#"
            >
              Entrar
            </a>
          </p>
        </footer>
      </motion.main>

      {/* Decorative Edge Lines */}
      <div className="fixed top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent z-50"></div>
      <div className="fixed bottom-0 left-0 w-full h-48 bg-gradient-to-t from-background via-background/80 to-transparent z-0 pointer-events-none"></div>
    </div>
  );
}

