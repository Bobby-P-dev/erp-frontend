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

/**
 * Mengambil daftar Purchase Order (PO) resmi yang diterbitkan untuk rekanan ini.
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filters (status, per_page)
 * @returns {Promise<object>}
 */
export const getSupplierPortalPurchaseOrders = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/supplier-portal/purchase-orders${queryString}`)
    return response.data
}

/**
 * Mengambil detail Purchase Order (PO) untuk rekanan ini.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const getSupplierPortalPurchaseOrderDetail = async (id) => {
    const response = await api.get(`/api/v1/supplier-portal/purchase-orders/${id}`)
    return response.data
}

/**
 * Konfirmasi / Acknowledge Purchase Order (PO) oleh rekanan.
 *
 * @param {number|string} id
 * @param {object} data (acknowledged_by_name, expected_delivery_date, vendor_notes)
 * @returns {Promise<object>}
 */
export const acknowledgeSupplierPortalPurchaseOrder = async (id, data = {}) => {
    const response = await api.post(`/api/v1/supplier-portal/purchase-orders/${id}/acknowledge`, data)
    return response.data
}
