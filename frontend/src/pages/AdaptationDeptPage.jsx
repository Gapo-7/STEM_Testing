import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Search, CheckCircle, Clock, XCircle, Slash } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { fetchAdaptationCandidates } from '../api/adaptation'

const tabs = [
  { value: 'ongoing', label: 'Проходят', icon: Clock },
  { value: 'passed', label: 'Прошёл', icon: CheckCircle },
  { value: 'failed', label: 'Не прошёл', icon: XCircle },
]

export default function AdaptationDeptPage() {
  const { deptId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [department, setDepartment] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [status, setStatus] = useState('ongoing')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const canWrite = user?.role === 'director' || user?.role === 'managing_director' || user?.role === 'department_head'

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/departments/${deptId}`),
      fetchAdaptationCandidates(deptId, status),
    ])
      .then(([deptRes, candRes]) => {
        setDepartment(deptRes.data)
        setCandidates(candRes.data)
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [deptId, status])

  const filtered = useMemo(() => {
    return candidates.filter(candidate =>
      `${candidate.last_name} ${candidate.first_name} ${candidate.middle_name} ${candidate.position}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  }, [candidates, search])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/adaptation')} className="p-2 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
              {department?.name || 'Отдел адаптации'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {department?.description || 'Управление кандидатами на адаптацию'}
            </p>
          </div>
        </div>

        {canWrite && (
          <button onClick={() => navigate(`/adaptation/${deptId}/new`)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Добавить кандидата
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = status === tab.value
            return (
              <button key={tab.value} onClick={() => setStatus(tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${active ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                <span className="inline-flex items-center gap-2"><Icon size={14} /> {tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input className="input-field pl-9 w-full" placeholder="Поиск по кандидату или должности" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, idx) => <div key={idx} className="card h-32 animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {candidates.length === 0 ? 'Нет кандидатов в выбранной категории' : 'Ничего не найдено'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(candidate => (
            <button key={candidate.id} onClick={() => navigate(`/adaptation/${deptId}/candidates/${candidate.id}`)}
              className="card text-left p-4 hover:border-cyan-500/30 transition-all group">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {candidate.last_name} {candidate.first_name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{candidate.position}</p>
                </div>
                <span className="text-xs rounded-full bg-slate-800/60 px-2 py-1">{candidate.status}</span>
              </div>
              <div className="mt-4 text-xs text-slate-400">
                {candidate.criteria?.length || 0} критериев
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
