import { useState } from 'react'
import { Upload, File, Download, Trash2, X } from 'lucide-react'
import { uploadDocument, deleteDocument, downloadDocument } from '../api/documents'

export default function DocumentsPanel({ deptId, recordId, documents = [], onUpdate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('other')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const docTypes = [
    { value: 'contract', label: 'Контракт' },
    { value: 'passport', label: 'Паспорт' },
    { value: 'diploma', label: 'Диплом' },
    { value: 'certificate', label: 'Сертификат' },
    { value: 'other', label: 'Другое' }
  ]

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadDocument(deptId, recordId, file, docType, docName)
      onUpdate()
      setFile(null)
      setDocName('')
      setDocType('other')
      setIsOpen(false)
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка загрузки')
    }
    setUploading(false)
  }

  const handleDelete = async (docId) => {
    if (!confirm('Удалить документ?')) return

    setDeleting(docId)
    try {
      await deleteDocument(deptId, recordId, docId)
      onUpdate()
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка удаления')
    }
    setDeleting(null)
  }

  const handleDownload = async (doc) => {
    try {
      const response = await downloadDocument(deptId, recordId, doc.id)
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const disposition = response.headers['content-disposition'] || ''
      const fileNameMatch = disposition.match(/filename\*?=([^;]+)/i)
      let fileName = doc.name || 'download'
      if (fileNameMatch) {
        fileName = fileNameMatch[1].trim().replace(/\"/g, '')
      }
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert(e.response?.data?.error || 'Ошибка скачивания. Пожалуйста, войдите заново и повторите.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Документы ({documents.length})</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn-primary text-xs flex items-center gap-1"
        >
          <Upload size={14} /> Загрузить
        </button>
      </div>

      {/* Форма загрузки */}
      {isOpen && (
        <div className="card p-4 space-y-3 bg-slate-900/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Загрузить файл</span>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded">
              <X size={16} />
            </button>
          </div>

          {/* Выбор файла */}
          <div className="relative">
            <input
              type="file"
              id="file-input"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="hidden"
            />
            <label
              htmlFor="file-input"
              className="block p-3 border-2 border-dashed border-cyan-500/30 rounded-lg cursor-pointer hover:border-cyan-500/50 text-center"
              style={{ color: 'var(--muted)' }}
            >
              {file ? (
                <span className="text-sm">{file.name}</span>
              ) : (
                <span className="text-sm flex flex-col items-center gap-1">
                  <Upload size={16} />
                  Выберите файл
                </span>
              )}
            </label>
          </div>

          {/* Тип документа */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Тип документа</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="input-field w-full text-sm"
            >
              {docTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Название */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Название (опционально)</label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Например: Контракт 2024"
              className="input-field w-full text-sm"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-primary flex-1 text-sm disabled:opacity-50"
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-ghost flex-1 text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список документов */}
      {documents.length === 0 ? (
        <div
          className="card text-center py-6"
          style={{ color: 'var(--muted)' }}
        >
          <File size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Нет документов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="card p-3 flex items-center gap-3 hover:border-cyan-500/30 transition-all">
              <File size={18} className="text-cyan-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                  {doc.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {doc.doc_type} • {(doc.file_size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 rounded hover:bg-cyan-500/15 transition-all"
                  title="Скачать"
                >
                  <Download size={16} className="text-cyan-400" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                  className="p-1.5 rounded hover:bg-red-500/15 transition-all disabled:opacity-50"
                  title="Удалить"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
