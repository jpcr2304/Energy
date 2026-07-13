import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Fill in your email and password.')
      return
    }

    if (mode === 'register') {
      if (!name) {
        setError('Fill in your name.')
        return
      }

      if (password !== confirmPassword) {
        setError('The passwords do not match.')
        return
      }
    }

    try {
      setLoading(true)

      const endpoint =
        mode === 'login'
          ? '/api/auth/login'
          : '/api/auth/register'

      const body =
        mode === 'login'
          ? { email, password }
          : { name, email, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Erro ao autenticar.')
      }

      const user = await response.json()

      localStorage.setItem('user', JSON.stringify(user))

      navigate('/home')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Ocorreu um erro inesperado.')
      }
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(34,197,94,0.22),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#172554_100%)]" />

          <div className="absolute left-[-120px] top-[-120px] h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="absolute inset-0 opacity-25">
            <div className="absolute left-16 top-24 h-px w-[520px] rotate-12 bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
            <div className="absolute left-32 top-64 h-px w-[620px] -rotate-6 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
            <div className="absolute bottom-40 left-10 h-px w-[700px] rotate-[-14deg] bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
            <div className="absolute left-64 top-20 h-[620px] w-px rotate-12 bg-gradient-to-b from-transparent via-blue-300 to-transparent" />
            <div className="absolute right-36 top-10 h-[680px] w-px rotate-[-8deg] bg-gradient-to-b from-transparent via-cyan-300 to-transparent" />
          </div>

          <motion.div
            animate={{ opacity: [0.35, 1, 0.35], scale: [1, 1.15, 1] }}
            transition={{ duration: 3.2, repeat: Infinity }}
            className="absolute left-[18%] top-[24%] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_30px_rgba(103,232,249,0.95)]"
          />

          <motion.div
            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
            transition={{ duration: 2.7, repeat: Infinity, delay: 0.6 }}
            className="absolute right-[22%] top-[42%] h-3 w-3 rounded-full bg-blue-300 shadow-[0_0_32px_rgba(147,197,253,0.95)]"
          />

          <motion.div
            animate={{ opacity: [0.25, 1, 0.25], scale: [1, 1.25, 1] }}
            transition={{ duration: 3.6, repeat: Infinity, delay: 1 }}
            className="absolute bottom-[24%] left-[36%] h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_32px_rgba(110,231,183,0.95)]"
          />

          <div className="relative z-10 flex h-full items-center px-14 xl:px-20">
            <div className="max-w-2xl">
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-5xl font-bold leading-tight xl:text-6xl"
              >
                Controla a energia.
                <span className="block bg-gradient-to-r from-cyan-200 via-blue-300 to-emerald-200 bg-clip-text text-transparent">
                  Reduz desperdício.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-6 max-w-xl text-lg leading-8 text-slate-300"
              >
                Acompanha consumos, deteta padrões e transforma dados
                energéticos em decisões simples, rápidas e inteligentes.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-10 grid max-w-xl grid-cols-3 gap-4"
              >
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                  <p className="text-sm text-slate-300">Eficiência</p>
                  <p className="mt-2 text-3xl font-semibold">+27%</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                  <p className="text-sm text-slate-300">Monitorização</p>
                  <p className="mt-2 text-3xl font-semibold">24/7</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                  <p className="text-sm text-slate-300">Dados</p>
                  <p className="mt-2 text-3xl font-semibold">Real-time</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-6 py-10 lg:bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_26%)]" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="mb-10">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-300/80">
                Energy Analytics
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-tight">
                {mode === 'login'
                  ? 'Bem-vindo de volta'
                  : 'Cria a tua conta'}
              </h2>

              <p className="mt-4 text-slate-400">
                {mode === 'login'
                  ? 'Entra para aceder ao teu dashboard energético.'
                  : 'Regista-te para começares a monitorizar os teus consumos.'}
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
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {mode === 'register' && (
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-2 block text-sm text-slate-400"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm text-slate-400"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm text-slate-400"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="mb-2 block text-sm text-slate-400"
                      >
                        Confirm Password
                      </label>
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 outline-none transition-all placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
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
                        Remember me
                      </label>

                      <button
                        type="button"
                        className="cursor-pointer text-blue-400 transition-colors hover:text-blue-300"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}

                  {error && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full cursor-pointer rounded-2xl bg-blue-500 py-4 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? 'A processar...'
                      : mode === 'login'
                        ? 'Login'
                        : 'Create account'}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>

            <p className="mt-8 text-center text-sm text-slate-400">
              {mode === 'login'
                ? 'Ainda não tens conta?'
                : 'Já tens conta?'}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="cursor-pointer text-blue-400 transition-colors hover:text-blue-300"
              >
                {mode === 'login' ? 'Create account' : 'Login'}
              </button>
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  )
}