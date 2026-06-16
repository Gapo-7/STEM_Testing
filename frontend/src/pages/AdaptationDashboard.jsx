import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ClipboardList, Users, ChevronRight } from 'lucide-react'
import { fetchAdaptationDepartments } from '../api/adaptation'

export default function AdaptationDashboard() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdaptationDepartments()
      .then(r => setItems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const total = items.reduce((sum, item) => sum + (item.candidate_count || 0), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
              Адаптация сотрудников
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Следите за кандидатами на адаптацию и переходите к отделам.
            </p>
          </div>
          <div className="rounded-2xl bg-cyan-500/10 px-4 py-3 text-cyan-500 text-sm font-medium">
            Всего кандидатов: {total}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3 text-cyan-400">
            <ClipboardList size={24} />
            <div>
              <p className="text-xs uppercase tracking-wider">Отделы в адаптации</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{items.length}</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Сколько отделов имеют кандидатов на адаптацию.</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3 text-purple-400">
            <Users size={24} />
            <div>
              <p className="text-xs uppercase tracking-wider">Активные кандидаты</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{items.filter(item => item.candidate_count).length}</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Количество отделов с текущими кандидатами.</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3 text-amber-400">
            <Building2 size={24} />
            <div>
              <p className="text-xs uppercase tracking-wider">Приоритет</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text)' }}>{total > 0 ? 'В работе' : 'Пока нет'}</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Открытые адаптационные процессы по отделам.</p>
        </div>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>Отделы</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, idx) => <div key={idx} className="card h-32 animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-14">
          <ClipboardList size={40} className="mx-auto mb-4 opacity-20" />
          <p style={{ color: 'var(--muted)' }}>Нет отделов с кандидатами на адаптацию.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <button key={item.department.id} onClick={() => navigate(`/adaptation/${item.department.id}`)}
              className="card text-left hover:border-cyan-500/50 transition-all hover:-translate-y-0.5 group">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.department.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{item.department.description}</p>
                </div>
                <ChevronRight size={18} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-5 text-xs text-slate-400">
                Кандидатов: <span className="font-semibold text-cyan-400">{item.candidate_count}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
