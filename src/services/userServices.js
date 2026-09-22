import api from './api.js'

export const getUsers = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    
    for (const [key, value] of Object.entries(filters)) {
        if (value) {
            params.append(`filter[${key}]`, value)
        }
    }
    
    const response = await api.get(`/api/v1/user/get-all?${params.toString()}`)
    return response.data
}

export const syncUserRoles = async (id, roles) => {
    const response = await api.post(`/api/v1/user/${id}/sync-roles`, { roles })
    return response.data
}

export const updateUserPassword = async (id, payload) => {
    const response = await api.patch(`/api/v1/user/${id}/password`, payload)
    return response.data
}

export const searchUsers = async (search = '') => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    try {
        const response = await api.get(`/api/v1/user/search${queryString}`)
        return response.data
    } catch (error) {
        console.warn('[UserService] Backend user search failed, using fallback mock.')
        return {
            message: 'Users retrieved (Fallback)',
            data: [
                { id: 1, name: 'Super Admin', email: 'admin@test.com' },
                { id: 2, name: 'Approver User', email: 'approver@test.com' },
            ]
        }
    }
}

