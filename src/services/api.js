import axios from 'axios'
import { startApiLoading, finishApiLoading } from '../composables/useAppLoader.js'

const api = axios.create({
    baseURL: 'http://erp-backend.test',
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use(
    (config) => {
        if (config && !config.skipGlobalLoader) {
            config.__trackedByGlobalLoader = true
            startApiLoading()
        }
        return config
    },
    (error) => {
        if (error?.config?.__trackedByGlobalLoader) {
            error.config.__trackedByGlobalLoader = false
            finishApiLoading()
        }
        return Promise.reject(error)
    }
)

api.interceptors.response.use(
    (response) => {
        if (response?.config?.__trackedByGlobalLoader) {
            response.config.__trackedByGlobalLoader = false
            finishApiLoading()
        }
        return response
    },
    (error) => {
        if (error?.config?.__trackedByGlobalLoader) {
            error.config.__trackedByGlobalLoader = false
            finishApiLoading()
        }
        return Promise.reject(error)
    }
)

export default api
