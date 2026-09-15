import api from './api'

export const getAccountingCategories = async (search = '', page = 1, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)

    if (filter.is_active !== undefined && filter.is_active !== null && filter.is_active !== '') {
        params.append('is_active', filter.is_active)
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/accounting-category/get-all${queryString}`)
    return response.data
}

export const searchAccountingCategories = async (search = '') => {
    const response = await api.get(`/api/v1/accounting-category/search?search=${search}`)
    return response.data
}

export const createAccountingCategory = async (data) => {
    const response = await api.post('/api/v1/accounting-category/store', data)
    return response.data
}

export const showAccountingCategory = async (id) => {
    const response = await api.get(`/api/v1/accounting-category/${id}/show`)
    return response.data
}

export const updateAccountingCategory = async (id, data) => {
    const response = await api.patch(`/api/v1/accounting-category/${id}/update`, data)
    return response.data
}

export const deleteAccountingCategory = async (id) => {
    const response = await api.delete(`/api/v1/accounting-category/${id}/delete`)
    return response.data
}
