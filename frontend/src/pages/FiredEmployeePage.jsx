import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserX } from 'lucide-react'
import api from '../api/client'
import { fetchFiredEmployee } from '../api/archive'

export default function FiredEmployeePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const getDepartmentName = departmentId => {
    const idString = departmentId?.toString ? departmentId.toString() : departmentId
    return departments.find(d => d.id === idString)?.name || idString || 'Не указано'
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchFiredEmployee(id),
      api.get('/departments'),
    ])
      .then(([itemRes, departmentsRes]) => {
        setItem(itemRes.data)
        setDepartments(departmentsRes.data)
      })
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{error || 'Запись не найдена'}</p>
        <button onClick={() => navigate('/archive')} className="btn-secondary mt-4">Назад в архив</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/archive')} className="btn-ghost mb-6">
        <ArrowLeft size={18} /> В архив
      </button>

      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <UserX size={28} className="text-rose-400" />
          <div>
            <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
              {item.last_name} {item.first_name} {item.middle_name}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {item.position} • Табельный номер {item.employee_num || '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Отдел</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{getDepartmentName(item.department_id)}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Дата увольнения</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>
              {item.fire_date ? new Date(item.fire_date).toLocaleDateString('ru-RU') : 'Не указано'}
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Причина</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{item.fire_reason || 'Не указано'}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Текущий статус</p>
            <p className="text-sm text-amber-300">Уволен</p>
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Комментарий</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text)' }}>{item.comment || 'Нет комментариев'}</p>
        </div>
      </div>
    </div>
  )
}
