import api from './api'

export const getAccountingSubcategories = async (search = '', page = 1, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)

    if (filter.is_active !== undefined && filter.is_active !== null && filter.is_active !== '') {
        params.append('is_active', filter.is_active)
    }

    if (filter.accounting_category_id) {
        params.append('accounting_category_id', filter.accounting_category_id)
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/accounting-subcategory/get-all${queryString}`)
    return response.data
}

export const searchAccountingSubcategories = async (search = '', categoryId = '') => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (categoryId) params.append('accounting_category_id', categoryId)

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/accounting-subcategory/search${queryString}`)
    return response.data
}

export const createAccountingSubcategory = async (data) => {
    const response = await api.post('/api/v1/accounting-subcategory/store', data)
    return response.data
}

export const showAccountingSubcategory = async (id) => {
    const response = await api.get(`/api/v1/accounting-subcategory/${id}/show`)
    return response.data
}

export const updateAccountingSubcategory = async (id, data) => {
    const response = await api.patch(`/api/v1/accounting-subcategory/${id}/update`, data)
    return response.data
}

export const deleteAccountingSubcategory = async (id) => {
    const response = await api.delete(`/api/v1/accounting-subcategory/${id}/delete`)
    return response.data
}
