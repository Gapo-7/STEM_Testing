import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, LogOut, Sun, Moon, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const roleLabel = { director: 'Директор', managing_director: 'Упр. директор', department_head: 'Рук. отдела', employee: 'Сотрудник' }
const roleBadge = { director: 'bg-amber-500/20 text-amber-400', managing_director: 'bg-purple-500/20 text-purple-400', department_head: 'bg-cyan-500/20 text-cyan-400', employee: 'bg-slate-500/20 text-slate-400' }

export default function Sidebar() {
  const { user, logout, isDirector, isManaging, canSeeAll } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => { await logout(); navigate('/login') }

  const link = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150'
  const active = 'bg-cyan-500/15 text-cyan-400'
  const inactive = 'hover:bg-white/5'

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Логотип */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-white font-bold text-sm">SA</div>
          <div>
            <div className="text-sm font-bold font-display" style={{ color: 'var(--text)' }}>STEM Academia</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>Документооборот</div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Меню</p>

        <NavLink to="/dashboard" className={({ isActive }) => `${link} ${isActive ? active : inactive}`} style={({ isActive }) => ({ color: isActive ? undefined : 'var(--text)' })}>
          <LayoutDashboard size={17} /> Дашборд
        </NavLink>

        {canSeeAll && (
          <NavLink to="/departments" className={({ isActive }) => `${link} ${isActive ? active : inactive}`} style={({ isActive }) => ({ color: isActive ? undefined : 'var(--text)' })}>
            <Building2 size={17} /> Все отделы
          </NavLink>
        )}

        {(isDirector || isManaging) && (
          <>
            <p className="px-3 mt-4 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Администрирование</p>
            {isDirector && (
              <NavLink to="/admin/users" className={({ isActive }) => `${link} ${isActive ? active : inactive}`} style={({ isActive }) => ({ color: isActive ? undefined : 'var(--text)' })}>
                <Users size={17} /> Пользователи
              </NavLink>
            )}
            <NavLink to="/admin/departments" className={({ isActive }) => `${link} ${isActive ? active : inactive}`} style={({ isActive }) => ({ color: isActive ? undefined : 'var(--text)' })}>
              <ShieldCheck size={17} /> Управление отделами
            </NavLink>
          </>
        )}
      </nav>

      {/* Профиль + тема */}
      <div className="px-3 pb-4 space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <button onClick={toggle} className={`${link} w-full`} style={{ color: 'var(--muted)' }}>
          {dark ? <Sun size={17} /> : <Moon size={17} />}
          {dark ? 'Светлая тема' : 'Тёмная тема'}
        </button>

        <div className="px-3 py-2 rounded-lg" style={{ background: 'var(--bg)' }}>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user?.name}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleBadge[user?.role] || ''}`}>
            {roleLabel[user?.role] || user?.role}
          </span>
        </div>

        <button onClick={handleLogout} className={`${link} w-full text-red-400 hover:bg-red-500/10`}>
          <LogOut size={17} /> Выйти
        </button>
      </div>
    </aside>
  )
}
