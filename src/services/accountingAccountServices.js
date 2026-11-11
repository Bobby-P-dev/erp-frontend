import api from './api'
import { buildQueryParams, buildQuery } from './core/httpQuery.js'

export const getAccountingAccounts = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/accounting-account/get-all${buildQueryParams(search, page, null, {
        is_active: filter.is_active,
        accounting_subcategory_id: filter.accounting_subcategory_id
    })}`)
    return response.data
}

export const searchAccountingAccounts = async (search = '', subcategoryId = '') => {
    const response = await api.get(`/api/v1/accounting-account/search${buildQuery({
        search,
        accounting_subcategory_id: subcategoryId
    })}`)
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
