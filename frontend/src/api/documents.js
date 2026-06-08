import api from './client'

// Загрузить документ
export const uploadDocument = async (deptId, recordId, file, docType = 'other', docName = '') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('doc_type', docType)
  formData.append('name', docName || file.name)
  formData.append('description', '')

  const response = await api.post(
    `/departments/${deptId}/records/${recordId}/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  )
  return response.data
}

// Скачать документ
export const downloadDocument = (deptId, recordId, docId) => {
  return `/api/departments/${deptId}/records/${recordId}/download/${docId}`
}

// Удалить документ
export const deleteDocument = async (deptId, recordId, docId) => {
  const response = await api.delete(
    `/departments/${deptId}/records/${recordId}/documents/${docId}`
  )
  return response.data
}
