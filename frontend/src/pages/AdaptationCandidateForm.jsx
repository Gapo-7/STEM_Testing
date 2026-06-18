import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../api/client'
import { createAdaptationCandidate } from '../api/adaptation'

const initialForm = {
  last_name: '',
  first_name: '',
  middle_name: '',
  phone: '',
  email: '',
  position: '',
  start_date: '',
  notes: '',
}

export default function AdaptationCandidateForm() {
  const { deptId } = useParams()
  const navigate = useNavigate()
  const [department, setDepartment] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/departments/${deptId}`).then(r => setDepartment(r.data)).catch(() => navigate('/adaptation'))
  }, [deptId])

  const handleChange = event => {
    const { name, value } = event.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(`/adaptation/${deptId}`)
    }
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setProcessing(true)
    setError('')
    try {
      await createAdaptationCandidate(deptId, form)
      navigate(`/adaptation/${deptId}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания кандидата')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={handleBack} className="btn-ghost mb-6">
        <ArrowLeft size={18} /> Назад
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
          Добавить кандидата{department ? ` в ${department.name}` : ''}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Заполните данные для нового кандидата адаптации.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Фамилия</span>
            <input className="input-field" name="last_name" value={form.last_name} onChange={handleChange} required />
          </label>
          <label className="block">
            <span className="label">Имя</span>
            <input className="input-field" name="first_name" value={form.first_name} onChange={handleChange} required />
          </label>
          <label className="block">
            <span className="label">Отчество</span>
            <input className="input-field" name="middle_name" value={form.middle_name} onChange={handleChange} />
          </label>
          <label className="block">
            <span className="label">Должность</span>
            <input className="input-field" name="position" value={form.position} onChange={handleChange} required />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Телефон</span>
            <input className="input-field" name="phone" value={form.phone} onChange={handleChange} />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input className="input-field" name="email" value={form.email} onChange={handleChange} type="email" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="label">Дата начала</span>
            <input className="input-field" name="start_date" value={form.start_date} onChange={handleChange} type="date" />
          </label>
          <label className="block">
            <span className="label">Статус</span>
            <input className="input-field" value="ongoing" disabled />
          </label>
        </div>

        <label className="block">
          <span className="label">Заметки</span>
          <textarea className="input-field min-h-[120px]" name="notes" value={form.notes} onChange={handleChange} />
        </label>

        {error && <div className="text-sm text-red-400">{error}</div>}

        <button type="submit" className="btn-primary w-full" disabled={processing}>
          {processing ? 'Сохраняем...' : 'Сохранить кандидата'}
        </button>
      </form>
    </div>
  )
}
