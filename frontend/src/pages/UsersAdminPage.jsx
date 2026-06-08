import { useEffect, useState } from 'react'
import { Search, RefreshCw, Check, X } from 'lucide-react'
import api from '../api/client'

const ROLES = [
  { v: 'director', l: 'Директор' },
  { v: 'managing_director', l: 'Упр. директор' },
  { v: 'department_head', l: 'Рук. отдела' },
  { v: 'employee', l: 'Сотрудник' },
]
const roleColor = { director: 'text-amber-400', managing_director: 'text-purple-400', department_head: 'text-cyan-400', employee: 'text-slate-400' }

export default function UsersAdminPage() {
  const [users, setUsers] = useState([])
  const [depts, setDepts] = useState([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // { id, role, department_id, is_active }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data))
    api.get('/departments').then(r => setDepts(r.data))
  }, [])

  const filtered = users.filter(u =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const startEdit = u => setEditing({ id: u.id, role: u.role, department_id: u.department_id || '', is_active: u.is_active })

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/users/${editing.id}`, {
        role: editing.role,
        department_id: editing.department_id || null,
        is_active: editing.is_active,
      })
      setUsers(us => us.map(u => u.id === editing.id ? { ...u, ...editing } : u))
      setEditing(null)
    } catch (e) { alert(e.response?.data?.error || 'Ошибка') }
    finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>Управление пользователями</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{users.length} пользователей</p>
        </div>
        <button onClick={() => api.get('/users').then(r => setUsers(r.data))} className="btn-ghost p-2" style={{ color: 'var(--muted)' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input className="input-field pl-9" placeholder="Поиск по имени или email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--bg)' }}>
            <tr>
              {['Пользователь', 'Роль', 'Отдел', 'Статус', 'Действия'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} style={{ borderTop: `1px solid var(--border)`, background: i % 2 === 0 ? 'transparent' : 'var(--bg)05' }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{u.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  {editing?.id === u.id ? (
                    <select className="input-field py-1 text-xs" value={editing.role} onChange={e => setEditing(x => ({ ...x, role: e.target.value }))}>
                      {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  ) : (
                    <span className={`font-medium ${roleColor[u.role]}`}>{ROLES.find(r => r.v === u.role)?.l || u.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing?.id === u.id ? (
                    <select className="input-field py-1 text-xs" value={editing.department_id} onChange={e => setEditing(x => ({ ...x, department_id: e.target.value }))}>
                      <option value="">— Без отдела —</option>
                      {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>{depts.find(d => d.id === u.department_id)?.name || '—'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing?.id === u.id ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editing.is_active} onChange={e => setEditing(x => ({ ...x, is_active: e.target.checked }))} className="accent-cyan-500" />
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>Активен</span>
                    </label>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {u.is_active ? 'Активен' : 'Заблокирован'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing?.id === u.id ? (
                    <div className="flex gap-1">
                      <button onClick={save} disabled={saving} className="p-1.5 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-white/5 transition-colors" style={{ color: 'var(--muted)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(u)} className="text-xs btn-ghost px-3 py-1" style={{ color: 'var(--muted)' }}>
                      Изменить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>Пользователи не найдены</p>
        )}
      </div>
    </div>
  )
}
