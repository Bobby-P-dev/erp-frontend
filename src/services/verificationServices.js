import api from './api.js'

/**
 * Public Verification Service
 * Menghubungi backend API untuk memverifikasi keabsahan tanda tangan digital berbasis URL Token.
 * 
 * @param {string} token
 * @returns {Promise<Object>} Data hasil verifikasi token
 */
export const getPublicVerification = async (token) => {
    if (!token) {
        throw new Error('Token verifikasi tidak boleh kosong')
    }
    const response = await api.get(`/api/public/verify/${token}`)
    const payload = response.data || {}
    const innerData = payload.data || {}

    return {
        ...innerData,
        ...payload,
        is_valid: payload.is_valid ?? innerData.is_valid ?? false,
        status: payload.status ?? innerData.status ?? 'UNKNOWN',
        data: innerData,
    }
}
