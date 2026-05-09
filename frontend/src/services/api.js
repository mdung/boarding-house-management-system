import axios from 'axios'
import { getCached, setCache } from './apiCache'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Cache GET responses
api.interceptors.request.use((config) => {
  if (config.method === 'get' && !config.skipCache) {
    const url = config.baseURL + config.url + (config.params ? JSON.stringify(config.params) : '')
    const cached = getCached(url)
    if (cached) {
      config.adapter = () => Promise.resolve({
        data: cached,
        status: 200,
        statusText: 'OK (cached)',
        headers: {},
        config,
      })
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && response.status === 200 && !response.config.skipCache) {
      const url = response.config.baseURL + response.config.url + (response.config.params ? JSON.stringify(response.config.params) : '')
      setCache(url, response.data)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

