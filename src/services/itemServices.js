import api from './api'

export const getItems = async (search = '', page = 1, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    for (const key in filter) {
        if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params.append(key, filter[key])
        }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/items${queryString}`)
    return response.data
}

export const searchItems = async (search = '', limit = 20) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (limit) params.append('limit', limit)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/item/search${queryString}`)
    return response.data
}

export const showItem = async (id) => {
    const response = await api.get(`/api/v1/items/${id}`)
    return response.data
}

export const createItem = async (data) => {
    const response = await api.post('/api/v1/items', data)
    return response.data
}

export const updateItem = async (id, data) => {
    const response = await api.patch(`/api/v1/items/${id}`, data)
    return response.data
}

export const deleteItem = async (id) => {
    const response = await api.delete(`/api/v1/items/${id}`)
    return response.data
}
