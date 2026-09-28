import api from './api.js'

/**
 * Mengambil daftar Direct Purchase dengan paginasi, pencarian, dan filter.
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filters (status, purchase_channel, procurement_plan_id, supplier_id, per_page)
 * @returns {Promise<object>}
 */
export const getDirectPurchases = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)

    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/direct-purchases${queryString}`)
    return response.data
}

/**
 * Mengambil detail lengkap Direct Purchase berdasarkan ID.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const showDirectPurchase = async (id) => {
    const response = await api.get(`/api/v1/direct-purchases/${id}`)
    return response.data
}

/**
 * Menyimpan Direct Purchase baru.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createDirectPurchase = async (data) => {
    const response = await api.post('/api/v1/direct-purchases', data)
    return response.data
}

/**
 * Memperbarui data draft Direct Purchase.
 *
 * @param {number|string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateDirectPurchase = async (id, data) => {
    const response = await api.patch(`/api/v1/direct-purchases/${id}`, data)
    return response.data
}

/**
 * Mengajukan Direct Purchase untuk proses pembayaran (Ready for Payment).
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const submitDirectPurchaseForPayment = async (id) => {
    const response = await api.post(`/api/v1/direct-purchases/${id}/submit-for-payment`)
    return response.data
}

/**
 * Membatalkan Direct Purchase.
 *
 * @param {number|string} id
 * @param {string|null} reason
 * @returns {Promise<object>}
 */
export const cancelDirectPurchase = async (id, reason = null) => {
    const payload = reason ? { reason } : {}
    const response = await api.post(`/api/v1/direct-purchases/${id}/cancel`, payload)
    return response.data
}
