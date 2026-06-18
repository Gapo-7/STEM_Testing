import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, Phone, Mail, Calendar, Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import DocumentsPanel from '../components/DocumentsPanel'

export default function RecordPage() {
  const { id, rid } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarInputRef = useRef(null)

  const canWrite = user?.role === 'director' || user?.role === 'managing_director' || user?.role === 'department_head'

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(`/departments/${id}`)
    }
  }

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

  const handleAvatarChange = async event => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setAvatarError('Только JPG и PNG файлы поддерживаются')
      return
    }

    setAvatarError('')
    setUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/departments/${id}/records/${rid}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      handleRecordUpdate()
    } catch (err) {
      setAvatarError(err.response?.data?.error || 'Ошибка загрузки аватара')
    } finally {
      setUploadingAvatar(false)
      event.target.value = ''
    }
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
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-1.5 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
              {record.last_name} {record.first_name} {record.middle_name}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{record.position}</p>
            {record.kpi && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                <BarChart3 size={12} /> Рейтинг: {Number(record.kpi.overall_rating || 0).toFixed(1)}
              </p>
            )}
          </div>
        </div>
        <button onClick={() => navigate(`/departments/${id}/records/${rid}/kpi`)} className="btn-primary flex items-center gap-2">
          <BarChart3 size={16} /> Смотреть KPI
        </button>
      </div>
      {/* Основная информация */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-4 mb-6">
        <div className="card p-4 flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-slate-700 overflow-hidden border-2 border-cyan-500/20">
              {record.avatar_url ? (
                <img src={record.avatar_url} alt="Аватар" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-semibold text-2xl">
                  {record.last_name?.[0]}{record.first_name?.[0]}
                </div>
              )}
            </div>
          </div>

          {avatarError && <p className="text-sm text-red-400">{avatarError}</p>}

          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="btn-ghost flex items-center gap-2"
              >
                <Camera size={16} />
                {record.avatar_url ? 'Изменить аватар' : 'Добавить аватар'}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </>
          )}

          {uploadingAvatar && <p className="text-xs text-slate-400">Загрузка аватара...</p>}
        </div>

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
