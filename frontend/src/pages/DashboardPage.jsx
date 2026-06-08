import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, FolderOpen, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const deptIcons = { finance: '💰', hr: '👥', projects: '🏗️', tenders: '📋', trading_house: '🏪', stem_academia: '🎓', sa_development: '🔧', sa_projects: '📐', sa_sales: '📈', admin_management: '🏢' }

export default function DashboardPage() {
  const { user, canSeeAll } = useAuth()
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Приветствие */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
          Добро пожаловать, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {canSeeAll ? `Вам доступны все отделы (${departments.length})` : 'Ниже отделы, к которым у вас есть доступ'}
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Доступных отделов', value: departments.length, icon: Building2, color: 'text-cyan-400' },
          { label: 'Всего записей', value: departments.reduce((s, d) => s + (d.record_count || 0), 0), icon: Users, color: 'text-purple-400' },
          { label: 'Ваша роль', value: { director: 'Директор', managing_director: 'Упр. директор', department_head: 'Рук. отдела', employee: 'Сотрудник' }[user?.role] || user?.role, icon: FolderOpen, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`${color} opacity-80`}><Icon size={28} /></div>
            <div>
              <p className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Карточки отделов */}
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>Отделы</h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-28 animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : departments.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={40} className="mx-auto mb-3 opacity-20" />
          <p style={{ color: 'var(--muted)' }}>Нет доступных отделов. Обратитесь к администратору.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <button key={dept.id} onClick={() => navigate(`/departments/${dept.id}`)}
              className="card text-left hover:border-cyan-500/50 transition-all hover:-translate-y-0.5 group">
              <div className="flex items-start justify-between">
                <span className="text-2xl">{deptIcons[dept.code] || '📁'}</span>
                <ChevronRight size={16} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
              <h3 className="font-semibold mt-3 text-sm font-display" style={{ color: 'var(--text)' }}>{dept.name}</h3>
              {dept.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{dept.description}</p>}
              <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                <Users size={12} /> <span>{dept.record_count || 0} записей</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
