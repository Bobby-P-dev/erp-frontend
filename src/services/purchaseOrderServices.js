import api from './api.js'

/**
 * Mengambil daftar Purchase Order (PO) dengan paginasi dan filter.
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filters (status, supplier_id, rfq_id, procurement_plan_id, per_page)
 * @returns {Promise<object>}
 */
export const getPurchaseOrders = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/purchase-orders${queryString}`)
    return response.data
}

/**
 * Mengambil detail lengkap Purchase Order berdasarkan ID.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const showPurchaseOrder = async (id) => {
    const response = await api.get(`/api/v1/purchase-orders/${id}`)
    return response.data
}

/**
 * Membuat satu atau beberapa Purchase Order (PO) dari hasil pemenang tender RFQ.
 *
 * @param {number|string} rfqId
 * @param {object} data (supplier_quotation_id, supplier_id, po_date, expected_delivery_date, payment_terms, delivery_address, notes, submit_for_approval)
 * @returns {Promise<object>}
 */
export const createPurchaseOrderFromRfq = async (rfqId, data = {}) => {
    const response = await api.post(`/api/v1/rfqs/${rfqId}/purchase-orders`, data)
    return response.data
}

/**
 * Memperbarui data draf atau revisi Purchase Order.
 *
 * @param {number|string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updatePurchaseOrder = async (id, data) => {
    const response = await api.patch(`/api/v1/purchase-orders/${id}`, data)
    return response.data
}

/**
 * Mengajukan Purchase Order ke alur persetujuan (Approval Engine).
 *
 * @param {number|string} id
 * @param {object} data (notes, approval_configuration_id)
 * @returns {Promise<object>}
 */
export const submitPurchaseOrder = async (id, data = {}) => {
    const response = await api.post(`/api/v1/purchase-orders/${id}/submit`, data)
    return response.data
}

/**
 * Menerbitkan Purchase Order resmi ke Vendor / Portal Supplier.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const issuePurchaseOrder = async (id) => {
    const response = await api.post(`/api/v1/purchase-orders/${id}/issue`)
    return response.data
}

/**
 * Membatalkan Purchase Order.
 *
 * @param {number|string} id
 * @param {string} reason
 * @returns {Promise<object>}
 */
export const cancelPurchaseOrder = async (id, reason = '') => {
    const response = await api.post(`/api/v1/purchase-orders/${id}/cancel`, { reason })
    return response.data
}
