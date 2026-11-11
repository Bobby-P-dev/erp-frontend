import api from './api'
import { buildQueryParams, buildQuery } from './core/httpQuery.js'

export const getAccountingSubcategories = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/accounting-subcategory/get-all${buildQueryParams(search, page, null, {
        is_active: filter.is_active,
        accounting_category_id: filter.accounting_category_id
    })}`)
    return response.data
}

export const searchAccountingSubcategories = async (search = '', categoryId = '') => {
    const response = await api.get(`/api/v1/accounting-subcategory/search${buildQuery({
        search,
        accounting_category_id: categoryId
    })}`)
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
