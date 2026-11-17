// Keep source decimals intact; only the backend calculator determines v1 prices.
export const pricingMode = item => item._pricingMode ?? (Number(item.pricing_schema_version) === 1 ? item.pricing_mode : 'legacy')
export const offeredQuotationItems = items => (items || []).filter(item => item.is_offered !== false)
export const hasPreviewPricing = items => offeredQuotationItems(items).some(item => pricingMode(item) !== 'legacy')

export function quotationItems(items) {
    if ((items || []).some(item => item._offerRequired && item.is_offered === false)) {
        throw new Error('Barang yang diminta untuk konfirmasi harga harus tetap ditawarkan.')
    }
    const offered = offeredQuotationItems(items)
    if (!offered.length) throw new Error('Pilih minimal satu barang untuk ditawarkan.')
    return offered.map(quotationItem)
}

export function hydrateQuotationSelection(items, existing) {
    return items.map(item => {
        const previous = existing.items?.find(line => String(line.rfq_item_id) === String(item.rfq_item_id))
        const requested = existing.requested_quantities?.find(line => String(line.rfq_item_id) === String(item.rfq_item_id))
        const hydrated = { ...item, ...(previous || {}), is_offered: !!previous,
            _offerRequired: !!previous && !!existing.requested_quantities?.length }
        return requested ? { ...hydrated, is_offered: true, _offerRequired: true, _pricingMode: 'reconfirm',
            offered_quantity: requested.quantity, price_input_basis: 'total', price_basis_quantity: requested.quantity,
            entered_total: '', requested_quantity: requested.quantity } : hydrated
    })
}

// Remove padding without converting decimal strings through floating-point numbers.
export function compactQuantity(value) {
    const text = String(value ?? '')
    return /^\d+\.\d+$/.test(text) ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}

export function formatPricingMoney(value, currency = 'IDR') {
    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value ?? ''))
    if (!match) return '—'
    const [, sign, whole, fraction = ''] = match
    const decimals = fraction.replace(/0+$/, '')
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    const code = String(currency || 'IDR').toUpperCase()
    return `${sign}${code === 'IDR' ? 'Rp' : `${code} `}${grouped}${decimals ? `,${decimals}` : ''}`
}

export function quotationItem(item) {
    if (pricingMode(item) === 'legacy') return legacyQuotationItem(item)
    return { rfq_item_id: item.rfq_item_id, ...pricingInput(item),
        lead_time_days: item.lead_time_days === '' || item.lead_time_days == null ? null : Number(item.lead_time_days),
        brand: item.brand || null, notes: item.notes || null }
}

export function pricingInput(item) {
    const mode = pricingMode(item)
    const rule = { pricing_mode: mode, offered_quantity: String(item.offered_quantity) }
    const price = (source, basisQuantity) => source.price_input_basis === 'total'
        ? { price_input_basis: 'total', entered_total: String(source.entered_total ?? ''), price_basis_quantity: String(basisQuantity) }
        : { price_input_basis: 'unit', entered_unit_price: String(source.entered_unit_price ?? '') }
    if (mode === 'tiered') {
        rule.price_tiers = (item.price_tiers ?? []).map(tier => ({ min_quantity: String(tier.min_quantity), ...price(tier, tier.min_quantity) }))
    } else {
        Object.assign(rule, ['fixed_quantity', 'reconfirm'].includes(mode)
            ? { price_input_basis: 'total', entered_total: String(item.entered_total ?? ''), price_basis_quantity: String(item.offered_quantity) }
            : price(item, item.price_basis_quantity ?? item.offered_quantity))
        if (mode === 'flat') rule.minimum_quantity = String(item.minimum_quantity ?? '1')
    }
    return rule
}

export function legacyQuotationItem(item) {
    if (pricingMode(item) !== 'legacy') throw new Error('Mode harga baru masih pratinjau dan belum dapat dikirim.')
    if (!/^\d{1,14}(?:\.\d{1,4})?$/.test(String(item.offered_quantity)) || Number(item.offered_quantity) <= 0) {
        throw new Error(`Jumlah untuk ${item.item_name} harus positif dan maksimal 4 desimal. Gunakan titik untuk pecahan.`)
    }
    if (String(item.unit_price ?? '').trim() === '' || !/^\d{1,16}(?:\.\d{1,2})?$/.test(String(item.unit_price))) {
        throw new Error(`Harga satuan untuk ${item.item_name} harus diisi, nonnegatif, dan maksimal 2 desimal.`)
    }
    return {
        rfq_item_id: item.rfq_item_id, offered_quantity: String(item.offered_quantity), unit_price: String(item.unit_price),
        lead_time_days: item.lead_time_days === '' || item.lead_time_days == null ? null : Number(item.lead_time_days),
        brand: item.brand || null, notes: item.notes || null,
    }
}
