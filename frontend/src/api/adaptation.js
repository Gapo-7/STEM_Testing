import api from './client'

export const fetchAdaptationDepartments = () => api.get('/adaptation/departments')
export const fetchAdaptationCandidates = (deptId, status) => api.get(`/adaptation/${deptId}/candidates`, {
  params: status ? { status } : {},
})
export const createAdaptationCandidate = (deptId, payload) => api.post(`/adaptation/${deptId}/candidates`, payload)
export const fetchAdaptationCandidate = id => api.get(`/adaptation/candidates/${id}`)
export const updateAdaptationCandidate = (id, payload) => api.put(`/adaptation/candidates/${id}`, payload)
export const addAdaptationCriterion = (id, payload) => api.post(`/adaptation/candidates/${id}/criteria`, payload)
export const updateAdaptationCriterion = (id, criterionId, payload) => api.put(`/adaptation/candidates/${id}/criteria/${criterionId}`, payload)
export const deleteAdaptationCriterion = (id, criterionId) => api.delete(`/adaptation/candidates/${id}/criteria/${criterionId}`)
export const promoteAdaptationCandidate = id => api.post(`/adaptation/candidates/${id}/promote`)
