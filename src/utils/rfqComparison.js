// A missing conversion must never become zero or fall back to the original currency.
export const comparisonNumber = value => {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

export const awardSubtotal = (quantity, baseUnitPrice) => {
    const qty = comparisonNumber(quantity)
    const price = comparisonNumber(baseUnitPrice)
    return qty === null || price === null ? null : qty * price
}

export const pricingModeLabel = mode => ({ flat: 'Harga proporsional', tiered: 'Harga bertingkat', fixed_quantity: 'Borongan · wajib seluruh jumlah', reconfirm: 'Konfirmasi harga jika jumlah berubah' }[mode] || 'Harga satuan')
const pricingQuantityText = (value, unit) => `${String(value).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')} ${unit}`.trim()
export const pricingQuantityHint = (offer, unit = '') => {
    if (!(offer?.pricing_schema_version > 0)) return ''
    if (offer.pricing_mode === 'reconfirm') return `Harga dikonfirmasi untuk ${pricingQuantityText(offer.offered_quantity, unit)}. Jumlah lain perlu harga final dari supplier.`
    if (offer.pricing_mode === 'fixed_quantity') return `Wajib dibeli seluruhnya: ${pricingQuantityText(offer.offered_quantity, unit)}.`
    const minimum = offer.pricing_rules?.minimum_quantity
    return minimum != null ? `Minimum supplier: ${pricingQuantityText(minimum, unit)}.` : ''
}
export const pricingReasonText = (reason, offer, unit = '') => ({
    requires_price_confirmation: 'Jumlah berubah. Minta konfirmasi harga final ke supplier sebelum menetapkan pemenang.',
    requires_full_quantity: offer ? `${pricingQuantityHint(offer, unit)} Minta revisi supplier untuk membeli sebagian.` : 'Penawaran borongan harus dibeli seluruhnya. Minta revisi supplier untuk membeli sebagian.',
    below_minimum_quantity: `Jumlah belum memenuhi minimum pembelian supplier.${offer ? ` ${pricingQuantityHint(offer, unit)}` : ''} Ubah pembagian jumlah atau pilih supplier lain.`,
    exceeds_offered_quantity: 'Jumlah melebihi yang ditawarkan supplier.',
}[reason] || 'Harga belum tersedia. Periksa jumlah atau muat ulang penawaran.')

export const sumComparisonAmounts = amounts => {
    const numbers = amounts.map(comparisonNumber)
    return numbers.some(value => value === null) ? null : numbers.reduce((sum, value) => sum + value, 0)
}

export const isLowestUnitPrice = offer =>
    offer?.quoted === true && comparisonNumber(offer.base_unit_price) !== null &&
    (offer.is_lowest_unit_price ?? offer.is_lowest_price) === true

export const isLowestTotalCost = supplier =>
    supplier?.is_total_cost_comparable === true &&
    comparisonNumber(supplier.base_total_amount) !== null && supplier.is_lowest_total_cost === true

export const remainingAwardQuantity = item => {
    const committed = Object.values(item.vendor_offers || {})
        .filter(offer => offer.purchase_order_id)
        .reduce((sum, offer) => sum + Number(offer.awarded_quantity || 0), 0)
    return Math.max(0, Math.round((Number(item.target_quantity) - committed) * 10000) / 10000)
}

// Four-decimal quantities match the API's award arithmetic.
export const splitAwardMaximum = (item, allocations, current) => {
    const otherQuantity = allocations.filter(row => row !== current && row.quotation_id)
        .reduce((sum, row) => sum + Math.max(0, Math.round((Number(row.awarded_quantity) || 0) * 10000)), 0)
    const available = Math.max(0, Math.round(remainingAwardQuantity(item) * 10000) - otherQuantity) / 10000
    return Math.min(available, Number(current.max_offered) || 0)
}

export const defaultSplitOffer = (item, isEligible = () => true) => {
    const offers = Object.entries(item.vendor_offers || {})
        .filter(([quotationId, offer]) => offer.quoted && !offer.purchase_order_id && isEligible(quotationId))
    return offers.find(([, offer]) => offer.is_awarded) ||
        offers.find(([, offer]) => isLowestUnitPrice(offer)) || offers[0]
}

export const totalCostExclusionText = supplier => {
    if (supplier.is_total_cost_comparable === true) return null
    const reasons = {
        invalid_exchange_rate: 'Kurs quotation tidak valid; nilai konversi tidak tersedia.',
        no_rfq_items: 'RFQ belum memiliki item.',
        missing_rfq_items: 'Penawaran belum mencakup seluruh item RFQ.',
        duplicate_rfq_items: 'Terdapat item RFQ duplikat dalam penawaran.',
        quantity_mismatch: 'Kuantitas penawaran berbeda dari target RFQ.',
        unexpected_rfq_items: 'Penawaran memuat item di luar RFQ.'
    }
    return reasons[supplier.total_cost_exclusion_reason] ||
        (supplier.comparison_error ? reasons.invalid_exchange_rate : 'Data pembanding total belum tersedia.')
}
