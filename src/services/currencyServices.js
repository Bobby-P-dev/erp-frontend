import api from './api.js'

export const getCurrencies = async (search = '', page = 1, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    for (const key in filter) {
        if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params.append(key, filter[key])
        }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/currencies/get-all${queryString}`)
    return response.data
}

export const searchCurrencies = async (search = '', limit = 50) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (limit) params.append('limit', limit)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/currencies/search${queryString}`)
    return response.data
}

export const getBaseCurrency = async () => {
    const response = await api.get('/api/v1/currencies/base')
    return response.data
}

export const showCurrency = async (id) => {
    const response = await api.get(`/api/v1/currencies/${id}/show`)
    return response.data
}

export const createCurrency = async (data) => {
    const response = await api.post('/api/v1/currencies/store', data)
    return response.data
}

export const updateCurrency = async (id, data) => {
    const response = await api.patch(`/api/v1/currencies/${id}/update`, data)
    return response.data
}

export const deleteCurrency = async (id) => {
    const response = await api.delete(`/api/v1/currencies/${id}/delete`)
    return response.data
}
