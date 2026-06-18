import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, XCircle, UserX, Search } from 'lucide-react'
import api from '../api/client'
import { fetchFailedArchive, fetchFiredArchive } from '../api/archive'

const tabs = [
  { value: 'failed', label: 'Не прошли', icon: XCircle },
  { value: 'fired', label: 'Уволенные', icon: UserX },
]

export default function ArchivePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('failed')
  const [items, setItems] = useState([])
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const getDepartmentName = departmentId => {
    const idString = departmentId?.toString ? departmentId.toString() : departmentId
    return departments.find(d => d.id === idString)?.name || idString
  }

  useEffect(() => {
    setLoading(true)
    const fetcher = selected === 'failed' ? fetchFailedArchive : fetchFiredArchive
    fetcher().then(r => setItems(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [selected])

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data)).catch(console.error)
  }, [])

  const filtered = items.filter(item => {
    const content = selected === 'failed'
      ? `${item.last_name} ${item.first_name} ${item.middle_name} ${item.position}`
      : `${item.last_name} ${item.first_name} ${item.middle_name} ${item.position} ${item.employee_num}`
    return content.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
            Архив
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Просмотр историй кандидатов и уволенных сотрудников.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-800/70 px-4 py-2 text-sm text-slate-200">
          <Archive size={16} /> {selected === 'failed' ? 'Не прошли' : 'Уволенные'}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          {tabs.map(tab => {
            const active = selected === tab.value
            const Icon = tab.icon
            return (
              <button key={tab.value} onClick={() => setSelected(tab.value)}
                className={`px-4 py-2 rounded-full text-sm transition ${active ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                <span className="inline-flex items-center gap-2"><Icon size={14} />{tab.label}</span>
              </button>
            )
          })}
        </div>
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input className="input-field pl-9 w-full" placeholder="Поиск по ФИО или должности" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, idx) => <div key={idx} className="card h-32 animate-pulse" style={{ background: 'var(--border)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14">
          <p style={{ color: 'var(--muted)' }}>{items.length === 0 ? 'Нет записей в архиве' : 'Ничего не найдено'}</p>
        </div>
      ) : (
        <div className="space-y-4" style={{ justifyContent: 'space-between'  }}>
          {filtered.map(item => {
            const departmentName = departments.find(d => d.id === item.department_id)?.name || item.department_id
            const onClick = () => selected === 'failed'
              ? navigate(`/adaptation/${item.department_id}/candidates/${item.id}`)
              : navigate(`/archive/fired/${item.id}`)
            return (
              <button key={item.id} onClick={onClick}
                className="card text-left p-4 hover:border-cyan-500/30 transition-all" style= {{margin: '10px 10px'}}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>
                      {item.last_name} {item.first_name} {item.middle_name}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{item.position}</p>
                  </div>
                  <span className="text-xs rounded-full bg-slate-500/10 px-2 py-1 text-slate-300">
                    {selected === 'failed' ? 'Не прошёл' : item.fire_reason || 'Уволен'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  {selected === 'failed' ? (
                    <span>Отдел: {departmentName}</span>
                  ) : (
                    <>
                      <span>Табельный: {item.employee_num || '—'}</span>
                      <span>Дата увольнения: {item.fire_date ? new Date(item.fire_date).toLocaleDateString('ru-RU') : '—'}</span>
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
