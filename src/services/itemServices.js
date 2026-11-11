import api from './api'
import { buildQueryParams, buildQuery } from './core/httpQuery.js'

export const getItems = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/items${buildQueryParams(search, page, null, filter)}`)
    return response.data
}

export const searchItems = async (search = '', limit = 20) => {
    const response = await api.get(`/api/v1/item/search${buildQuery({ search, limit })}`)
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
