import api from './api.js'

/**
 * Mengambil daftar Permohonan Pembayaran (Payment Requests) dengan paginasi, pencarian, dan filter.
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filters (status, recipient_type, direct_purchase_id, per_page)
 * @returns {Promise<object>}
 */
export const getPaymentRequests = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)

    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/finance/payment-requests${queryString}`)
    return response.data
}

/**
 * Mengambil detail lengkap Permohonan Pembayaran berdasarkan ID.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const getPaymentRequestDetail = async (id) => {
    const response = await api.get(`/api/v1/finance/payment-requests/${id}`)
    return response.data
}

/**
 * Alias untuk getPaymentRequestDetail sesuai standar AGENTS.md.
 */
export const showPaymentRequest = getPaymentRequestDetail

/**
 * Membuat permohonan pembayaran baru untuk Direct Purchase atau transaksi lain.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createPaymentRequest = async (data) => {
    const response = await api.post('/api/v1/finance/payment-requests', data)
    return response.data
}

/**
 * Mencairkan permohonan pembayaran yang telah disetujui (Kasir / Disbursement).
 *
 * @param {number|string} paymentRequestId
 * @param {object} disbursementData { source_account_id, payment_date, bank_fee, reference_number, notes }
 * @returns {Promise<object>}
 */
export const disbursePayment = async (paymentRequestId, disbursementData) => {
    const response = await api.post(`/api/v1/finance/payments/${paymentRequestId}/disburse`, disbursementData)
    return response.data
}

/**
 * Mengajukan ulang permohonan pembayaran yang diminta revisi oleh approver.
 *
 * @param {number|string} paymentRequestId
 * @param {object} resubmitData { bank_name, bank_account_number, bank_account_holder, notes }
 * @returns {Promise<object>}
 */
export const resubmitPaymentRequest = async (paymentRequestId, resubmitData) => {
    const response = await api.post(`/api/v1/finance/payment-requests/${paymentRequestId}/resubmit`, resubmitData)
    return response.data
}

/**
 * Mengambil riwayat realisasi pembayaran / kas keluar (Disbursed Payments).
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filters (source_account_id, payment_date, per_page)
 * @returns {Promise<object>}
 */
export const getDisbursedPayments = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)

    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/finance/payments${queryString}`)
    return response.data
}

/**
 * Mengambil detail pembayaran / mutasi kas tertentu.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const getDisbursedPaymentDetail = async (id) => {
    const response = await api.get(`/api/v1/finance/payments/${id}`)
    return response.data
}

/**
 * Alias untuk getDisbursedPaymentDetail.
 */
export const showDisbursedPayment = getDisbursedPaymentDetail
