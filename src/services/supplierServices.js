import api from './api'

const buildQuery = (search = '', page = 1, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    for (const key in filter) {
        if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params.append(key, filter[key])
        }
    }
    return params.toString() ? `?${params.toString()}` : ''
}

// ==========================================
// SUPPLIER MASTER
// ==========================================
export const getSuppliers = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/suppliers${buildQuery(search, page, filter)}`)
    return response.data
}

export const searchSuppliers = async (search = '', limit = 10) => {
    const response = await api.get(`/api/v1/supplier/search?search=${encodeURIComponent(search)}&limit=${limit}`)
    return response.data
}

export const searchSupplier = searchSuppliers

export const showSupplier = async (id) => {
    const response = await api.get(`/api/v1/suppliers/${id}`)
    return response.data
}

export const createSupplier = async (data) => {
    const response = await api.post('/api/v1/suppliers', data)
    return response.data
}

export const updateSupplier = async (id, data) => {
    const response = await api.patch(`/api/v1/suppliers/${id}`, data)
    return response.data
}

export const deleteSupplier = async (id) => {
    const response = await api.delete(`/api/v1/suppliers/${id}`)
    return response.data
}

// ==========================================
// SUPPLIER CONTACTS
// ==========================================
export const getSupplierContacts = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/supplier-contacts${buildQuery(search, page, filter)}`)
    return response.data
}

export const createSupplierContact = async (data) => {
    const response = await api.post('/api/v1/supplier-contacts', data)
    return response.data
}

export const showSupplierContact = async (id) => {
    const response = await api.get(`/api/v1/supplier-contacts/${id}`)
    return response.data
}

export const updateSupplierContact = async (id, data) => {
    const response = await api.patch(`/api/v1/supplier-contacts/${id}`, data)
    return response.data
}

export const deleteSupplierContact = async (id) => {
    const response = await api.delete(`/api/v1/supplier-contacts/${id}`)
    return response.data
}

// ==========================================
// SUPPLIER BANK ACCOUNTS
// ==========================================
export const getSupplierBankAccounts = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/supplier-bank-accounts${buildQuery(search, page, filter)}`)
    return response.data
}

export const createSupplierBankAccount = async (data) => {
    const response = await api.post('/api/v1/supplier-bank-accounts', data)
    return response.data
}

export const showSupplierBankAccount = async (id) => {
    const response = await api.get(`/api/v1/supplier-bank-accounts/${id}`)
    return response.data
}

export const updateSupplierBankAccount = async (id, data) => {
    const response = await api.patch(`/api/v1/supplier-bank-accounts/${id}`, data)
    return response.data
}

export const deleteSupplierBankAccount = async (id) => {
    const response = await api.delete(`/api/v1/supplier-bank-accounts/${id}`)
    return response.data
}

// ==========================================
// SUPPLIER DOCUMENTS
// ==========================================
export const getSupplierDocuments = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/supplier-documents${buildQuery(search, page, filter)}`)
    return response.data
}

export const createSupplierDocument = async (data) => {
    const response = await api.post('/api/v1/supplier-documents', data)
    return response.data
}

export const showSupplierDocument = async (id) => {
    const response = await api.get(`/api/v1/supplier-documents/${id}`)
    return response.data
}

export const updateSupplierDocument = async (id, data) => {
    const response = await api.patch(`/api/v1/supplier-documents/${id}`, data)
    return response.data
}

export const deleteSupplierDocument = async (id) => {
    const response = await api.delete(`/api/v1/supplier-documents/${id}`)
    return response.data
}

export const verifySupplierDocument = async (id, data = {}) => {
    const response = await api.post(`/api/v1/supplier-documents/${id}/verify`, data)
    return response.data
}

// ==========================================
// SUPPLIER ITEMS
// ==========================================
export const getSupplierItems = async (search = '', page = 1, filter = {}) => {
    const response = await api.get(`/api/v1/supplier-items${buildQuery(search, page, filter)}`)
    return response.data
}

export const createSupplierItem = async (data) => {
    const response = await api.post('/api/v1/supplier-items', data)
    return response.data
}

export const showSupplierItem = async (id) => {
    const response = await api.get(`/api/v1/supplier-items/${id}`)
    return response.data
}

export const updateSupplierItem = async (id, data) => {
    const response = await api.patch(`/api/v1/supplier-items/${id}`, data)
    return response.data
}

export const deleteSupplierItem = async (id) => {
    const response = await api.delete(`/api/v1/supplier-items/${id}`)
    return response.data
}
