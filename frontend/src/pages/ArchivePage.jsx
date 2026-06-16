import { useState } from 'react'
import { Search, XCircle, UserX } from 'lucide-react'

const tabs = [
  { value: 'failed', label: 'Не прошли', icon: XCircle },
  { value: 'fired', label: 'Уволенные', icon: UserX },
]

export default function ArchivePage() {
  const [selected, setSelected] = useState('failed')
  const [search, setSearch] = useState('')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-3">
        <h1 className="text-2xl font-bold font-display">Архив</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
          Просмотр истории кандидатов и уволенных сотрудников.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] items-center mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => {
            const active = selected === tab.value
            const Icon = tab.icon
            return (
              <button
                key={tab.value}
                onClick={() => setSelected(tab.value)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${active ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            className="input-field pl-9 w-full"
            placeholder="Поиск по ФИО или должности"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card text-center py-16">
        <p style={{ color: 'var(--muted)' }}>Нет записей в архиве</p>
      </div>
    </div>
  )
}
