import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserX, Phone, Mail, Calendar, FileText, Download } from 'lucide-react'
import api from '../api/client'
import { fetchFiredEmployee } from '../api/archive'
import { downloadDocument } from '../api/documents'

export default function FiredEmployeePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)
  const [docError, setDocError] = useState('')

  const getDepartmentName = departmentId => {
    const idString = departmentId?.toString ? departmentId.toString() : departmentId
    return departments.find(d => d.id === idString)?.name || idString || 'Не указано'
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/archive')
    }
  }

  const handleDownload = async (doc) => {
    setDocError('')
    setDownloadingId(doc.id)
    try {
      const response = await downloadDocument(item.department_id, item.original_record_id || id, doc.id)
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename\*?=([^;]+)/i)
      let fileName = doc.name || 'download'
      if (match) {
        fileName = match[1].trim().replace(/"/g, '')
      }
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setDocError(err.response?.data?.error || 'Ошибка скачивания документа')
    } finally {
      setDownloadingId(null)
    }
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
        <button onClick={handleBack} className="btn-secondary mt-4">Назад</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={handleBack} className="btn-ghost mb-6">
        <ArrowLeft size={18} /> Назад
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)] mb-6">
        <div className="card p-4 flex flex-col items-center text-center gap-4">
          <div className="w-32 h-32 rounded-full bg-slate-700 overflow-hidden border-2 border-rose-500/20">
            {item.avatar_url ? (
              <img src={item.avatar_url} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-semibold text-2xl">
                {item.last_name?.[0]}{item.first_name?.[0]}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Отдел</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{getDepartmentName(item.department_id)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>ФИО</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{item.last_name} {item.first_name} {item.middle_name}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Должность</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{item.position || 'Не указано'}</p>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Табельный номер</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{item.employee_num || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Телефон</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{item.phone || '—'}</p>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Email</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{item.email || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Дата приёма</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{(item.start_date || item.hire_date) ? new Date(item.start_date || item.hire_date).toLocaleDateString('ru-RU') : 'Не указано'}</p>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Дата увольнения</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{item.fire_date ? new Date(item.fire_date).toLocaleDateString('ru-RU') : 'Не указано'}</p>
            </div>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Статус</p>
            <p className="text-sm text-rose-300">Уволен</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Причина увольнения</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{item.fire_reason || 'Не указано'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-4 mb-6" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Комментарий</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text)' }}>{item.notes || item.original_notes || 'Нет комментариев'}</p>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Документы ({(item.documents || []).length})</h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Загруженные файлы сотрудника</p>
          </div>
          {docError && <p className="text-xs text-red-400">{docError}</p>}
        </div>

        {(item.documents || []).length === 0 ? (
          <div className="card text-center py-6" style={{ color: 'var(--muted)' }}>
            <FileText size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Нет документов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {item.documents.map(doc => (
              <div key={doc.id} className="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{doc.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{doc.doc_type} • {(doc.file_size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  className="btn-secondary text-xs flex items-center gap-2"
                >
                  <Download size={14} /> {downloadingId === doc.id ? 'Скачивание...' : 'Скачать'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
