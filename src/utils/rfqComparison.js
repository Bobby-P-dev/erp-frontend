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
