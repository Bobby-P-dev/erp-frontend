import api from './api'

export const getPositions = async (search = '', page = 1) => {
    const response = await api.get(`/api/v1/position/get-all?search=${search}&page=${page}`)
    return response.data
}

export const searchPositions = async (search = '') => {
    const response = await api.get(`/api/v1/position/search?search=${search}`)
    return response.data
}

export const createPosition = async (data) => {
    const response = await api.post('/api/v1/position/store', data)
    return response.data
}

export const getPosition = async (id) => {
    const response = await api.get(`/api/v1/position/${id}/show`)
    return response.data
}

export const updatePosition = async (id, data) => {
    const response = await api.patch(`/api/v1/position/${id}/update`, data)
    return response.data
}

export const deletePosition = async (id) => {
    const response = await api.delete(`/api/v1/position/${id}/delete`)
    return response.data
}
