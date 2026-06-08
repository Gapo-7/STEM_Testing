import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Eye, EyeOff, Sun, Moon, LogIn } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--bg)' }}>
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--accent), transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, var(--accent), transparent)' }} />
      </div>

      {/* Кнопка темы */}
      <button onClick={toggle} className="absolute top-4 right-4 p-2 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="card w-full max-w-md relative z-10">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500 text-white font-bold text-lg mb-4 font-display">SA</div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>Добро пожаловать</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>STEM Academia — система документооборота</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" required placeholder="name@stem-academia.kz" className="input-field"
              value={form.email} onChange={set('email')} autoComplete="email" />
          </div>

          <div>
            <label className="label">Пароль</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} required placeholder="••••••••" className="input-field pr-10"
                value={form.password} onChange={set('password')} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn size={16} />}
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
          Нет аккаунта?{' '}
          <Link to="/register" className="text-cyan-400 hover:underline font-medium">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
