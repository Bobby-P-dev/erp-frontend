// Integer arithmetic keeps four-decimal quantities exact when suppliers share an item.
export const quantityUnits = value => {
    const text = String(value ?? '')
    if (!/^\d{1,14}(?:\.\d{1,4})?$/.test(text)) return null
    const [whole, fraction = ''] = text.split('.')
    return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'))
}
const decimal = units => `${units / 10000n}.${String(units % 10000n).padStart(4, '0')}`

// getRandomValues also works on the internal HTTP hostname, where randomUUID may be unavailable.
export function newRequisitionKey() {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 15) | 64
    bytes[8] = (bytes[8] & 63) | 128
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function selectionMaximum(item, offer, selections, metadata) {
    let available = quantityUnits(metadata?.rfq_remaining?.[item.rfq_item_id]) ?? 0n
    for (const other of Object.values(item.vendor_offers || {})) {
        if (other.supplier_quotation_item_id !== offer.supplier_quotation_item_id) {
            available -= quantityUnits(selections[other.supplier_quotation_item_id]) ?? 0n
        }
    }
    const offered = quantityUnits(metadata?.quotation_remaining?.[offer.supplier_quotation_item_id]) ?? 0n
    return decimal(available < 0n ? 0n : available < offered ? available : offered)
}

// Keep text editing (including an unfinished decimal) within the current balance.
export function boundedRequisitionQuantity(value, maximum, previous = '') {
    const text = String(value)
    if (text === '') return ''
    const units = quantityUnits(text.endsWith('.') ? `${text}0` : text)
    if (units === null) return previous
    const limit = quantityUnits(maximum) ?? 0n
    return units > limit ? decimal(limit).replace(/\.?0+$/, '') : text
}

export function requisitionRows(matrix, selections) {
    const rows = []
    for (const item of matrix.items_matrix || []) {
        for (const supplier of matrix.suppliers || []) {
            const offer = item.vendor_offers?.[supplier.quotation_id]
            if (offer?.quoted && offer.supplier_quotation_item_id in selections) {
                rows.push({ item, offer, supplier, quantity: String(selections[offer.supplier_quotation_item_id]) })
            }
        }
    }
    return rows.sort((a, b) => a.offer.supplier_quotation_item_id - b.offer.supplier_quotation_item_id)
}

export function selectionErrors(matrix, selections) {
    const rows = requisitionRows(matrix, selections), errors = []
    if (!matrix.requisition_selection?.can_create) errors.push('RFQ belum dapat digunakan untuk membuat PR. Muat ulang atau periksa akses Anda.')
    if (!rows.length) errors.push('Pilih minimal satu penawaran sebagai dasar PR.')
    if (rows.length > 100) errors.push('Maksimal 100 baris penawaran dalam satu PR.')
    const currency = rows[0]?.supplier.currency
    const rate = Number(rows[0]?.supplier.exchange_rate)
    for (const row of rows) {
        const { item, offer, supplier, quantity } = row
        const eligibility = matrix.requisition_selection?.quotations?.[supplier.quotation_id]
        if (!eligibility?.eligible) errors.push(`${supplier.supplier_name}: ${eligibility?.reason || 'Penawaran tidak tersedia.'}`)
        const units = quantityUnits(quantity)
        const max = quantityUnits(selectionMaximum(item, offer, selections, matrix.requisition_selection))
        if (units === null || units <= 0n) errors.push(`${item.item_name} · ${supplier.supplier_name}: isi jumlah positif, maksimal 4 desimal dengan titik.`)
        else if (units > max) errors.push(`${item.item_name} · ${supplier.supplier_name}: jumlah melebihi sisa kebutuhan atau penawaran.`)
        if (!currency || supplier.currency !== currency || !Number.isFinite(rate) || rate <= 0 || Number(supplier.exchange_rate) !== rate) {
            errors.push('Mata uang dan kurs harus sama. Buat PR terpisah untuk penawaran yang berbeda.')
        }
    }
    return [...new Set(errors)]
}
