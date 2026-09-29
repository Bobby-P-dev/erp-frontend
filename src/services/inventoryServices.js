import api from './api.js'

/**
 * Mengambil daftar Penerimaan Fisik Barang (Goods Receipts / GRN) dengan paginasi, pencarian, dan filter.
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filters (status, direct_purchase_id, per_page)
 * @returns {Promise<object>}
 */
export const getGoodsReceipts = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)

    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/inventory/goods-receipts${queryString}`)
    return response.data
}

/**
 * Mengambil detail lengkap Surat Jalan & Hasil Pemeriksaan Fisik Barang (GRN).
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const getGoodsReceiptDetail = async (id) => {
    const response = await api.get(`/api/v1/inventory/goods-receipts/${id}`)
    return response.data
}

/**
 * Alias untuk getGoodsReceiptDetail sesuai standar AGENTS.md.
 */
export const showGoodsReceipt = getGoodsReceiptDetail

/**
 * Mencatat penerimaan fisik barang baru (Goods Receipt Note) dari pesanan Direct Purchase.
 *
 * @param {object} payload { direct_purchase_id, receipt_date, delivery_note_number, shipping_carrier, notes, items: [...] }
 * @returns {Promise<object>}
 */
export const recordGoodsReceipt = async (payload) => {
    const response = await api.post('/api/v1/inventory/goods-receipts', payload)
    return response.data
}

/**
 * Alias untuk recordGoodsReceipt sesuai standar AGENTS.md.
 */
export const createGoodsReceipt = recordGoodsReceipt

/**
 * Mengambil daftar Direct Purchase yang siap diterima fisiknya oleh gudang (Status 'paid' atau 'partially_received').
 *
 * @param {string} search
 * @returns {Promise<Array>}
 */
export const getDirectPurchasesReadyForReceipt = async (search = '') => {
    try {
        const response = await api.get('/api/v1/direct-purchases', {
            params: {
                search,
                status: 'paid', // Utama: yang sudah dibayar kasir
                per_page: 50
            }
        })
        const items = response.data?.data || response.data || []
        return Array.isArray(items) ? items : []
    } catch (err) {
        console.warn('Gagal memuat Direct Purchase siap terima, mengembalikan array kosong:', err)
        return []
    }
}

/**
 * Konfirmasi serah terima barang gudang ke pemohon (Handover).
 *
 * @param {number|string} id
 * @param {object} payload { received_by_requester_id, notes, handover_proof_file_id }
 * @returns {Promise<object>}
 */
export const confirmGoodsReceiptHandover = async (id, payload = {}) => {
    const response = await api.post(`/api/v1/inventory/goods-receipts/${id}/handover`, payload)
    return response.data
}

