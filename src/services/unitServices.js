import api from './api.js'
import { buildQueryParams, buildQuery } from './core/httpQuery.js'

export const getUnits = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/units${buildQueryParams(search, page, null, filter)}`)
    return response.data
}

export const searchUnits = async (search = '', limit = 50) => {
    const response = await api.get(`/api/v1/unit/search${buildQuery({ search, limit })}`)
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
