import api from './api'

export const createCompanies = async (data) => {
    const response = await api.post('/api/v1/companies/store', data)

    return response.data
}

export const getCompanies = async (search = '', page = 1) => {
    const response = await api.get(`/api/v1/companies/get-all?search=${search}&page=${page}`)

    return response.data
}

export const updateCompanies = async (id, data) => {
    const response = await api.patch(`/api/v1/companies/${id}/update`, data)

    return response.data
}

export const searchCompanies = async (search = '') => {
    const response = await api.get(`/api/v1/companies/search?search=${search}`)

    return response.data
}

export const deleteCompanies = async (id) => {
    const response = await api.delete(`/api/v1/companies/${id}/delete`)

    return response.data
}