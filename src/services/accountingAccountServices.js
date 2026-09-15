import api from './api'

export const getAccountingAccounts = async (search = '', page = 1, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)

    if (filter.is_active !== undefined && filter.is_active !== null && filter.is_active !== '') {
        params.append('is_active', filter.is_active)
    }

    if (filter.accounting_subcategory_id) {
        params.append('accounting_subcategory_id', filter.accounting_subcategory_id)
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/accounting-account/get-all${queryString}`)
    return response.data
}

export const searchAccountingAccounts = async (search = '', subcategoryId = '') => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (subcategoryId) params.append('accounting_subcategory_id', subcategoryId)

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/accounting-account/search${queryString}`)
    return response.data
}

export const createAccountingAccount = async (data) => {
    const response = await api.post('/api/v1/accounting-account/store', data)
    return response.data
}

export const showAccountingAccount = async (id) => {
    const response = await api.get(`/api/v1/accounting-account/${id}/show`)
    return response.data
}

export const updateAccountingAccount = async (id, data) => {
    const response = await api.patch(`/api/v1/accounting-account/${id}/update`, data)
    return response.data
}

export const deleteAccountingAccount = async (id) => {
    const response = await api.delete(`/api/v1/accounting-account/${id}/delete`)
    return response.data
}
