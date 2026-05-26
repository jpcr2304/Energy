import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>(
    'login'
  )

  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.15),transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.12),transparent_30%)]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight">
                Energy Analytics
              </h1>

              <p className="text-slate-400 mt-3">
                Monitoriza o teu consumo energético
                com insights inteligentes.
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{
                  opacity: 0,
                  x: mode === 'login' ? -20 : 20,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: mode === 'login' ? 20 : -20,
                }}
                transition={{ duration: 0.25 }}
              >
                <form
                  className="space-y-5"
                  onSubmit={e => {
                    e.preventDefault()

                    navigate('/home')
                  }}
                >
                  {mode === 'register' && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Nome
                      </label>

                      <input
                        type="text"
                        placeholder="Name"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Email
                    </label>

                    <input
                      type="email"
                      placeholder="example@email.com"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Palavra-passe
                    </label>

                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                    />
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Confirmar palavra-passe
                      </label>

                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                      />
                    </div>
                  )}

                  {mode === 'login' && (
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 text-slate-400">
                        <input
                          type="checkbox"
                          className="accent-blue-500"
                        />
                        Lembrar-me
                      </label>

                      <button
                        type="button"
                        className="cursor-pointer text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Esqueceste-te da password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="cursor-pointer w-full mt-2 bg-blue-500 hover:bg-blue-400 transition-all duration-300 text-white py-4 rounded-2xl font-semibold shadow-lg shadow-blue-500/20"
                  >
                    {mode === 'login'
                      ? 'Entrar'
                      : 'Criar conta'}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="border-t border-white/10 px-8 py-5 bg-white/[0.03]">
            <p className="text-sm text-center text-slate-400">
              {mode === 'login'
                ? 'Ainda não tens conta?'
                : 'Já tens conta?'}{' '}
              <button
                onClick={() =>
                  setMode(
                    mode === 'login'
                      ? 'register'
                      : 'login'
                  )
                }
                className="cursor-pointer text-blue-400 hover:text-blue-300 transition-colors"
              >
                {mode === 'login'
                  ? 'Criar conta'
                  : 'Fazer login'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}