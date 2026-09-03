import api from './api'

export const getCsrfCookie = () => {
    return api.get('/sanctum/csrf-cookie')
}

export const login = async (credentials) => {
    await getCsrfCookie()

    const response = await api.post('/api/v1/login', credentials)

    return response.data
}

export const getCurrentUser = async () => {
    const response = await api.get('/api/v1/user/me')

    return response.data
}

export const getProfile = async () => {
    const response = await api.get('/api/v1/employee/profile')

    return response.data
}

export const logout = async () => {
    const response = await api.post('/api/v1/logout')

    return response.data
}


export const register = async (userData) => {
    await getCsrfCookie()

    const response = await api.post('/api/v1/register', userData)

    return response.data
}
