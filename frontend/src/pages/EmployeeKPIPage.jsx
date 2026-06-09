import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, Calendar, Save, TrendingDown, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchEmployeeKPI, saveEmployeeKPI } from '../api/kpi'

const currentMonth = () => new Date().toISOString().slice(0, 7)

const baseForm = period => ({
	period,
	contract_type: 'ТД',
	lateness_minutes: 0,
	vacation: '',
	sick_leave_days: 0,
	training: '',
	overall_rating: 0,
	component_values: {},
})

const SparkBars = ({ values }) => {
	const max = Math.max(100, ...values.map(v => Number(v) || 0), 1)
	return (
		<div className="flex items-end gap-1 h-16">
			{values.map((value, index) => {
				const height = Math.max(6, ((Number(value) || 0) / max) * 100)
				return <div key={index} className="w-full rounded-sm bg-cyan-500/70" style={{ height: `${height}%` }} />
			})}
		</div>
	)
}

export default function EmployeeKPIPage() {
	const { id, rid } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const [payload, setPayload] = useState(null)
	const [form, setForm] = useState(baseForm(currentMonth()))
	const [periodInput, setPeriodInput] = useState(currentMonth())
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')

	const canWrite = user?.role === 'director' || user?.role === 'managing_director' || user?.role === 'department_head'

	const loadKPI = async (period) => {
		setLoading(true)
		setError('')
		try {
			const { data } = await fetchEmployeeKPI(id, rid, period)
			setPayload(data)
			const latestPeriod = data.available_periods?.[data.available_periods.length - 1]
			const fallbackPeriod = period || data.current?.period || latestPeriod || currentMonth()
			const selected = data.current && data.current.period === fallbackPeriod ? data.current : null
			const componentValues = {}
			;((data.department?.components) || []).forEach(component => {
				componentValues[component.key] = selected?.component_values?.[component.key] ?? 0
			})
			setPeriodInput(fallbackPeriod)
			setForm({
				period: fallbackPeriod,
				contract_type: selected?.contract_type || 'ТД',
				lateness_minutes: selected?.lateness_minutes ?? 0,
				vacation: selected?.vacation || '',
				sick_leave_days: selected?.sick_leave_days ?? 0,
				training: selected?.training || '',
				overall_rating: selected?.overall_rating ?? 0,
				component_values: componentValues,
			})
		} catch (e) {
			if (e.response?.status === 403) {
				navigate('/dashboard')
				return
			}
			setError(e.response?.data?.error || 'Ошибка загрузки KPI')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadKPI()
	}, [id, rid])

	const history = payload?.history || []
	const componentDefs = payload?.department?.components || []
	const currentIndex = history.findIndex(item => item.period === form.period)
	const currentHistory = currentIndex >= 0 ? history[currentIndex] : null
	const previousHistory = currentIndex > 0 ? history[currentIndex - 1] : null
	const overallDelta = currentHistory && previousHistory ? currentHistory.overall_rating - previousHistory.overall_rating : 0

	const trendData = useMemo(() => ({
		overall: history.map(item => item.overall_rating),
		components: Object.fromEntries(componentDefs.map(component => [component.key, history.map(item => item.component_values?.[component.key] || 0)])),
	}), [history, componentDefs])

	const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
	const setComponentField = (key, value) => setForm(prev => ({
		...prev,
		component_values: { ...prev.component_values, [key]: value === '' ? 0 : Number(value) },
	}))

	const handleSave = async (e) => {
		e.preventDefault()
		setSaving(true)
		setError('')
		try {
			await saveEmployeeKPI(id, rid, form)
			await loadKPI(form.period)
		} catch (e) {
			setError(e.response?.data?.error || 'Ошибка сохранения KPI')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return <div className="p-6 flex items-center justify-center h-64"><span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
	}

	if (!payload) {
		return (
			<div className="p-6 max-w-2xl mx-auto text-center space-y-3">
				<p style={{ color: 'var(--text)' }} className="font-medium">Не удалось открыть KPI</p>
				<p style={{ color: 'var(--muted)' }}>
					{error || 'KPI не найден'}
				</p>
			</div>
		)
	}

	const employee = payload.employee
	const overallRating = Number(form.overall_rating || 0)
	const ratingColor = overallRating >= 80 ? 'text-emerald-400' : overallRating >= 60 ? 'text-amber-400' : 'text-red-400'

	return (
		<div className="p-6 max-w-6xl mx-auto">
			<div className="flex items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<button onClick={() => navigate(`/departments/${id}/records/${rid}`)} className="p-1.5 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
							KPI: {employee.last_name} {employee.first_name} {employee.middle_name}
						</h1>
						<p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{payload.department?.title || 'KPI отдела'}</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="card px-4 py-3 flex items-center gap-3">
						<BarChart3 size={18} className={ratingColor} />
						<div>
							<p className={`text-xl font-bold font-display ${ratingColor}`}>{overallRating.toFixed(1)}</p>
							<p className="text-xs" style={{ color: 'var(--muted)' }}>Общий рейтинг</p>
							<p className={`text-xs mt-1 flex items-center gap-1 ${overallDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
								{overallDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
								<span>{overallDelta >= 0 ? '+' : ''}{overallDelta.toFixed(1)} к прошлому периоду</span>
							</p>
						</div>
					</div>
					<div className="card px-4 py-3">
						<p className="text-xs" style={{ color: 'var(--muted)' }}>Период</p>
						<div className="flex items-center gap-2 mt-1">
							<Calendar size={14} style={{ color: 'var(--muted)' }} />
							<span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{form.period}</span>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
				<div className="space-y-6">
					<div className="card p-4">
						<div className="flex items-center justify-between gap-3 mb-4">
							<div>
								<h2 className="font-semibold font-display" style={{ color: 'var(--text)' }}>История рейтинга</h2>
								<p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Динамика по периодам</p>
							</div>
							<div className="flex items-center gap-2">
								<input type="month" className="input-field w-40" value={periodInput} onChange={e => setPeriodInput(e.target.value)} />
								<button type="button" onClick={() => loadKPI(periodInput)} className="btn-ghost text-sm" style={{ color: 'var(--accent)' }}>Загрузить</button>
							</div>
						</div>
						{history.length === 0 ? (
							<p className="text-sm py-10 text-center" style={{ color: 'var(--muted)' }}>Пока нет сохранённых KPI-периодов</p>
						) : (
							<div className="space-y-3">
								<SparkBars values={trendData.overall} />
								<div className="flex flex-wrap gap-2">
									{history.map(item => (
										<span key={item.period} className={`text-xs px-2 py-1 rounded-full ${item.period === form.period ? 'bg-cyan-500/15 text-cyan-300' : 'bg-white/5 text-slate-300'}`}>
											{item.period}: {Number(item.overall_rating || 0).toFixed(1)}
										</span>
									))}
								</div>
							</div>
						)}
					</div>

					<div className="card p-4">
						<h2 className="font-semibold font-display mb-4" style={{ color: 'var(--text)' }}>Динамика компонентов</h2>
						{componentDefs.length === 0 ? (
							<p className="text-sm" style={{ color: 'var(--muted)' }}>Для этого отдела пока не задано отдельных компонентов.</p>
						) : (
							<div className="space-y-4">
								{componentDefs.map(component => {
									const values = trendData.components[component.key] || []
									const currentValue = currentHistory?.component_values?.[component.key] ?? form.component_values?.[component.key] ?? 0
									const previousValue = previousHistory?.component_values?.[component.key] ?? 0
									const delta = currentValue - previousValue
									const deltaClass = delta >= 0 ? 'text-emerald-400' : 'text-red-400'
									const deltaIcon = delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />
									return (
										<div key={component.key} className="rounded-xl border border-white/5 p-3" style={{ background: 'var(--bg)' }}>
											<div className="flex items-start justify-between gap-3 mb-2">
												<div>
													<p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{component.label}</p>
													{component.description && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{component.description}</p>}
												</div>
												<div className={`text-xs flex items-center gap-1 ${deltaClass}`}>
													{deltaIcon}
													<span>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</span>
												</div>
											</div>
											<SparkBars values={values} />
										</div>
									)
								})}
							</div>
						)}
					</div>
				</div>

				<div className="space-y-6">
					<div className="card p-4">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="font-semibold font-display" style={{ color: 'var(--text)' }}>KPI за период</h2>
								<p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Основные поля и значения компонентов</p>
							</div>
							{currentHistory?.updated_at && <span className="text-xs" style={{ color: 'var(--muted)' }}>Обновлено: {new Date(currentHistory.updated_at).toLocaleString('ru-RU')}</span>}
						</div>

						<form onSubmit={handleSave} className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="label">Период</label>
									<input type="month" className="input-field" value={form.period} onChange={e => setField('period', e.target.value)} disabled={!canWrite} />
								</div>
								<div>
									<label className="label">Тип договора</label>
									<input className="input-field" value={form.contract_type} onChange={e => setField('contract_type', e.target.value)} disabled={!canWrite} />
								</div>
								<div>
									<label className="label">Опоздание, минут</label>
									<input type="number" min="0" className="input-field" value={form.lateness_minutes} onChange={e => setField('lateness_minutes', Number(e.target.value))} disabled={!canWrite} />
								</div>
								<div>
									<label className="label">Больничные, дней</label>
									<input type="number" min="0" className="input-field" value={form.sick_leave_days} onChange={e => setField('sick_leave_days', Number(e.target.value))} disabled={!canWrite} />
								</div>
							</div>
							<div>
								<label className="label">Отпуск</label>
								<input className="input-field" value={form.vacation} onChange={e => setField('vacation', e.target.value)} disabled={!canWrite} />
							</div>
							<div>
								<label className="label">Обучение</label>
								<textarea className="input-field resize-none" rows={3} value={form.training} onChange={e => setField('training', e.target.value)} disabled={!canWrite} />
							</div>
							<div>
								<label className="label">Общий рейтинг</label>
								<input type="number" step="0.1" className="input-field" value={form.overall_rating} onChange={e => setField('overall_rating', Number(e.target.value))} disabled={!canWrite} />
							</div>

							<div className="space-y-3 pt-2">
								<h3 className="text-sm font-semibold font-display" style={{ color: 'var(--text)' }}>Компоненты отдела</h3>
								{componentDefs.map(component => (
									<div key={component.key}>
										<label className="label">{component.label}</label>
										<input
											type="number"
											step="0.1"
											className="input-field"
											value={form.component_values?.[component.key] ?? 0}
											onChange={e => setComponentField(component.key, e.target.value)}
											disabled={!canWrite}
										/>
									</div>
								))}
							</div>

							{error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

							{canWrite && (
								<div className="flex justify-end">
									<button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
										{saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
										{saving ? 'Сохранение...' : 'Сохранить KPI'}
									</button>
								</div>
							)}
						</form>
					</div>
				</div>
			</div>
		</div>
	)
}
