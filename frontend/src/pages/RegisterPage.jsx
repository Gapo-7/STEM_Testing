import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Пароли не совпадают'); return }
    if (form.password.length < 8) { setError('Пароль минимум 8 символов'); return }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate('/login', { state: { msg: 'Аккаунт создан. Ожидайте назначения роли администратором.' } })
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--accent), transparent)' }} />
      </div>

      <button onClick={toggle} className="absolute top-4 right-4 p-2 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="card w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500 text-white font-bold text-lg mb-4 font-display">SA</div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>Регистрация</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>После регистрации администратор назначит вам роль</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {[
            { k: 'name', label: 'Полное имя', type: 'text', placeholder: 'Иванов Иван Иванович' },
            { k: 'email', label: 'Email', type: 'email', placeholder: 'name@stem-academia.kz' },
            { k: 'password', label: 'Пароль', type: 'password', placeholder: '••••••••' },
            { k: 'confirm', label: 'Подтвердить пароль', type: 'password', placeholder: '••••••••' },
          ].map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input type={type} required placeholder={placeholder} className="input-field"
                value={form[k]} onChange={set(k)} />
            </div>
          ))}

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={16} />}
            {loading ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-cyan-400 hover:underline font-medium">Войти</Link>
        </p>
      </div>
    </div>
  )
}
