import api from './api.js'

/**
 * Mengambil daftar master pajak dengan paginasi, pencarian, dan filter.
 *
 * @param {string} search
 * @param {number} page
 * @param {object} filter { is_active, type, is_default }
 * @param {number} perPage
 * @returns {Promise<object>}
 */
export const getTaxes = async (search = '', page = 1, filter = {}, perPage = 10) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    if (perPage) params.append('per_page', perPage)

    for (const key in filter) {
        if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
            params.append(`filter[${key}]`, filter[key])
        }
    }

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/taxes/get-all${queryString}`)
    return response.data
}

/**
 * Mencari pajak aktif untuk dropdown pilihan transaksi.
 *
 * @param {string} search
 * @param {string|null} type 'vat' | 'withholding' | 'other'
 * @param {number} limit
 * @returns {Promise<object>}
 */
export const searchTaxes = async (search = '', type = null, limit = 50) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (type) params.append('type', type)
    if (limit) params.append('limit', limit)

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/taxes/search${queryString}`)
    return response.data
}

/**
 * Mengambil pajak default untuk tipe tertentu.
 *
 * @param {string|null} type
 * @returns {Promise<object>}
 */
export const getDefaultTax = async (type = null) => {
    const params = new URLSearchParams()
    if (type) params.append('type', type)

    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/api/v1/taxes/default${queryString}`)
    return response.data
}

/**
 * Mengambil detail pajak berdasarkan ID.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const showTax = async (id) => {
    const response = await api.get(`/api/v1/taxes/${id}/show`)
    return response.data
}

/**
 * Menyimpan data pajak baru.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createTax = async (data) => {
    const response = await api.post('/api/v1/taxes/store', data)
    return response.data
}

/**
 * Memperbarui data pajak.
 *
 * @param {number|string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateTax = async (id, data) => {
    const response = await api.patch(`/api/v1/taxes/${id}/update`, data)
    return response.data
}

/**
 * Menghapus data pajak.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const deleteTax = async (id) => {
    const response = await api.delete(`/api/v1/taxes/${id}/delete`)
    return response.data
}
