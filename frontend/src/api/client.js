import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Добавляем access-токен к каждому запросу
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Автоматически обновляем access-токен при 401
let refreshing = false
let queue = []

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (refreshing) {
        // Ставим запрос в очередь пока идёт обновление токена
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }
      refreshing = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('no refresh token')
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refresh })
        localStorage.setItem('access_token', data.access_token)
        queue.forEach(p => p.resolve(data.access_token))
        queue = []
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        queue.forEach(p => p.reject())
        queue = []
        localStorage.clear()
        window.location.href = '/login'
      } finally {
        refreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api
