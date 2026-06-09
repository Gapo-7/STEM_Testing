import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, Calendar, Save, TrendingDown, TrendingUp, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
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
	tasks: [],
})

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

	// Новые стейты для кастомного фильтра истории и раскрытия деталей
	const [historyStart, setHistoryStart] = useState('')
	const [historyEnd, setHistoryEnd] = useState('')
	const [expandedPeriod, setExpandedPeriod] = useState(null)

	const canWrite = user?.role === 'director' || user?.role === 'managing_director' || user?.role === 'department_head'
	const componentDefs = payload?.department?.components || []

	const loadKPI = async (period) => {
		setLoading(true)
		setError('')
		try {
			const { data } = await fetchEmployeeKPI(id, rid, period)
			setPayload(data)
			const latestPeriod = data.available_periods?.[data.available_periods.length - 1]
			const fallbackPeriod = period || data.current?.period || latestPeriod || currentMonth()
			const selected = data.current && data.current.period === fallbackPeriod ? data.current : null

			const currentComponentDefs = data.department?.components || []

			const loadedTasks = (selected?.tasks || []).map(task => {
				const metrics = {}
				currentComponentDefs.forEach(c => {
					const existing = task.metrics?.[c.key] || {}
					metrics[c.key] = {
						plan: existing.plan ?? 0,
						fact: existing.fact ?? 0
					}
				})
				return { id: task.id || crypto.randomUUID(), title: task.title || '', metrics }
			})

			// Задаем дефолтные диапазоны для фильтра истории, если они еще не стоят
			if (data.history && data.history.length > 0) {
				const sorted = [...data.history].sort((a, b) => a.period.localeCompare(b.period))
				if (!historyStart) setHistoryStart(sorted[0].period)
				if (!historyEnd) setHistoryEnd(sorted[sorted.length - 1].period)
			}

			setPeriodInput(fallbackPeriod)
			setForm({
				period: fallbackPeriod,
				contract_type: selected?.contract_type || 'ТД',
				lateness_minutes: selected?.lateness_minutes ?? 0,
				vacation: selected?.vacation || '',
				sick_leave_days: selected?.sick_leave_days ?? 0,
				training: selected?.training || '',
				overall_rating: selected?.overall_rating ?? 0,
				tasks: loadedTasks,
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

	// Расчет текущего рейтинга
	const computedRating = useMemo(() => {
		let baseScore = 100
		const tasks = form.tasks || []

		if (tasks.length > 0) {
			let totalTasksPercentage = 0
			let validTasksCount = 0

			tasks.forEach(task => {
				const compKeys = Object.keys(task.metrics || {})
				if (compKeys.length > 0) {
					let taskTotalPercentage = 0
					let validMetricsCount = 0

					compKeys.forEach(key => {
						const { plan, fact } = task.metrics[key]
						if (plan > 0) {
							taskTotalPercentage += (fact / plan) * 100
							validMetricsCount++
						} else if (fact > 0 && plan === 0) {
							taskTotalPercentage += 100
							validMetricsCount++
						}
					})

					if (validMetricsCount > 0) {
						totalTasksPercentage += (taskTotalPercentage / validMetricsCount)
						validTasksCount++
					}
				}
			})

			if (validTasksCount > 0) {
				baseScore = totalTasksPercentage / validTasksCount
			}
		}

		const latenessPenalty = (Number(form.lateness_minutes) || 0) * 0.5
		const finalRating = Math.max(0, baseScore - latenessPenalty)
		return Math.min(100, finalRating)
	}, [form.tasks, form.lateness_minutes])

	const history = payload?.history || []
	const currentIndex = history.findIndex(item => item.period === form.period)
	const currentHistory = currentIndex >= 0 ? history[currentIndex] : null
	const previousHistory = currentIndex > 0 ? history[currentIndex - 1] : null

	const currentDisplayRating = currentHistory?.period === form.period ? computedRating : (currentHistory?.overall_rating ?? computedRating)
	const overallDelta = previousHistory ? currentDisplayRating - previousHistory.overall_rating : 0

	// Динамический расчет среднего KPI по выбранному пользователем диапазону дат
	const customRangeAvg = useMemo(() => {
		if (!history || history.length === 0) return 0
		const filtered = history.filter(item => {
			const startOk = historyStart ? item.period >= historyStart : true
			const endOk = historyEnd ? item.period <= historyEnd : true
			return startOk && endOk
		})
		if (filtered.length === 0) return 0
		const sum = filtered.reduce((acc, item) => acc + (Number(item.overall_rating) || 0), 0)
		return sum / filtered.length
	}, [history, historyStart, historyEnd])

	const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

	const addTask = () => {
		const newTask = { id: crypto.randomUUID(), title: '', metrics: {} }
		componentDefs.forEach(c => {
			newTask.metrics[c.key] = { plan: 0, fact: 0 }
		})
		setForm(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }))
	}

	const removeTask = (id) => {
		setForm(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }))
	}

	const setTaskTitle = (id, title) => {
		setForm(prev => ({
			...prev,
			tasks: prev.tasks.map(t => t.id === id ? { ...t, title } : t)
		}))
	}

	const setTaskMetric = (taskId, key, subField, value) => {
		setForm(prev => ({
			...prev,
			tasks: prev.tasks.map(t => t.id === taskId ? {
				...t,
				metrics: {
					...t.metrics,
					[key]: {
						...t.metrics[key],
						[subField]: value === '' ? 0 : Number(value)
					}
				}
			} : t)
		}))
	}

	const handleSave = async (e) => {
		e.preventDefault()
		setSaving(true)
		setError('')
		try {
			const payloadToSave = { ...form, overall_rating: computedRating }
			await saveEmployeeKPI(id, rid, payloadToSave)
			await loadKPI(form.period)
		} catch (e) {
			setError(e.response?.data?.error || 'Ошибка сохранения KPI')
		} finally {
			setSaving(false)
		}
	}

	const employee = payload?.employee
	const overallRating = computedRating
	const ratingColor = overallRating >= 80 ? 'text-emerald-400' : overallRating >= 60 ? 'text-amber-400' : 'text-red-400'

	return (
		<div className="p-6 max-w-6xl mx-auto">
			{/* Верхняя панель */}
			<div className="flex items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<button onClick={() => navigate(`/departments/${id}/records/${rid}`)} className="p-1.5 rounded-lg btn-ghost" style={{ color: 'var(--muted)' }}>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text)' }}>
							KPI: {employee?.last_name} {employee?.first_name} {employee?.middle_name}
						</h1>
						<p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{payload?.department?.title || 'KPI отдела'}</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="card px-4 py-3 flex items-center gap-3">
						<BarChart3 size={18} className={ratingColor} />
						<div>
							<p className={`text-xl font-bold font-display ${ratingColor}`}>{overallRating.toFixed(1)}%</p>
							<p className="text-xs" style={{ color: 'var(--muted)' }}>Общий рейтинг</p>
							<p className={`text-xs mt-1 flex items-center gap-1 ${overallDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
								{overallDelta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
								<span>{overallDelta >= 0 ? '+' : ''}{overallDelta.toFixed(1)}% к прошлому периоду</span>
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.8fr] gap-6">
				{/* Левая колонка: Кадры и Детальная история */}
				<div className="space-y-6">
					<div className="card p-4">
						<h2 className="font-semibold font-display mb-4" style={{ color: 'var(--text)' }}>Базовые показатели</h2>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="label">Период</label>
								<input type="month" className="input-field" value={form.period} onChange={e => setField('period', e.target.value)} disabled={!canWrite} />
							</div>
							<div>
								<label className="label">Тип договора</label>
								<input className="input-field" value={form.contract_type} onChange={e => setField('contract_type', e.target.value)} disabled={!canWrite} />
							</div>
							<div>
								<label className="label">Опоздание, мин</label>
								<input type="number" min="0" className="input-field border-amber-500/30" value={form.lateness_minutes} onChange={e => setField('lateness_minutes', Number(e.target.value))} disabled={!canWrite} />
							</div>
							<div>
								<label className="label">Больничные, дни</label>
								<input type="number" min="0" className="input-field" value={form.sick_leave_days} onChange={e => setField('sick_leave_days', Number(e.target.value))} disabled={!canWrite} />
							</div>
							<div className="col-span-2">
								<label className="label">Отпуск</label>
								<input className="input-field" value={form.vacation} onChange={e => setField('vacation', e.target.value)} disabled={!canWrite} />
							</div>
							<div className="col-span-2">
								<label className="label">Обучение</label>
								<textarea className="input-field resize-none" rows={2} value={form.training} onChange={e => setField('training', e.target.value)} disabled={!canWrite} />
							</div>
						</div>
					</div>

					{/* ПОЛНОСТЬЮ ПЕРЕРАБОТАННАЯ ИСТОРИЯ */}
					<div className="card p-4 space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="font-semibold font-display" style={{ color: 'var(--text)' }}>Аналитика истории</h2>
							<div className="flex items-center gap-1">
								<input type="month" className="input-field w-24 px-2 py-0.5 text-xs" value={periodInput} onChange={e => setPeriodInput(e.target.value)} />
								<button type="button" onClick={() => loadKPI(periodInput)} className="btn-ghost text-xs px-2" style={{ color: 'var(--accent)' }}>Перейти</button>
							</div>
						</div>

						{/* Блок ручного выбора диапазона дат */}
						<div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
							<p className="text-xs font-medium text-slate-300">Выбор периода расчета:</p>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<span className="text-[10px] text-slate-400 block mb-1">С месяца:</span>
									<input type="month" className="input-field text-xs py-1" value={historyStart} onChange={e => setHistoryStart(e.target.value)} />
								</div>
								<div>
									<span className="text-[10px] text-slate-400 block mb-1">По месяц:</span>
									<input type="month" className="input-field text-xs py-1" value={historyEnd} onChange={e => setHistoryEnd(e.target.value)} />
								</div>
							</div>
							<div className="border-t border-white/5 pt-2 flex justify-between items-center">
								<span className="text-xs text-slate-400">Средний KPI за этот срок:</span>
								<span className="text-sm font-bold text-cyan-400">{customRangeAvg.toFixed(1)}%</span>
							</div>
						</div>

						{/* Интерактивный список месяцев с раскрытием задач */}
						<div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
							<p className="text-xs font-semibold text-slate-400">Все сохраненные месяцы:</p>
							{history.length === 0 ? (
								<p className="text-xs text-center text-slate-500 py-4">История пуста</p>
							) : (
								history.map(item => {
									const isExpanded = expandedPeriod === item.period
									return (
										<div key={item.period} className="border border-white/5 rounded-xl bg-white/5 overflow-hidden">
											<button
												type="button"
												onClick={() => setExpandedPeriod(isExpanded ? null : item.period)}
												className="w-full flex justify-between items-center p-3 text-sm hover:bg-white/5 transition-colors"
											>
												<span className="font-medium" style={{ color: 'var(--text)' }}>{item.period}</span>
												<div className="flex items-center gap-2">
													<span className="font-bold text-slate-300">{Number(item.overall_rating || 0).toFixed(1)}%</span>
													{isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
												</div>
											</button>

											{isExpanded && (
												<div className="p-3 bg-black/20 border-t border-white/5 space-y-3 text-xs">
													<div className="text-slate-400 grid grid-cols-2 gap-1 pb-1 border-b border-white/5">
														<span>Опоздания: {item.lateness_minutes || 0} мин</span>
														<span>Больничные: {item.sick_leave_days || 0} дн</span>
													</div>
													{(!item.tasks || item.tasks.length === 0) ? (
														<p className="text-slate-500 italic">Задачи не зафиксированы</p>
													) : (
														<div className="space-y-2">
															{item.tasks.map((t, tIdx) => (
																<div key={t.id || tIdx} className="bg-white/5 p-2 rounded-lg space-y-1">
																	<p className="font-medium text-slate-200">{t.title || 'Без названия'}</p>
																	<div className="grid grid-cols-1 gap-1 pl-2 border-l border-cyan-500/30 text-[11px]">
																		{Object.keys(t.metrics || {}).map(mKey => {
																			const mDef = componentDefs.find(c => c.key === mKey)
																			const mVal = t.metrics[mKey] || { plan: 0, fact: 0 }
																			const mPercent = mVal.plan > 0 ? ((mVal.fact / mVal.plan) * 100).toFixed(1) : (mVal.fact > 0 ? '100.0' : '0.0')
																			return (
																				<div key={mKey} className="flex justify-between text-slate-400">
																					<span>{mDef?.label || mKey}:</span>
																					<span>Пл: {mVal.plan} / Фк: {mVal.fact} ({mPercent}%)</span>
																				</div>
																			)
																		})}
																	</div>
																</div>
															))}
														</div>
													)}
												</div>
											)}
										</div>
									)
								})
							)}
						</div>
					</div>
				</div>

				{/* Правая колонка: Текущие Динамические задачи */}
				<div className="space-y-6">
					<div className="card p-4">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="font-semibold font-display" style={{ color: 'var(--text)' }}>Проекты и Задачи текущего месяца</h2>
								<p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Показатели рассчитываются для каждой задачи отдельно</p>
							</div>
							{canWrite && (
								<button type="button" onClick={addTask} className="btn-ghost flex items-center gap-2 text-sm bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg">
									<Plus size={16} /> Добавить задачу
								</button>
							)}
						</div>

						<form onSubmit={handleSave} className="space-y-6">
							{form.tasks.length === 0 ? (
								<div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
									<p className="text-sm" style={{ color: 'var(--muted)' }}>Нет добавленных задач в этом месяце</p>
								</div>
							) : (
								<div className="space-y-4">
									{form.tasks.map((task, index) => {
										let taskTotal = 0
										let taskCount = 0
										Object.keys(task.metrics).forEach(k => {
											const { plan, fact } = task.metrics[k]
											if (plan > 0) { taskTotal += (fact / plan) * 100; taskCount++ }
											else if (fact > 0 && plan === 0) { taskTotal += 100; taskCount++ }
										})
										const taskPercent = taskCount > 0 ? (taskTotal / taskCount) : 0

										return (
											<div key={task.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
												<div className="flex items-start justify-between gap-4">
													<div className="flex-1">
														<label className="text-xs text-slate-400 mb-1 block">Название задачи {index + 1}</label>
														<input
															type="text"
															placeholder="Например: Разработка дизайна мобильного приложения"
															className="input-field font-medium"
															value={task.title}
															onChange={e => setTaskTitle(task.id, e.target.value)}
															disabled={!canWrite}
														/>
													</div>
													<div className="flex flex-col items-end gap-2">
														{canWrite && (
															<button type="button" onClick={() => removeTask(task.id)} className="text-red-400 hover:text-red-300 p-1">
																<Trash2 size={16} />
															</button>
														)}
														<span className="text-xs font-bold bg-white/10 px-2 py-1 rounded">Итог: {taskPercent.toFixed(1)}%</span>
													</div>
												</div>

												{componentDefs.length > 0 && (
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
														{componentDefs.map(component => {
															const vals = task.metrics[component.key] || { plan: 0, fact: 0 }
															return (
																<div key={component.key} className="space-y-1">
																	<label className="text-xs font-medium" style={{ color: 'var(--text)' }}>{component.label}</label>
																	<div className="flex items-center gap-2">
																		<div className="flex-1 flex items-center border border-white/10 rounded-lg overflow-hidden bg-[var(--bg)]">
																			<span className="text-[10px] text-slate-400 px-2 uppercase w-10 text-center border-r border-white/10">План</span>
																			<input type="number" step="0.1" className="w-full bg-transparent text-sm px-2 py-1.5 focus:outline-none" value={vals.plan} onChange={e => setTaskMetric(task.id, component.key, 'plan', e.target.value)} disabled={!canWrite} />
																		</div>
																		<div className="flex-1 flex items-center border border-white/10 rounded-lg overflow-hidden bg-[var(--bg)]">
																			<span className="text-[10px] text-slate-400 px-2 uppercase w-10 text-center border-r border-white/10">Факт</span>
																			<input type="number" step="0.1" className="w-full bg-transparent text-sm px-2 py-1.5 focus:outline-none" value={vals.fact} onChange={e => setTaskMetric(task.id, component.key, 'fact', e.target.value)} disabled={!canWrite} />
																		</div>
																	</div>
																</div>
															)
														})}
													</div>
												)}
											</div>
										)
									})}
								</div>
							)}

							{/* Футер формы сохранения */}
							<div className="flex items-center justify-between pt-4 border-t border-white/10 mt-6">
								<div className="flex items-center gap-3">
									<span className="text-sm text-slate-400">Текущий месяц с учетом штрафов:</span>
									<span className={`text-2xl font-bold ${ratingColor}`}>{overallRating.toFixed(1)}%</span>
								</div>
								{canWrite && (
									<button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-6">
										{saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
										{saving ? 'Сохранение...' : 'Сохранить всё'}
									</button>
								)}
							</div>

							{error && <p className="text-red-400 text-sm mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
						</form>
					</div>
				</div>
			</div>
		</div>
	)
}