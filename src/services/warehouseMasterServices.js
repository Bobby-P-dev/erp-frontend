import api from './api.js'

export const warehouseMasterPermissions = ['warehouse-master.read', 'warehouse-master.manage']

const companyPath = (company) => `/api/v1/inventory/companies/${company}`
const warehousesPath = (company) => `${companyPath(company)}/warehouses`
const locationsPath = (company, warehouse) => `${warehousesPath(company)}/${warehouse}/locations`
const receivingPath = (company) => `${companyPath(company)}/default-receiving-destination`

export async function listWarehouses(company) {
    const { data } = await api.get(warehousesPath(company))
    return data.data
}

export async function listWarehouseLocations(company, warehouse, receivingOnly = false) {
    const { data } = await api.get(locationsPath(company, warehouse), {
        params: receivingOnly ? { receiving_only: 1 } : undefined,
    })
    return data.data
}

export async function saveWarehouse(company, id, payload) {
    const path = warehousesPath(company)
    return id ? api.patch(`${path}/${id}`, payload) : api.post(path, payload)
}

export async function saveWarehouseLocation(company, warehouse, id, payload) {
    const path = locationsPath(company, warehouse)
    return id ? api.patch(`${path}/${id}`, payload) : api.post(path, payload)
}

export async function getReceivingDestination(company) {
    const { data } = await api.get(receivingPath(company))
    return data.data
}

export async function saveReceivingDestination(company, payload) {
    const { data } = await api.put(receivingPath(company), payload)
    return data.data
}

export async function clearReceivingDestination(company) {
    return api.delete(receivingPath(company))
}
