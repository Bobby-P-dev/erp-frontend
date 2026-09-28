import api from './api.js'

export const getUnits = async (search = '', page = 1, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    for (const key in filter) {
        if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params.append(key, filter[key])
        }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/units${queryString}`)
    return response.data
}

export const searchUnits = async (search = '', limit = 50) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (limit) params.append('limit', limit)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/unit/search${queryString}`)
    return response.data
}

export const showUnit = async (id) => {
    const response = await api.get(`/api/v1/units/${id}`)
    return response.data
}

export const createUnit = async (data) => {
    const response = await api.post('/api/v1/units', data)
    return response.data
}

export const updateUnit = async (id, data) => {
    const response = await api.patch(`/api/v1/units/${id}`, data)
    return response.data
}

export const deleteUnit = async (id) => {
    const response = await api.delete(`/api/v1/units/${id}`)
    return response.data
}
