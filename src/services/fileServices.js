import api from './api.js'

/**
 * Upload single file (image, screenshot, PDF) to backend storage and register File record.
 *
 * @param {File} file
 * @param {string} folder (optional, e.g. 'payments' or 'goods_receipts')
 * @returns {Promise<object>}
 */
export const uploadFile = async (file, folder = 'attachments') => {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) {
        formData.append('folder', folder)
    }

    const response = await api.post('/api/v1/files/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    return response.data
}
