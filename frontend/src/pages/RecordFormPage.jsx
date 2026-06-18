import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Camera } from 'lucide-react'
import api from '../api/client'
import { uploadRecordAvatar } from '../api/documents'

const STATUSES = [{ v: 'active', l: 'Работает' }, { v: 'inactive', l: 'Уволен' }, { v: 'on_leave', l: 'В отпуске/Декрет' }]
const DOC_TYPES = ['contract', 'id', 'diploma', 'certificate', 'order', 'other']
const DOC_LABELS = { contract: 'Договор', id: 'Удостоверение', diploma: 'Диплом', certificate: 'Справка', order: 'Приказ', other: 'Прочее' }

const emptyDoc = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: '', doc_type: 'contract', description: '' })
const emptyForm = () => ({
  last_name: '', first_name: '', middle_name: '',
  position: '', phone: '', email: '', city: '', employee_num: '',
  start_date: '', status: 'active', notes: '', documents: [],
})

const Field = ({ id, label, type = 'text', required, placeholder, value, onChange }) => (
  <div>
    <label htmlFor={id} className="label">{label}{required && ' *'}</label>
    <input id={id} name={id} type={type} className="input-field" value={value} onChange={onChange}
      required={required} placeholder={placeholder} />
  </div>
)

export default function RecordFormPage() {
  const { id: deptId, rid } = useParams()
  const navigate = useNavigate()
  const isEdit = !!rid && rid !== 'new'
  const [form, setForm] = useState(emptyForm())
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(`/departments/${deptId}`)
    }
  }
  const [dept, setDept] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [avatarURL, setAvatarURL] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    api.get(`/departments/${deptId}`).then(r => setDept(r.data))
    if (isEdit) {
      api.get(`/departments/${deptId}/records/${rid}`)
        .then(r => {
          const d = r.data
          setForm({
            ...emptyForm(), ...d,
            start_date: d.start_date ? d.start_date.split('T')[0] : '',
            documents: (d.documents || []).map(doc => ({ id: doc.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...doc })),
          })
          setAvatarURL(d.avatar_url || '')
        })
        .catch(() => navigate(`/departments/${deptId}`))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [deptId, rid, isEdit])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }
  const setDoc = (i, k) => e => setForm(f => {
    const docs = [...f.documents]
    docs[i] = { ...docs[i], [k]: e.target.value }
    return { ...f, documents: docs }
  })
  const addDoc = () => setForm(f => ({ ...f, documents: [...f.documents, emptyDoc()] }))
  const removeDoc = i => setForm(f => ({ ...f, documents: f.documents.filter((_, j) => j !== i) }))

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
      const response = await uploadRecordAvatar(deptId, rid, file)
      setAvatarURL(response.avatar_url)
    } catch (err) {
      setAvatarError(err.response?.data?.error || 'Ошибка загрузки аватара')
    } finally {
      setUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const submit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (isEdit) await api.put(`/departments/${deptId}/records/${rid}`, form)
      else await api.post(`/departments/${deptId}/records`, form)
      navigate(`/departments/${deptId}`)
    } catch (err) { setError(err.response?.data?.error || 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="p-1.5 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>
            {isEdit ? 'Редактировать запись' : 'Новая запись'}
          </h1>
          {dept && <p className="text-sm" style={{ color: 'var(--muted)' }}>{dept.name}</p>}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* ── Персональные данные ── */}
        <div className="card">
          <h2 className="text-sm font-semibold font-display mb-4" style={{ color: 'var(--text)' }}>Персональные данные</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field id="last_name" label="Фамилия" required placeholder="Иванов" value={form.last_name} onChange={handleChange} />
            <Field id="first_name" label="Имя" required placeholder="Иван" value={form.first_name} onChange={handleChange} />
            <Field id="middle_name" label="Отчество" placeholder="Иванович" value={form.middle_name} onChange={handleChange} />
          </div>
        </div>

        {/* ── Должность и контакты ── */}
        <div className="card">
          <h2 className="text-sm font-semibold font-display mb-4" style={{ color: 'var(--text)' }}>Должность и контакты</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="position" label="Должность" required placeholder="Менеджер" value={form.position} onChange={handleChange} />
            <div>
              <label htmlFor="city" className="label">Город</label>
              <select id="city" name="city" className="input-field" value={form.city} onChange={handleChange}>
                <option value="">— Выберите —</option>
                <option value="Астана">Астана</option>
                <option value="Алматы">Алматы</option>
                <option value="Другой">Другой</option>
              </select>
            </div>
            <Field id="phone" label="Телефон" placeholder="+7 700 000 0000" value={form.phone} onChange={handleChange} />
            <Field id="email" label="Email" type="email" placeholder="ivanov@stem-academia.kz" value={form.email} onChange={handleChange} />
            <Field id="employee_num" label="Табельный номер" placeholder="ТН-0001" value={form.employee_num} onChange={handleChange} />
          </div>
        </div>

        {isEdit && (
          <div className="card">
            <h2 className="text-sm font-semibold font-display mb-4" style={{ color: 'var(--text)' }}>Аватар сотрудника</h2>
            <div className="flex flex-col items-center gap-3">
              <div className="w-28 h-28 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                {avatarURL ? (
                  <img src={avatarURL} alt="Аватар" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-semibold text-2xl">
                    {form.last_name?.[0]}{form.first_name?.[0]}
                  </div>
                )}
              </div>
              {avatarError && <p className="text-sm text-red-400">{avatarError}</p>}
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="btn-ghost flex items-center gap-2">
                <Camera size={16} /> {avatarURL ? 'Изменить аватар' : 'Добавить аватар'}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {uploadingAvatar && <p className="text-xs text-slate-400">Загрузка аватара...</p>}
            </div>
          </div>
        )}

        {/* ── Трудовые данные ── */}
        <div className="card">
          <h2 className="text-sm font-semibold font-display mb-4" style={{ color: 'var(--text)' }}>Трудовые данные</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="start_date" label="Дата приёма" type="date" value={form.start_date} onChange={handleChange} />
            <div>
              <label htmlFor="status" className="label">Статус</label>
              <select id="status" name="status" className="input-field" value={form.status} onChange={handleChange}>
                {STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="notes" className="label">Заметки</label>
            <textarea id="notes" name="notes" className="input-field resize-none" rows={3} value={form.notes} onChange={handleChange}
              placeholder="Дополнительная информация..." />
          </div>
        </div>

        {/* ── Документы (только названия) ── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold font-display" style={{ color: 'var(--text)' }}>Документы</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Перечень документов сотрудника (загрузка файлов будет добавлена позже)</p>
            </div>
            <button type="button" onClick={addDoc} className="btn-ghost text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              <Plus size={14} /> Добавить
            </button>
          </div>

          {form.documents.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Документы не добавлены</p>
          ) : (
            <div className="space-y-3">
              {form.documents.map((doc, i) => (
                <div key={doc.id} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
                  <div className="col-span-5">
                    <label htmlFor={`doc-name-${i}`} className="label">Название</label>
                    <input id={`doc-name-${i}`} className="input-field" placeholder="Трудовой договор" value={doc.name} onChange={setDoc(i, 'name')} />
                  </div>
                  <div className="col-span-3">
                    <label htmlFor={`doc-type-${i}`} className="label">Тип</label>
                    <select id={`doc-type-${i}`} className="input-field" value={doc.doc_type} onChange={setDoc(i, 'doc_type')}>
                      {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label htmlFor={`doc-description-${i}`} className="label">Примечание</label>
                    <input id={`doc-description-${i}`} className="input-field" placeholder="..." value={doc.description} onChange={setDoc(i, 'description')} />
                  </div>
                  <div className="col-span-1 flex items-end justify-end pb-0.5">
                    <button type="button" onClick={() => removeDoc(i)} className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors mt-5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        {/* Кнопки */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={handleBack} className="btn-ghost" style={{ color: 'var(--muted)' }}>Отмена</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}
