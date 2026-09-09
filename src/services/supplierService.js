import api from './api'

export const searchSuppliers = async (search = '') => {
    const response = await api.get(`/api/v1/supplier/search?search=${search}`)
    return response.data
}

export const searchSupplier = searchSuppliers
