import api from './api.js'

/**
 * Get paginated list of PR items in the procurement queue waiting for planning.
 */
export const getProcurementQueue = async (filters = {}, page = 1, perPage = 10) => {
    const params = new URLSearchParams()
    if (page) params.append('page', page)
    if (perPage) params.append('per_page', perPage)

    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/procurement-queue${queryString}`)
    return response.data
}

/**
 * Get paginated list of procurement plans with optional filters.
 */
export const getProcurementPlans = async (filters = {}, page = 1, perPage = 10) => {
    const params = new URLSearchParams()
    if (page) params.append('page', page)
    if (perPage) params.append('per_page', perPage)

    for (const key in filters) {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
            params.append(key, filters[key])
        }
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/procurement-plans${queryString}`)
    return response.data
}

/**
 * Get single procurement plan details by ID.
 */
export const showProcurementPlan = async (id) => {
    const response = await api.get(`/api/v1/procurement-plans/${id}`)
    return response.data
}

/**
 * Create a new procurement plan (draft status).
 * procurement_method: 'direct_purchase' | 'rfq'
 */
export const createProcurementPlan = async (data) => {
    const response = await api.post('/api/v1/procurement-plans', data)
    return response.data
}

/**
 * Update an existing draft procurement plan.
 */
export const updateProcurementPlan = async (id, data) => {
    const response = await api.patch(`/api/v1/procurement-plans/${id}`, data)
    return response.data
}

/**
 * Activate a draft procurement plan.
 */
export const activateProcurementPlan = async (id) => {
    const response = await api.post(`/api/v1/procurement-plans/${id}/activate`)
    return response.data
}

/**
 * Cancel a procurement plan.
 */
export const cancelProcurementPlan = async (id, reason = null) => {
    const response = await api.post(`/api/v1/procurement-plans/${id}/cancel`, { reason })
    return response.data
}
