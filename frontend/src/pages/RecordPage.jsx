import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import DocumentsPanel from '../components/DocumentsPanel'

export default function RecordPage() {
  const { id, rid } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)

  const canWrite = user?.role === 'director' || user?.role === 'managing_director' || user?.role === 'department_head'

  useEffect(() => {
    api.get(`/departments/${id}/records/${rid}`)
      .then(r => setRecord(r.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [id, rid])

  const handleRecordUpdate = () => {
    api.get(`/departments/${id}/records/${rid}`)
      .then(r => setRecord(r.data))
      .catch(() => {})
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )

  if (!record) return (
    <div className="p-6 text-center">
      <p style={{ color: 'var(--muted)' }}>Запись не найдена</p>
    </div>
  )

  const statusLabel = { active: 'Работает', inactive: 'Уволен', on_leave: 'В отпуске' }
  const statusColor = { active: 'text-green-400', inactive: 'text-red-400', on_leave: 'text-amber-400' }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/departments/${id}`)} className="p-1.5 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
            {record.last_name} {record.first_name} {record.middle_name}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{record.position}</p>
        </div>
      </div>

      {/* Основная информация */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4 space-y-3">
          <div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>СТАТУС</p>
            <p className={`text-sm font-medium mt-1 ${statusColor[record.status]}`}>
              {statusLabel[record.status]}
            </p>
          </div>
          {record.phone && (
            <div>
              <p className="text-xs flex items-center gap-1 mb-1" style={{ color: 'var(--muted)' }}>
                <Phone size={12} /> ТЕЛЕФОН
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{record.phone}</p>
            </div>
          )}
          {record.email && (
            <div>
              <p className="text-xs flex items-center gap-1 mb-1" style={{ color: 'var(--muted)' }}>
                <Mail size={12} /> EMAIL
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{record.email}</p>
            </div>
          )}
        </div>

        <div className="card p-4 space-y-3">
          {record.start_date && (
            <div>
              <p className="text-xs flex items-center gap-1 mb-1" style={{ color: 'var(--muted)' }}>
                <Calendar size={12} /> НАЧАЛО РАБОТЫ
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {new Date(record.start_date).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}
          {record.city && (
            <div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>ГОРОД</p>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--text)' }}>{record.city}</p>
            </div>
          )}
          {record.employee_num && (
            <div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>ТАБЕЛЬНЫЙ НОМЕР</p>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--text)' }}>{record.employee_num}</p>
            </div>
          )}
        </div>
      </div>

      {/* Примечания */}
      {record.notes && (
        <div className="card p-4 mb-6">
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>ПРИМЕЧАНИЯ</p>
          <p className="text-sm" style={{ color: 'var(--text)' }}>{record.notes}</p>
        </div>
      )}

      {/* Документы */}
      <div className="card p-4">
        {canWrite ? (
          <DocumentsPanel
            deptId={id}
            recordId={rid}
            documents={record.documents || []}
            onUpdate={handleRecordUpdate}
          />
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Документы ({(record.documents || []).length})</h3>
            {(record.documents || []).length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>Нет документов</p>
            ) : (
              <div className="space-y-2">
                {record.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded hover:bg-white/5">
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{doc.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
