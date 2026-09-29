import api from './api.js'

/**
 * Get paginated list of purchase requisitions with optional filters.
 */
export const getPurchaseRequisitions = async (search = '', page = 1, perPage = 10, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    if (perPage) params.append('per_page', perPage)

    for (const key in filter) {
        if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params.append(key, filter[key])
        }
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/purchase-requisitions${queryString}`)
    return response.data
}

/**
 * Get single purchase requisition details by ID.
 */
export const showPurchaseRequisition = async (id) => {
    const response = await api.get(`/api/v1/purchase-requisitions/${id}`)
    return response.data
}

/**
 * Create a new purchase requisition.
 * Supports draft or direct submission for approval.
 */
export const createPurchaseRequisition = async (data) => {
    const response = await api.post('/api/v1/purchase-requisitions', data)
    return response.data
}

/**
 * Update an existing draft purchase requisition.
 * Supports draft update or immediate submission for approval.
 */
export const updatePurchaseRequisition = async (id, data) => {
    const response = await api.put(`/api/v1/purchase-requisitions/${id}`, data)
    return response.data
}

/**
 * Submit an existing draft purchase requisition for approval.
 */
export const submitPurchaseRequisition = async (id, data = {}) => {
    const response = await api.post(`/api/v1/purchase-requisitions/${id}/submit`, data)
    return response.data
}

/**
 * Confirm physical receipt/pickup of items for a purchase requisition by requester.
 */
export const confirmPurchaseRequisitionReceipt = async (id, data = {}) => {
    const response = await api.post(`/api/v1/purchase-requisitions/${id}/confirm-receipt`, data)
    return response.data
}

