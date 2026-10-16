import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getProcurementPlans, showProcurementPlan } from '@/services/procurementPlanServices.js'
import { getSuppliers } from '@/services/supplierServices.js'
import { searchTaxes } from '@/services/taxServices.js'
import { 
    createDirectPurchase, 
    createBulkDirectPurchase, 
    submitDirectPurchaseForPayment 
} from '@/services/directPurchaseServices.js'
import { searchCurrencies } from '@/services/currencyServices.js'
import { showLoading, showSuccess, showError, showConfirm, closeSwal } from '@/utils/swal.js'
import { formatCurrency } from '@/composables/useFormatter.js'

export function useDirectPurchaseForm() {
    const router = useRouter()
    const route = useRoute()

    // State
    const isLoadingPlans = ref(false)
    const isLoadingSuppliers = ref(false)
    const isSubmitting = ref(false)

    const isBulkMode = ref(false)
    const bulkCompany = ref(null)

    const activePlans = ref([])
    const suppliers = ref([])
    const selectedPlan = ref(null)
    const selectedPlanId = ref('')

    // Form State
    const form = ref({
        purchase_channel: 'marketplace', // 'marketplace' | 'direct_supplier' | 'retail_store'
        supplier_id: null,
        marketplace_name: 'Tokopedia',
        merchant_name: '',
        store_url: '',
        payment_method: 'marketplace_va',
        recipient_type: 'marketplace_merchant',
        recipient_name: '',
        bank_name: 'BCA Virtual Account',
        bank_account_number: '',
        bank_account_holder: '',
        currency: 'IDR',
        exchange_rate: 1,
        discount_amount: 0,
        shipping_cost: 0,
        platform_fee: 0,
        tax_id: null,
        tax_amount: 0,
        notes: '',
        items: []
    })

    // Taxes
    const taxesList = ref([])
    const isLoadingTaxes = ref(false)

    const fetchTaxesList = async () => {
        try {
            isLoadingTaxes.value = true
            const res = await searchTaxes('', null, 100)
            taxesList.value = res.data || []
        } catch (err) {
            console.error('Failed to load taxes:', err)
            taxesList.value = []
        } finally {
            isLoadingTaxes.value = false
        }
    }

    const selectedTax = computed(() => {
        if (!form.value.tax_id) return null
        return taxesList.value.find(t => t.id === Number(form.value.tax_id)) || null
    })

    const selectedTaxName = computed(() => {
        if (!selectedTax.value) return ''
        return `${selectedTax.value.code || selectedTax.value.name} (${selectedTax.value.rate}%)`
    })

    const selectedTaxRate = computed(() => {
        return selectedTax.value ? selectedTax.value.rate : null
    })

    const onTaxChange = () => {
        if (!form.value.tax_id) {
            form.value.tax_amount = 0
            return
        }
        const sel = taxesList.value.find(t => t.id === Number(form.value.tax_id))
        if (sel) {
            const netBase = Math.max(0, itemsSubtotal.value - (Number(form.value.discount_amount) || 0))
            form.value.tax_amount = Math.round((netBase * Number(sel.rate)) / 100)
        }
    }

    // Currencies
    const currenciesList = ref([])
    const isLoadingCurrencies = ref(false)

    const fetchCurrenciesList = async () => {
        try {
            isLoadingCurrencies.value = true
            const res = await searchCurrencies('', 100)
            if (res.data && res.data.length > 0) {
                currenciesList.value = res.data
            } else {
                currenciesList.value = [
                    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', exchange_rate: 1, is_base: true },
                    { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 16250, is_base: false },
                    { code: 'EUR', name: 'Euro', symbol: '€', exchange_rate: 17500, is_base: false },
                    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', exchange_rate: 12100, is_base: false }
                ]
            }
        } catch {
            currenciesList.value = [
                { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', exchange_rate: 1, is_base: true },
                { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 16250, is_base: false }
            ]
        } finally {
            isLoadingCurrencies.value = false
        }
    }

    watch(() => form.value.currency, (newCode) => {
        const found = currenciesList.value.find(c => c.code === newCode)
        if (found) {
            form.value.exchange_rate = found.exchange_rate || 1
        }
    })

    const popularMarketplaces = ['Tokopedia', 'Shopee', 'Blibli', 'Lazada', 'Bukalapak', 'Monotaro', 'Amazon']
    const popularBanks = [
        'BCA',
        'Bank Mandiri',
        'BNI',
        'BRI',
        'Permata',
        'CIMB Niaga',
        'BCA Virtual Account',
        'Mandiri Virtual Account',
        'BRIVA'
    ]

    // Financial calculations
    const itemsSubtotal = computed(() => {
        return form.value.items.reduce((sum, item) => {
            const qty = Number(item.quantity) || 0
            const price = Number(item.unit_price) || 0
            const disc = Number(item.discount_amount) || 0
            return sum + Math.max(0, (qty * price) - disc)
        }, 0)
    })

    const grandTotal = computed(() => {
        const subtotal = itemsSubtotal.value
        const discount = Number(form.value.discount_amount) || 0
        const shipping = Number(form.value.shipping_cost) || 0
        const fee = Number(form.value.platform_fee) || 0
        const tax = Number(form.value.tax_amount) || 0
        return Math.max(0, subtotal - discount + shipping + fee + tax)
    })

    const equivalentIdrGrandTotal = computed(() => {
        const rate = Number(form.value.exchange_rate) || 1
        return Math.round(grandTotal.value * rate)
    })

    watch([itemsSubtotal, () => form.value.discount_amount], () => {
        if (form.value.tax_id) {
            const sel = taxesList.value.find(t => t.id === Number(form.value.tax_id))
            if (sel) {
                const netBase = Math.max(0, itemsSubtotal.value - (Number(form.value.discount_amount) || 0))
                form.value.tax_amount = Math.round((netBase * Number(sel.rate)) / 100)
            }
        }
    })

    const planOptions = computed(() => {
        return activePlans.value.map(plan => {
            const hasQuota = plan.has_remaining_quota !== false
            const unallocatedCount = plan.unallocated_items_count !== undefined 
                ? plan.unallocated_items_count 
                : (plan.items?.length || 0)
            return {
                value: plan.id,
                label: `${plan.pp_number} • PR: ${plan.purchase_requisition?.pr_number || '-'} (${plan.items?.length || 0} Item)${!hasQuota ? ' • [KUOTA HABIS]' : ''}`,
                subtitle: `Perusahaan: ${plan.purchase_requisition?.company?.name || '-'} | Divisi: ${plan.purchase_requisition?.division?.name || '-'}${hasQuota ? ` | Sisa Kuota: ${unallocatedCount} Item` : ' | Seluruh item sudah dibeli'}`,
                disabled: !hasQuota
            }
        })
    })

    const hasExhaustedItems = computed(() => {
        return form.value.items.some(item => Number(item.allocated_qty) <= 0)
    })

    const isPlanFullyExhausted = computed(() => {
        return form.value.items.length > 0 && form.value.items.every(item => Number(item.allocated_qty) <= 0)
    })

    const uniquePrNumbers = computed(() => {
        const set = new Set()
        form.value.items.forEach(i => {
            if (i.pr_number) set.add(i.pr_number)
        })
        return Array.from(set)
    })

    const removeBulkItem = (index) => {
        form.value.items.splice(index, 1)
    }

    const cancelBulkMode = () => {
        sessionStorage.removeItem('bulk_direct_purchase_items')
        sessionStorage.removeItem('bulk_direct_purchase_company')
        isBulkMode.value = false
        bulkCompany.value = null
        form.value.items = []
        router.replace({ name: 'user.purchasing.direct.create' })
    }

    const supplierOptions = computed(() => {
        return suppliers.value.map(sup => ({
            value: sup.id,
            label: `${sup.name} (${sup.code || 'ID: ' + sup.id})`,
            subtitle: sup.email ? `Email: ${sup.email}` : (sup.phone ? `Telp: ${sup.phone}` : '')
        }))
    })

    const fetchActivePlans = async () => {
        try {
            isLoadingPlans.value = true
            const response = await getProcurementPlans({
                status: 'active',
                procurement_method: 'direct_purchase'
            }, 1, 100)
            activePlans.value = response.data || []

            const queryPlanId = route.query.plan_id
            if (queryPlanId) {
                selectedPlanId.value = Number(queryPlanId)
                await onPlanSelected()
            }
        } catch (error) {
            showError('Gagal!', 'Gagal memuat rencana pengadaan aktif.', error)
        } finally {
            isLoadingPlans.value = false
        }
    }

    const fetchSuppliers = async () => {
        try {
            isLoadingSuppliers.value = true
            const response = await getSuppliers('', 1, { is_active: 1, per_page: 100 })
            suppliers.value = response.data || []
        } catch (error) {
            console.error('Failed to load suppliers:', error)
        } finally {
            isLoadingSuppliers.value = false
        }
    }

    const onPlanSelected = async () => {
        if (!selectedPlanId.value) {
            selectedPlan.value = null
            form.value.items = []
            return
        }

        try {
            const localMatch = activePlans.value.find(p => p.id === Number(selectedPlanId.value))
            if (localMatch && !selectedPlan.value) {
                selectedPlan.value = localMatch
            }

            showLoading('Memuat rincian item rencana...')
            const response = await showProcurementPlan(selectedPlanId.value)
            const planData = response.data || response
            selectedPlan.value = planData

            if (planData?.items) {
                form.value.items = planData.items.map(item => {
                    const prItem = item.purchase_requisition_item || {}
                    const estPrice = Number(prItem.estimated_price) || 0
                    const remainingQty = item.remaining_quantity !== undefined 
                        ? Number(item.remaining_quantity) 
                        : Number(item.planned_quantity)
                    const plannedQty = Number(item.planned_quantity)

                    return {
                        procurement_plan_item_id: item.id,
                        item_id: prItem.item_id || null,
                        unit_id: prItem.unit_id || null,
                        item_name: prItem.item_name || prItem.item?.name || 'Item Pengadaan',
                        detail_name: prItem.detail_name || '',
                        item_code: prItem.item_code || prItem.item?.code || '',
                        is_custom_item: prItem.is_custom_item || !prItem.item_id,
                        unit_name: prItem.unit?.code || prItem.unit_code || 'Unit',
                        planned_qty: plannedQty,
                        allocated_qty: remainingQty,
                        quantity: remainingQty > 0 ? remainingQty : 0,
                        unit_price: estPrice > 0 ? estPrice : '',
                        discount_amount: 0,
                        product_url: prItem.reference_url || '',
                        notes: item.notes || '',
                        error: remainingQty <= 0 ? 'Sisa kuota item ini sudah habis (0.0000)' : ''
                    }
                })
            }
            closeSwal()
        } catch (error) {
            console.error('Failed to load procurement plan detail:', error)
            showError('Gagal!', 'Gagal memuat detail rencana pengadaan.', error)
            selectedPlan.value = null
            form.value.items = []
        }
    }

    watch(() => form.value.purchase_channel, (newChannel) => {
        if (newChannel === 'marketplace') {
            form.value.payment_method = 'marketplace_va'
            form.value.recipient_type = 'marketplace_merchant'
            if (form.value.merchant_name && !form.value.recipient_name) {
                form.value.recipient_name = form.value.merchant_name
                form.value.bank_account_holder = form.value.merchant_name
            }
            if (!form.value.bank_name || form.value.bank_name === 'Bank Mandiri') {
                form.value.bank_name = 'BCA Virtual Account'
            }
        } else if (newChannel === 'direct_supplier') {
            form.value.payment_method = 'bank_transfer'
            form.value.recipient_type = 'supplier'
            if (form.value.bank_name?.includes('Virtual Account')) {
                form.value.bank_name = 'Bank Mandiri'
            }
        } else if (newChannel === 'retail_store') {
            form.value.payment_method = 'bank_transfer'
            form.value.recipient_type = 'other'
            if (form.value.merchant_name && !form.value.recipient_name) {
                form.value.recipient_name = form.value.merchant_name
                form.value.bank_account_holder = form.value.merchant_name
            }
        }
    })

    watch(() => form.value.merchant_name, (newName) => {
        if (['marketplace', 'retail_store'].includes(form.value.purchase_channel)) {
            if (!form.value.recipient_name || form.value.recipient_name === form.value.bank_account_holder) {
                form.value.recipient_name = newName || ''
                form.value.bank_account_holder = newName || ''
            }
        }
    })

    watch(() => form.value.supplier_id, (newSupId) => {
        if (form.value.purchase_channel === 'direct_supplier' && newSupId) {
            const found = suppliers.value.find(s => s.id === Number(newSupId))
            if (found) {
                form.value.recipient_name = found.name || ''
                form.value.bank_account_holder = found.bank_account_holder || found.name || ''
                if (found.bank_name) form.value.bank_name = found.bank_name
                if (found.bank_account_number) form.value.bank_account_number = found.bank_account_number
            }
        }
    })

    const validateForm = (shouldSubmitForPayment = false) => {
        if (!isBulkMode.value && !selectedPlanId.value) {
            showError('Validasi Gagal', 'Silakan pilih Rencana Pengadaan terlebih dahulu.')
            return false
        }

        if (form.value.purchase_channel === 'marketplace') {
            if (!form.value.marketplace_name?.trim()) {
                showError('Validasi Gagal', 'Nama Marketplace (Tokopedia, Shopee, dll) wajib diisi.')
                return false
            }
            if (!form.value.merchant_name?.trim()) {
                showError('Validasi Gagal', 'Nama Toko / Official Store di marketplace wajib diisi.')
                return false
            }
        } else if (form.value.purchase_channel === 'direct_supplier') {
            if (!form.value.supplier_id) {
                showError('Validasi Gagal', 'Supplier / Vendor rekanan wajib dipilih.')
                return false
            }
        } else if (form.value.purchase_channel === 'retail_store') {
            if (!form.value.merchant_name?.trim()) {
                showError('Validasi Gagal', 'Nama Toko Retail / Supermarket wajib diisi.')
                return false
            }
        }

        if (!form.value.items || form.value.items.length === 0) {
            showError('Validasi Gagal', 'Rencana pengadaan belum memiliki item untuk dibeli.')
            return false
        }

        if (isPlanFullyExhausted.value) {
            showError('Validasi Gagal', 'Seluruh kuota pada Rencana Pengadaan ini sudah dialokasikan ke Direct Purchase sebelumnya. Tidak ada kuota tersisa untuk membuat pembelian baru.')
            return false
        }

        let hasItemError = false
        form.value.items.forEach((item) => {
            if (Number(item.allocated_qty) <= 0) {
                item.error = 'Sisa kuota item ini sudah habis (0.0000)'
                hasItemError = true
            } else if (!item.quantity || Number(item.quantity) <= 0) {
                item.error = 'Kuantitas harus > 0'
                hasItemError = true
            } else if (Number(item.quantity) > Number(item.allocated_qty)) {
                item.error = `Maks. sisa alokasi ${item.allocated_qty}`
                hasItemError = true
            } else if (item.unit_price === '' || Number(item.unit_price) < 0) {
                item.error = 'Harga satuan tidak boleh kosong'
                hasItemError = true
            } else {
                item.error = ''
            }
        })

        if (hasItemError) {
            showError('Validasi Gagal', 'Mohon periksa kuantitas dan harga satuan pada daftar item barang.')
            return false
        }

        if (shouldSubmitForPayment) {
            if (!form.value.payment_method) {
                showError('Validasi Gagal', 'Silakan pilih metode pembayaran.')
                return false
            }
            if (form.value.payment_method !== 'cash') {
                if (!form.value.bank_name?.trim()) {
                    showError('Validasi Gagal', 'Nama Bank / Provider VA wajib diisi.')
                    return false
                }
                if (!form.value.bank_account_number?.trim()) {
                    showError('Validasi Gagal', 'Nomor Rekening / Virtual Account wajib diisi.')
                    return false
                }
            }
        }

        return true
    }

    const handleSubmit = async (shouldSubmitForPayment = false) => {
        if (!validateForm(shouldSubmitForPayment)) return

        const channelTitle = form.value.purchase_channel === 'marketplace' 
            ? `${form.value.marketplace_name} (${form.value.merchant_name})`
            : (form.value.purchase_channel === 'direct_supplier' ? 'Supplier Rekanan' : form.value.merchant_name)

        const confirmTitle = shouldSubmitForPayment ? 'Simpan & Ajukan Pembayaran?' : 'Simpan Draft Pembelian?'
        const confirmText = shouldSubmitForPayment
            ? `Direct Purchase senilai ${formatCurrency(grandTotal.value, form.value.currency)}${form.value.currency !== 'IDR' ? ` (setara ${formatCurrency(equivalentIdrGrandTotal.value, 'IDR')})` : ''} melalui ${channelTitle} akan langsung diajukan ke bagian keuangan untuk proses verifikasi pembayaran.`
            : `Direct Purchase senilai ${formatCurrency(grandTotal.value, form.value.currency)}${form.value.currency !== 'IDR' ? ` (setara ${formatCurrency(equivalentIdrGrandTotal.value, 'IDR')})` : ''} akan disimpan sebagai draft.`
        const confirmBtnText = shouldSubmitForPayment ? 'Ya, Ajukan Pembayaran' : 'Ya, Simpan Draft'

        const confirmed = await showConfirm(confirmTitle, confirmText, confirmBtnText, 'Batal', '#4f46e5')
        if (!confirmed) return

        try {
            isSubmitting.value = true
            showLoading(shouldSubmitForPayment ? 'Menyimpan & mengajukan pembayaran...' : 'Menyimpan draft pembelian...')

            if (isBulkMode.value) {
                const payload = {
                    company_id: bulkCompany.value?.id || null,
                    purchase_channel: form.value.purchase_channel,
                    supplier_id: form.value.purchase_channel === 'direct_supplier' ? Number(form.value.supplier_id) : null,
                    marketplace_name: form.value.purchase_channel === 'marketplace' ? form.value.marketplace_name?.trim() : null,
                    merchant_name: form.value.merchant_name ? form.value.merchant_name.trim() : null,
                    store_url: form.value.store_url ? form.value.store_url.trim() : null,
                    payment_method: form.value.payment_method,
                    recipient_type: form.value.recipient_type,
                    recipient_name: form.value.recipient_name ? form.value.recipient_name.trim() : null,
                    bank_name: form.value.bank_name ? form.value.bank_name.trim() : null,
                    bank_account_number: form.value.bank_account_number ? form.value.bank_account_number.trim() : null,
                    bank_account_holder: form.value.bank_account_holder ? form.value.bank_account_holder.trim() : null,
                    currency: form.value.currency || 'IDR',
                    exchange_rate: Number(form.value.exchange_rate) || 1,
                    discount_amount: Number(form.value.discount_amount) || 0,
                    shipping_cost: Number(form.value.shipping_cost) || 0,
                    platform_fee: Number(form.value.platform_fee) || 0,
                    tax_id: form.value.tax_id ? Number(form.value.tax_id) : null,
                    tax_amount: Number(form.value.tax_amount) || 0,
                    notes: form.value.notes ? form.value.notes.trim() : null,
                    submit_for_payment: shouldSubmitForPayment,
                    items: form.value.items.map(item => ({
                        purchase_requisition_item_id: Number(item.purchase_requisition_item_id),
                        item_id: item.item_id ? Number(item.item_id) : null,
                        unit_id: item.unit_id ? Number(item.unit_id) : null,
                        description: item.item_name,
                        quantity: Number(item.quantity),
                        unit_price: Number(item.unit_price),
                        discount_amount: Number(item.discount_amount) || 0,
                        product_url: item.product_url ? item.product_url.trim() : null,
                        notes: item.notes ? item.notes.trim() : null
                    }))
                }

                const createRes = await createBulkDirectPurchase(payload)
                const dpNumber = createRes.data?.dp_number || createRes.dp_number || ''

                sessionStorage.removeItem('bulk_direct_purchase_items')
                sessionStorage.removeItem('bulk_direct_purchase_company')

                if (shouldSubmitForPayment) {
                    showSuccess('Berhasil!', `Bulk Direct Purchase ${dpNumber} berhasil dibuat dan diajukan untuk pembayaran Finance.`)
                } else {
                    showSuccess('Berhasil!', `Bulk Direct Purchase ${dpNumber} berhasil disimpan sebagai Draft.`)
                }

                router.push({ name: 'user.purchasing.direct' })
                return
            }

            const payload = {
                procurement_plan_id: Number(selectedPlanId.value),
                purchase_channel: form.value.purchase_channel,
                supplier_id: form.value.purchase_channel === 'direct_supplier' ? Number(form.value.supplier_id) : null,
                marketplace_name: form.value.purchase_channel === 'marketplace' ? form.value.marketplace_name?.trim() : null,
                merchant_name: form.value.merchant_name ? form.value.merchant_name.trim() : null,
                store_url: form.value.store_url ? form.value.store_url.trim() : null,
                payment_method: form.value.payment_method,
                recipient_type: form.value.recipient_type,
                recipient_name: form.value.recipient_name ? form.value.recipient_name.trim() : null,
                bank_name: form.value.bank_name ? form.value.bank_name.trim() : null,
                bank_account_number: form.value.bank_account_number ? form.value.bank_account_number.trim() : null,
                bank_account_holder: form.value.bank_account_holder ? form.value.bank_account_holder.trim() : null,
                currency: form.value.currency || 'IDR',
                exchange_rate: Number(form.value.exchange_rate) || 1,
                discount_amount: Number(form.value.discount_amount) || 0,
                shipping_cost: Number(form.value.shipping_cost) || 0,
                platform_fee: Number(form.value.platform_fee) || 0,
                tax_id: form.value.tax_id ? Number(form.value.tax_id) : null,
                tax_amount: Number(form.value.tax_amount) || 0,
                notes: form.value.notes ? form.value.notes.trim() : null,
                items: form.value.items.map(item => ({
                    procurement_plan_item_id: Number(item.procurement_plan_item_id),
                    item_id: item.item_id ? Number(item.item_id) : null,
                    unit_id: item.unit_id ? Number(item.unit_id) : null,
                    description: item.item_name,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    discount_amount: Number(item.discount_amount) || 0,
                    product_url: item.product_url ? item.product_url.trim() : null,
                    notes: item.notes ? item.notes.trim() : null
                }))
            }

            const createRes = await createDirectPurchase(payload)
            const dpId = createRes.data?.id || createRes.id
            const dpNumber = createRes.data?.dp_number || createRes.dp_number || ''

            if (shouldSubmitForPayment && dpId) {
                await submitDirectPurchaseForPayment(dpId, {
                    payment_method: form.value.payment_method,
                    recipient_type: form.value.recipient_type,
                    recipient_name: form.value.recipient_name ? form.value.recipient_name.trim() : null,
                    bank_name: form.value.bank_name ? form.value.bank_name.trim() : null,
                    bank_account_number: form.value.bank_account_number ? form.value.bank_account_number.trim() : null,
                    bank_account_holder: form.value.bank_account_holder ? form.value.bank_account_holder.trim() : null,
                    notes: form.value.notes ? form.value.notes.trim() : null
                })
                showSuccess('Berhasil!', `Direct Purchase ${dpNumber} berhasil dibuat dan diajukan untuk pembayaran.`)
            } else {
                showSuccess('Berhasil!', `Direct Purchase ${dpNumber} berhasil disimpan sebagai Draft.`)
            }

            router.push({ name: 'user.purchasing.direct' })
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Terjadi kesalahan saat memproses Direct Purchase.'
            showError('Gagal Menyimpan!', errorMsg, error)
        } finally {
            isSubmitting.value = false
        }
    }

    return {
        // State
        router,
        route,
        isLoadingPlans,
        isLoadingSuppliers,
        isSubmitting,
        isBulkMode,
        bulkCompany,
        activePlans,
        suppliers,
        selectedPlan,
        selectedPlanId,
        form,
        taxesList,
        isLoadingTaxes,
        currenciesList,
        isLoadingCurrencies,
        popularMarketplaces,
        popularBanks,

        // Computeds
        itemsSubtotal,
        grandTotal,
        equivalentIdrGrandTotal,
        planOptions,
        hasExhaustedItems,
        isPlanFullyExhausted,
        uniquePrNumbers,
        supplierOptions,
        selectedTax,
        selectedTaxName,
        selectedTaxRate,

        // Actions
        fetchActivePlans,
        fetchSuppliers,
        fetchCurrenciesList,
        fetchTaxesList,
        onPlanSelected,
        onTaxChange,
        removeBulkItem,
        cancelBulkMode,
        validateForm,
        handleSubmit,
    }
}
