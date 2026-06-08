import { useEffect, useState } from 'react'
import { Plus, Search, RefreshCw, Check, X, Trash2 } from 'lucide-react'
import api from '../api/client'

const deptIcons = { finance: '💰', hr: '👥', projects: '🏗️', tenders: '📋', trading_house: '🏪', stem_academia: '🎓', sa_development: '🔧', sa_projects: '📐', sa_sales: '📈', admin_management: '🏢' }
const DEPT_CODES = Object.keys(deptIcons)

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // { id, name, description, code }
  const [creating, setCreating] = useState(false)
  const [newDept, setNewDept] = useState({ name: '', description: '', code: 'projects' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    loadDepts()
  }, [])

  const loadDepts = async () => {
    setLoading(true)
    try {
      const r = await api.get('/departments')
      setDepartments(r.data)
    } catch (e) {
      alert('Ошибка загрузки отделов')
    }
    setLoading(false)
  }

  const filtered = departments.filter(d =>
    `${d.name} ${d.description || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newDept.name.trim()) {
      alert('Введите название отдела')
      return
    }
    setSaving(true)
    try {
      const r = await api.post('/departments', newDept)
      setDepartments(ds => [...ds, r.data])
      setNewDept({ name: '', description: '', code: 'projects' })
      setCreating(false)
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка создания')
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editing.name.trim()) {
      alert('Введите название отдела')
      return
    }
    setSaving(true)
    try {
      await api.put(`/departments/${editing.id}`, {
        name: editing.name,
        description: editing.description,
        code: editing.code,
      })
      setDepartments(ds => ds.map(d => d.id === editing.id ? { ...d, ...editing } : d))
      setEditing(null)
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка обновления')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены? Это удалит отдел!')) return
    setSaving(true)
    try {
      await api.delete(`/departments/${id}`)
      setDepartments(ds => ds.filter(d => d.id !== id))
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка удаления')
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>Управление отделами</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{departments.length} отделов</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadDepts} className="btn-ghost p-2" style={{ color: 'var(--muted)' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Новый отдел
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input className="input-field pl-9" placeholder="Поиск по названию..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Форма создания */}
      {creating && (
        <div className="card mb-6 p-4">
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Создать новый отдел</h3>
          <div className="space-y-3">
            <input className="input-field" placeholder="Название отдела"
              value={newDept.name} onChange={e => setNewDept(x => ({ ...x, name: e.target.value }))} />
            <input className="input-field" placeholder="Описание (опционально)"
              value={newDept.description} onChange={e => setNewDept(x => ({ ...x, description: e.target.value }))} />
            <select className="input-field" value={newDept.code} onChange={e => setNewDept(x => ({ ...x, code: e.target.value }))}>
              {DEPT_CODES.map(c => <option key={c} value={c}>{deptIcons[c]} {c}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Создание...' : 'Создать'}
              </button>
              <button onClick={() => setCreating(false)} className="btn-ghost flex-1">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Таблица */}
      {loading ? (
        <div className="card text-center py-8">
          <span className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin inline-block" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: 'var(--muted)' }}>Отделы не найдены</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                {['Иконка', 'Название', 'Описание', 'Записей', 'Действия'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} style={{ borderTop: `1px solid var(--border)`, background: i % 2 === 0 ? 'transparent' : 'var(--bg)05' }}>
                  <td className="px-4 py-3">
                    <span className="text-xl">{deptIcons[d.code] || '📁'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === d.id ? (
                      <input className="input-field py-1 text-xs" value={editing.name}
                        onChange={e => setEditing(x => ({ ...x, name: e.target.value }))} />
                    ) : (
                      <p className="font-medium" style={{ color: 'var(--text)' }}>{d.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === d.id ? (
                      <input className="input-field py-1 text-xs" value={editing.description}
                        onChange={e => setEditing(x => ({ ...x, description: e.target.value }))} />
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{d.description || '—'}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{d.record_count || 0}</p>
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === d.id ? (
                      <div className="flex gap-1">
                        <button onClick={handleUpdate} disabled={saving} className="p-1.5 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-white/5" style={{ color: 'var(--muted)' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(d)} className="text-xs btn-ghost px-2 py-1" style={{ color: 'var(--muted)' }}>
                          Изменить
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="text-xs btn-ghost px-2 py-1 text-red-400 hover:bg-red-500/10">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
