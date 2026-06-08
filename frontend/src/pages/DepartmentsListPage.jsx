import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, ChevronRight, Search } from 'lucide-react'
import api from '../api/client'

const deptIcons = { finance: '💰', hr: '👥', projects: '🏗️', tenders: '📋', trading_house: '🏪', stem_academia: '🎓', sa_development: '🔧', sa_projects: '📐', sa_sales: '📈', admin_management: '🏢' }

export default function DepartmentsListPage() {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = departments.filter(d =>
    `${d.name} ${d.description || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
          Все отделы
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Всего отделов: {departments.length}
        </p>
      </div>

      {/* Поиск */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input className="input-field pl-9" placeholder="Поиск по названию или описанию..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Список отделов */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-32 animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={40} className="mx-auto mb-3 opacity-20" />
          <p style={{ color: 'var(--muted)' }}>{departments.length === 0 ? 'Нет отделов' : 'Ничего не найдено'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(dept => (
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
