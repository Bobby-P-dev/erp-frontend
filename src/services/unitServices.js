import api from './api'

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
