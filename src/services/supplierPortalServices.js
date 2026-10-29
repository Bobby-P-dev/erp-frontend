import api from './api.js'

/**
 * Mengambil ringkasan metrik KPI untuk dashboard rekanan terautentikasi.
 *
 * @returns {Promise<object>}
 */
export const getSupplierPortalDashboard = async () => {
    const response = await api.get('/api/v1/supplier-portal/dashboard')
    return response.data
}

/**
 * Mengambil daftar tender RFQ yang mengundang rekanan ini dengan paginasi dan filter tab.
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filters (tab, per_page)
 * @returns {Promise<object>}
 */
export const getSupplierPortalRfqs = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/supplier-portal/rfqs${queryString}`)
    return response.data
}

/**
 * Mengambil detail lengkap RFQ untuk rekanan terautentikasi (HPS dirahasiakan).
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const getSupplierPortalRfqDetail = async (id) => {
    const response = await api.get(`/api/v1/supplier-portal/rfqs/${id}`)
    return response.data
}

/**
 * Mengambil riwayat surat penawaran harga rekanan ini dengan paginasi.
 *
 * @param {number} page
 * @param {object} filters (status, per_page)
 * @returns {Promise<object>}
 */
export const getSupplierPortalQuotations = async (page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (page) params.append('page', page)
    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/supplier-portal/quotations${queryString}`)
    return response.data
}
