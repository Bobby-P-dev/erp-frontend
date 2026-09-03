import api from './api'

export const getDivisions = async (search = '', page = 1) => {
    const response = await api.get(`/api/v1/division/get-all?search=${search}&page=${page}`)
    return response.data
}

export const searchDivisions = async (search = '') => {
    const response = await api.get(`/api/v1/division/search?search=${search}`)
    return response.data
}

export const createDivision = async (data) => {
    const response = await api.post('/api/v1/division/store', data)
    return response.data
}

export const showDivision = async (id) => {
    const response = await api.get(`/api/v1/division/${id}/show`)
    return response.data
}

export const updateDivision = async (id, data) => {
    const response = await api.patch(`/api/v1/division/${id}/update`, data)
    return response.data
}

export const deleteDivision = async (id) => {
    const response = await api.delete(`/api/v1/division/${id}/delete`)
    return response.data
}
