import axios from 'axios'

const api = axios.create({
    baseURL: 'http://erp-backend.test',
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
})

export default api
