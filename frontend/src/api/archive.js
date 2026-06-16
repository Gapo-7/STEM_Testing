import api from './client'

export const fetchFailedArchive = departmentId => api.get('/archive/failed', {
  params: departmentId ? { department_id: departmentId } : {},
})
export const fetchFiredArchive = departmentId => api.get('/archive/fired', {
  params: departmentId ? { department_id: departmentId } : {},
})
export const createFiredEmployee = payload => api.post('/archive/fired', payload)
export const fetchFiredEmployee = id => api.get(`/archive/fired/${id}`)
