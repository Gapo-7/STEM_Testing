import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, User, Phone, Mail, Pencil, Trash2, AlertCircle, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { createFiredEmployee } from '../api/archive'

const statusLabel = { active: 'Работает', inactive: 'Уволен', on_leave: 'В отпуске' }
const statusColor = { active: 'bg-green-500/15 text-green-400', inactive: 'bg-red-500/15 text-red-400', on_leave: 'bg-amber-500/15 text-amber-400' }

export default function DepartmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [dept, setDept] = useState(null)
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [firingId, setFiringId] = useState(null)
  const [firingDate, setFiringDate] = useState('')
  const [firingReason, setFiringReason] = useState('')

  const canWrite = user?.role === 'director' || user?.role === 'managing_director' || user?.role === 'department_head'

  useEffect(() => {
    Promise.all([
      api.get(`/departments/${id}`),
      api.get(`/departments/${id}/records`, { params: { status: 'active' } }),
    ])
      .then(([d, r]) => { setDept(d.data); setRecords(r.data) })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [id])

  const filtered = records.filter(r =>
    `${r.last_name} ${r.first_name} ${r.middle_name} ${r.position}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleFire = async rid => {
    const record = records.find(r => r.id === rid)
    if (!record) {
      alert('Запись не найдена')
      setFiringId(null)
      return
    }

    if (!firingDate || !firingReason.trim()) {
      alert('Укажите дату увольнения и причину.')
      return
    }

    try {
      await createFiredEmployee({
        last_name: record.last_name,
        first_name: record.first_name,
        middle_name: record.middle_name,
        position: record.position,
        department_id: id,
        phone: record.phone,
        email: record.email,
        employee_num: record.employee_num || '',
        hire_date: record.start_date ? new Date(record.start_date).toISOString().slice(0, 10) : '',
        fire_date: firingDate,
        fire_reason: firingReason.trim(),
        fire_type: 'forced',
        original_record_id: record.id,
        notes: record.notes || '',
      })
      setRecords(r => r.filter(x => x.id !== rid))
      alert('Сотрудник успешно уволен и добавлен в архив.')
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка увольнения')
    } finally {
      setFiringId(null)
      setFiringDate('')
      setFiringReason('')
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>{dept?.name}</h1>
          {dept?.description && <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{dept.description}</p>}
        </div>
        {canWrite && (
          <button onClick={() => navigate(`/departments/${id}/records/new`)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Добавить
          </button>
        )}
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input className="input-field pl-9" placeholder="Поиск по ФИО или должности..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <User size={36} className="mx-auto mb-3 opacity-20" />
          <p style={{ color: 'var(--muted)' }}>{records.length === 0 ? 'В отделе нет записей' : 'Ничего не найдено'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rec, index) => {
            const rating = Number(rec.kpi?.overall_rating || 0)
            const rank = index + 1
            return (
            <div key={rec.id} className="card p-4 flex items-center gap-4 hover:border-cyan-500/30 transition-all cursor-pointer" onClick={() => navigate(`/departments/${id}/records/${rec.id}`)}>
              <div className="w-10 h-10 rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-400 font-semibold text-sm font-display flex-shrink-0">
                {rec.last_name?.[0]}{rec.first_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                  {rec.last_name} {rec.first_name} {rec.middle_name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{rec.position}</p>
                <div className="flex items-center gap-4 mt-1">
                  {rec.phone && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}><Phone size={11} />{rec.phone}</span>}
                  {rec.email && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}><Mail size={11} />{rec.email}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 flex items-center gap-1 font-medium">
                  <Trophy size={11} /> #{rank}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-medium">
                  KPI {rec.kpi?.period ? rating.toFixed(1) : '—'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[rec.status]}`}>
                  {statusLabel[rec.status]}
                </span>
                {rec.documents?.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">{rec.documents.length} докум.</span>
                )}
                {canWrite && (
                  <>
                    <button onClick={e => { e.stopPropagation(); navigate(`/departments/${id}/records/${rec.id}/edit`) }}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--muted)' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setFiringId(rec.id); setFiringDate(''); setFiringReason('') }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Модал подтверждения удаления */}
      {firingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={20} className="text-red-400" />
              <h3 className="font-semibold font-display" style={{ color: 'var(--text)' }}>Уволить сотрудника?</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Заполните дату увольнения и причину.</p>
            <div className="grid gap-4">
              <label className="block">
                <span className="label">Дата увольнения</span>
                <input type="date" className="input-field" value={firingDate} onChange={e => setFiringDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Причина увольнения</span>
                <input type="text" className="input-field" value={firingReason} onChange={e => setFiringReason(e.target.value)} placeholder="Например, сокращение штатной единицы" />
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setFiringId(null); setFiringDate(''); setFiringReason('') }} className="btn-ghost flex-1" style={{ color: 'var(--muted)' }}>Отмена</button>
              <button onClick={() => handleFire(firingId)} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-400 transition-colors">Уволить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
