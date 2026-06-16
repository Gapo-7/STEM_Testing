import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function AdaptationDeptPage() {
  const { deptId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [department, setDepartment] = useState(null)
  const [loading, setLoading] = useState(true)

  const canWrite = user?.role === 'director' || user?.role === 'managing_director' || user?.role === 'department_head'

  useEffect(() => {
    setLoading(true)
    api.get(`/departments/${deptId}`)
      .then(deptRes => setDepartment(deptRes.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [deptId])

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

      {loading ? (
        <div className="card text-center py-20">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Загрузка...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="card p-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Добавление нового кандидата
            </h2>
          </div>
        </div>
      )}
    </div>
  )
}
