import api from './api.js'

export const getRfqCatalogItems = async (search = '', page = 1) => {
    const response = await api.get('/api/v1/rfqs/catalog-items', { params: { search, page, per_page: 10 } })
    return response.data
}

export const getRfqSupplierCandidates = async ({ search = '', page = 1, mode = 'all', itemIds = [], supplierIds, perPage = 10 } = {}) => {
    const params = new URLSearchParams({ search, page, mode, per_page: perPage })
    itemIds.forEach(id => params.append('item_ids[]', id))
    supplierIds?.forEach(id => params.append('supplier_ids[]', id))
    const response = await api.get('/api/v1/rfqs/supplier-candidates', { params })
    return response.data
}

/**
 * Mengambil daftar RFQ dengan paginasi dan filter.
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filters (status, supplier_id, procurement_plan_id, per_page)
 * @returns {Promise<object>}
 */
export const getRfqs = async (search = '', page = 1, filters = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/rfqs${queryString}`)
    return response.data
}

/**
 * Mengambil detail lengkap RFQ berdasarkan ID.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const showRfq = async (id) => {
    const response = await api.get(`/api/v1/rfqs/${id}`)
    return response.data
}

/**
 * Menyimpan draf tender RFQ baru dari Procurement Plan.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createRfq = async (data) => {
    const response = await api.post('/api/v1/rfqs', data)
    return response.data
}

/**
 * Memperbarui data draf RFQ.
 *
 * @param {number|string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateRfq = async (id, data) => {
    const response = await api.patch(`/api/v1/rfqs/${id}`, data)
    return response.data
}

export const extendRfqDeadline = async (id, data) => {
    const response = await api.post(`/api/v1/rfqs/${id}/extend-deadline`, data)
    return response.data
}

/**
 * Menerbitkan tender RFQ dan mengaktifkan Magic Token portal vendor.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const publishRfq = async (id) => {
    const response = await api.post(`/api/v1/rfqs/${id}/publish`)
    return response.data
}

export const sendRfqInvitation = async (id, invitationId, data = {}) => {
    const response = await api.post(`/api/v1/rfqs/${id}/suppliers/${invitationId}/send-invitation`, data)
    return response.data
}

/**
 * Memindahkan RFQ ke tahap evaluasi penawaran.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const startEvaluationRfq = async (id) => {
    const response = await api.post(`/api/v1/rfqs/${id}/start-evaluation`)
    return response.data
}

/**
 * Membatalkan tender RFQ.
 *
 * @param {number|string} id
 * @param {string} reason
 * @returns {Promise<object>}
 */
export const cancelRfq = async (id, reason) => {
    const response = await api.post(`/api/v1/rfqs/${id}/cancel`, { reason })
    return response.data
}

/**
 * Mengambil data Matriks Komparasi Penawaran sisi-ke-sisi (ERPNext style).
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const getRfqComparisonMatrix = async (id) => {
    const response = await api.get(`/api/v1/rfqs/${id}/comparison`)
    return response.data
}

export const createRequisitionFromRfq = async (id, payload) => {
    return (await api.post(`/api/v1/rfqs/${id}/purchase-requisitions`, payload)).data
}

/**
 * Mengeksekusi penentuan pemenang tender (Full / Split Awarding).
 *
 * @param {number|string} id
 * @param {object} data { awards: [ { supplier_quotation_item_id, awarded_quantity, notes } ] }
 * @returns {Promise<object>}
 */
export const awardRfq = async (id, data) => {
    const response = await api.post(`/api/v1/rfqs/${id}/award`, data)
    return response.data
}

/**
 * Pencatatan penawaran harga vendor secara manual oleh Buyer.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export const recordSupplierQuotation = async (data) => {
    const response = await api.post('/api/v1/supplier-quotations', data)
    return response.data
}

/**
 * Mengambil detail penawaran vendor tertentu.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const showSupplierQuotation = async (id) => {
    const response = await api.get(`/api/v1/supplier-quotations/${id}`)
    return response.data
}

export const confirmSupplierQuotationReview = async (id, version) => {
    const response = await api.post(`/api/v1/supplier-quotations/${id}/confirm-review`, { expected_review_version: version })
    return response.data
}

export const submitSupplierQuotationReview = async (id, version) => {
    const response = await api.post(`/api/v1/supplier-quotations/${id}/submit-review`, { expected_review_version: version })
    return response.data
}

export const previewQuotationPricing = async payload => (await api.post('/api/v1/supplier-quotations/pricing-preview', payload)).data.data
export const previewAwardPricing = async (id, payload) => (await api.post(`/api/v1/supplier-quotations/${id}/pricing-preview`, payload)).data.data
export const previewPortalQuotationPricing = async (token, payload) => (await api.post(`/api/v1/public/portal/rfq/${encodeURIComponent(token)}/pricing-preview`, payload)).data.data

export const getSupplierQuotationHistory = async id => (await api.get(`/api/v1/supplier-quotations/${id}/history`)).data
export const requestSupplierQuotationRevision = async (id, payload) => (await api.post(`/api/v1/supplier-quotations/${id}/request-revision`, payload)).data
export const reviseSupplierQuotation = async (id, payload) => (await api.post(`/api/v1/supplier-quotations/${id}/revise`, payload)).data

// Quotation review must surface API failures, including expired sessions and missing requests.
export const getQuotationApprovalTracker = async (id) => {
    const response = await api.get(`/api/v1/approvals/requests/${id}/tracker`)
    return response.data
}

export const decideQuotationApproval = async (id, decision, notes, expectedStep) => {
    const response = await api.post(`/api/v1/approvals/requests/${id}/decision`, {
        decision: decision === 'revision' ? 'request_revision' : decision,
        notes, expected_step_order: expectedStep,
    })
    return response.data
}

/**
 * Mengambil detail tender RFQ publik via Magic Token (untuk rekanan/vendor luar).
 *
 * @param {string} token
 * @returns {Promise<object>}
 */
export const getPublicPortalRfq = async (token) => {
    const response = await api.get(`/api/v1/public/portal/rfq/${token}`)
    return response.data
}

/**
 * Mengirimkan penawaran harga rekanan melalui Portal Publik (mendukung multipart form upload).
 *
 * @param {string} token
 * @param {object|FormData} payload
 * @returns {Promise<object>}
 */
export const submitPublicPortalQuotation = async (token, payload) => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
    const response = await api.post(`/api/v1/public/portal/rfq/${token}/quote`, payload, config)
    return response.data
}

/**
 * Menolak partisipasi tender melalui Portal Publik.
 *
 * @param {string} token
 * @param {string} reason
 * @returns {Promise<object>}
 */
export const declinePublicPortalRfq = async (token, reason = '') => {
    const response = await api.post(`/api/v1/public/portal/rfq/${token}/decline`, { reason })
    return response.data
}

