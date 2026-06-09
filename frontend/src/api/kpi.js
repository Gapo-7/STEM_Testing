import api from './client'

export const fetchEmployeeKPI = (deptId, recordId, period) => {
	return api.get(`/departments/${deptId}/records/${recordId}/kpi`, {
		params: period ? { period } : {},
	})
}

export const saveEmployeeKPI = (deptId, recordId, payload) => {
	return api.put(`/departments/${deptId}/records/${recordId}/kpi`, payload)
}
