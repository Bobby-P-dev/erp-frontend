import { computed } from 'vue'

/**
 * Pure calculation helper functions
 */
export const calculateItemSubtotal = (qty = 0, unitPrice = 0, discountAmount = 0) => {
    const q = Number(qty) || 0
    const p = Number(unitPrice) || 0
    const d = Number(discountAmount) || 0
    return Math.max(0, (q * p) - d)
}

export const calculateItemsSubtotal = (items = []) => {
    if (!Array.isArray(items)) return 0
    return items.reduce((sum, item) => {
        return sum + calculateItemSubtotal(item?.quantity, item?.unit_price, item?.discount_amount)
    }, 0)
}

export const calculateTaxAmount = (netBase = 0, taxRate = 0) => {
    const base = Math.max(0, Number(netBase) || 0)
    const rate = Number(taxRate) || 0
    return Math.round((base * rate) / 100)
}

export const calculateGrandTotal = ({
    subtotal = 0,
    discountAmount = 0,
    shippingCost = 0,
    platformFee = 0,
    taxAmount = 0,
} = {}) => {
    const s = Number(subtotal) || 0
    const d = Number(discountAmount) || 0
    const sc = Number(shippingCost) || 0
    const f = Number(platformFee) || 0
    const t = Number(taxAmount) || 0
    return Math.max(0, s - d + sc + f + t)
}

export const calculateEquivalentIdr = (amount = 0, exchangeRate = 1) => {
    const a = Number(amount) || 0
    const r = Number(exchangeRate) || 1
    return Math.round(a * r)
}

/**
 * Reactive composable for calculating financial totals for documents (PR, Direct Purchase, PO)
 *
 * @param {import('vue').Ref<Object>} form - Reactive form object containing items, discount, shipping, tax, etc.
 * @param {Object} options - Configuration options (e.g. taxesList reference)
 */
export function useFinancialCalculation(form, options = {}) {
    const itemsSubtotal = computed(() => {
        return calculateItemsSubtotal(form.value?.items || [])
    })

    const netBase = computed(() => {
        const discount = Number(form.value?.discount_amount) || 0
        return Math.max(0, itemsSubtotal.value - discount)
    })

    const grandTotal = computed(() => {
        return calculateGrandTotal({
            subtotal: itemsSubtotal.value,
            discountAmount: form.value?.discount_amount,
            shippingCost: form.value?.shipping_cost,
            platformFee: form.value?.platform_fee,
            taxAmount: form.value?.tax_amount,
        })
    })

    const equivalentIdrGrandTotal = computed(() => {
        const rate = Number(form.value?.exchange_rate) || 1
        return calculateEquivalentIdr(grandTotal.value, rate)
    })

    const recalculateTax = (taxesList = []) => {
        if (!form.value?.tax_id) {
            form.value.tax_amount = 0
            return 0
        }
        const sel = taxesList.find(t => t.id === Number(form.value.tax_id))
        if (sel) {
            const tax = calculateTaxAmount(netBase.value, sel.rate)
            form.value.tax_amount = tax
            return tax
        }
        return 0
    }

    return {
        itemsSubtotal,
        netBase,
        grandTotal,
        equivalentIdrGrandTotal,
        recalculateTax,
        calculateItemSubtotal,
        calculateItemsSubtotal,
        calculateTaxAmount,
        calculateGrandTotal,
        calculateEquivalentIdr,
    }
}
