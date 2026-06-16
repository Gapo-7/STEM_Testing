import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchAdaptationCandidate, addAdaptationCriterion, updateAdaptationCriterion, deleteAdaptationCriterion, promoteAdaptationCandidate, updateAdaptationCandidate } from '../api/adaptation'

const statusMap = {
  ongoing: { label: 'В процессе', color: 'bg-slate-500/10 text-slate-300' },
  passed: { label: 'Прошёл', color: 'bg-green-500/10 text-green-300' },
  failed: { label: 'Не прошёл', color: 'bg-red-500/10 text-red-300' },
  fired: { label: 'Уволен', color: 'bg-amber-500/10 text-amber-300' },
}

export default function AdaptationCandidateCard() {
  const { id, deptId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newCriterion, setNewCriterion] = useState({ title: '', comment: '', score: 80, evaluated_by: user?.name || '' })
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingCriterion, setEditingCriterion] = useState({ title: '', comment: '', score: 80, evaluated_by: '' })
  const [saving, setSaving] = useState(false)

  const canWrite = user?.role === 'director' || user?.role === 'managing_director' || user?.role === 'department_head'
  const canPromote = user?.role === 'director' || user?.role === 'managing_director'

  useEffect(() => {
    setLoading(true)
    fetchAdaptationCandidate(id)
      .then(r => setCandidate(r.data))
      .catch(() => navigate('/adaptation'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setNewCriterion(prev => ({ ...prev, evaluated_by: user?.name || '' }))
  }, [user?.name])

  const criteria = useMemo(() => candidate?.criteria || [], [candidate])
  const isEditing = Boolean(editingId)
  const activeCriterion = isEditing ? editingCriterion : newCriterion

  const resetCriterionForm = () => {
    setEditingId(null)
    setEditingCriterion({ title: '', comment: '', score: 80, evaluated_by: user?.name || '' })
    setNewCriterion({ title: '', comment: '', score: 80, evaluated_by: user?.name || '' })
    setError('')
  }

  const setCriterionField = (field, value) => {
    if (isEditing) {
      setEditingCriterion(prev => ({ ...prev, [field]: value }))
    } else {
      setNewCriterion(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleCriterionSave = async () => {
    if (!newCriterion.title || !newCriterion.evaluated_by) {
      setError('Заполните название и ответственного')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addAdaptationCriterion(id, newCriterion)
      const updated = await fetchAdaptationCandidate(id)
      setCandidate(updated.data)
      resetCriterionForm()
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления критерия')
    } finally {
      setSaving(false)
    }
  }

  const handleCriterionUpdate = async () => {
    if (!editingCriterion.title || !editingCriterion.evaluated_by) {
      setError('Заполните название и ответственного')
      return
    }
    if (!editingId) return

    setSaving(true)
    setError('')
    try {
      await updateAdaptationCriterion(id, editingId, editingCriterion)
      const updated = await fetchAdaptationCandidate(id)
      setCandidate(updated.data)
      resetCriterionForm()
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления критерия')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCriterion = async criterionId => {
    if (!window.confirm('Удалить критерий?')) return
    try {
      await deleteAdaptationCriterion(id, criterionId)
      const updated = await fetchAdaptationCandidate(id)
      setCandidate(updated.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления критерия')
    }
  }

  const handlePromote = async () => {
    if (!window.confirm('Перевести кандидата в сотрудников?')) return
    setSaving(true)
    try {
      await promoteAdaptationCandidate(id)
      const updated = await fetchAdaptationCandidate(id)
      setCandidate(updated.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка перевода кандидата')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkFailed = async () => {
    if (!window.confirm('Пометить кандидата как не прошедшего?')) return
    setSaving(true)
    setError('')
    try {
      await updateAdaptationCandidate(id, { ...candidate, status: 'failed' })
      const updated = await fetchAdaptationCandidate(id)
      setCandidate(updated.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка изменения статуса')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: 'var(--muted)' }}>Кандидат не найден</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <button onClick={() => navigate(`/adaptation/${deptId}`)} className="btn-ghost mb-3">
            <ArrowLeft size={18} /> Назад
          </button>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
            {candidate.last_name} {candidate.first_name} {candidate.middle_name}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{candidate.position}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusMap[candidate.status]?.color || 'bg-slate-500/10 text-slate-300'}`}>
            {statusMap[candidate.status]?.label || candidate.status}
          </span>
          {candidate.status === 'passed' && candidate.employee_record_id && (
            <button onClick={() => navigate(`/departments/${deptId}/records/${candidate.employee_record_id}`)} className="btn-secondary text-xs">
              Перейти к сотруднику
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Контакты</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{candidate.phone || '—'}</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{candidate.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Дата начала</p>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{candidate.start_date ? new Date(candidate.start_date).toLocaleDateString('ru-RU') : 'Не указано'}</p>
          </div>
          {candidate.end_date && (
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Дата окончания</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{new Date(candidate.end_date).toLocaleDateString('ru-RU')}</p>
            </div>
          )}
        </div>

        <div className="card p-4 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Заметки</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>{candidate.notes || 'Нет заметок'}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canPromote && candidate.status === 'ongoing' && (
                <button onClick={handlePromote} className="btn-primary text-sm" disabled={saving}>
                  <CheckCircle size={16} /> В сотрудника
                </button>
              )}
              {canWrite && candidate.status === 'ongoing' && (
                <button onClick={handleMarkFailed} className="btn-secondary text-sm" disabled={saving}>
                  <XCircle size={16} /> Не прошёл
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Критерии</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Оценки и комментарии по адаптационным метрикам.</p>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-cyan-400" />
            <span className="text-sm font-semibold">{criteria.length}</span>
          </div>
        </div>

        {criteria.length === 0 ? (
          <div className="text-sm text-slate-400">Нет критериев. Добавьте первый.</div>
        ) : (
          <div className="space-y-3">
            {criteria.map(item => (
              <div key={item.id} className="rounded-2xl border p-4 border-white/10 bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{item.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{item.comment || 'Комментарий отсутствует'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-cyan-300">{item.score}</span>
                    {canWrite && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                        setEditingId(item.id)
                        setEditingCriterion({
                          title: item.title,
                          comment: item.comment,
                          score: item.score,
                          evaluated_by: item.evaluated_by,
                        })
                      }} className="text-slate-300 hover:text-cyan-300 text-sm">Изменить</button>
                      <button onClick={() => handleDeleteCriterion(item.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
                    </div>
                  )}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400">Оценивал: {item.evaluated_by || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canWrite && (
        <div className="card p-5">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Добавить критерий</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="label">Название</span>
                <input className="input-field" value={activeCriterion.title} onChange={e => setCriterionField('title', e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Оценка (1-100)</span>
                <input className="input-field" type="number" min="1" max="100" value={activeCriterion.score} onChange={e => setCriterionField('score', Number(e.target.value))} />
              </label>
            </div>
            <label className="block">
              <span className="label">Комментарий</span>
              <textarea className="input-field min-h-[100px]" value={activeCriterion.comment} onChange={e => setCriterionField('comment', e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Оценивал</span>
              <input className="input-field" value={activeCriterion.evaluated_by} onChange={e => setCriterionField('evaluated_by', e.target.value)} />
            </label>

            {editingId && (
              <div className="rounded-2xl border border-yellow-300/20 bg-yellow-500/5 p-4 text-sm text-yellow-200">
                Редактируется критерий. <button onClick={() => {
                  setEditingId(null)
                  setEditingCriterion({ title: '', comment: '', score: 0, evaluated_by: '' })
                }} className="underline">Отменить</button>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={saving} onClick={editingId ? handleCriterionUpdate : handleCriterionSave}>
                {editingId ? 'Сохранить изменения' : 'Добавить критерий'}
              </button>
              {editingId && (
                <button className="btn-secondary" type="button" onClick={() => setEditingId(null)}>
                  Отменить
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
