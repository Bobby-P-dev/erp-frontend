<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { showProcurementPlan } from '../../services/procurementPlanServices.js'
import { getSuppliers } from '../../services/supplierServices.js'
import { searchCurrencies } from '../../services/currencyServices.js'
import { 
    showDirectPurchase, 
    updateDirectPurchase, 
    submitDirectPurchaseForPayment 
} from '../../services/directPurchaseServices.js'
import { showLoading, showSuccess, showError, showConfirm, closeSwal } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import SearchableSelect from '../../components/ui/SearchableSelect.vue'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    ShoppingCart,
    Store,
    Building2,
    Save,
    Send,
    ExternalLink,
    AlertCircle,
    Package,
    DollarSign,
    Layers,
    FileText,
    Truck,
    Receipt,
    Check,
    Tag,
    CreditCard,
    Landmark,
    Wallet,
    Pencil,
    Trash2,
    Plus,
    Info,
    Coins
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const dpId = route.params.id

// Loading States
const isLoading = ref(true)
const isLoadingSuppliers = ref(false)
const isSubmitting = ref(false)

// Data References
const dpData = ref(null)
const procurementPlan = ref(null)
const suppliers = ref([])
const selectedExtraPlanItemId = ref('')

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
    tax_amount: 0,
    notes: '',
    items: []
})

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

// Financial Calculations
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
    const headerDiscount = Number(form.value.discount_amount) || 0
    const shipping = Number(form.value.shipping_cost) || 0
    const fee = Number(form.value.platform_fee) || 0
    const tax = Number(form.value.tax_amount) || 0
    return Math.max(0, subtotal - headerDiscount + shipping + fee + tax)
})

const equivalentIdrGrandTotal = computed(() => {
    const rate = Number(form.value.exchange_rate) || 1
    return Math.round(grandTotal.value * rate)
})

// Searchable options for Registered Suppliers
const supplierOptions = computed(() => {
    return suppliers.value.map(sup => ({
        value: sup.id,
        label: `${sup.name} (${sup.code || 'ID: ' + sup.id})`,
        subtitle: sup.email ? `Email: ${sup.email}` : (sup.phone ? `Telp: ${sup.phone}` : '')
    }))
})

// Plan items from Procurement Plan that are NOT yet added to this draft and still have quota
const availableUnaddedPlanItems = computed(() => {
    if (!procurementPlan.value?.items) return []
    const currentPlanItemIds = form.value.items.map(i => Number(i.procurement_plan_item_id))
    return procurementPlan.value.items.filter(item => {
        return !currentPlanItemIds.includes(Number(item.id)) && Number(item.remaining_quantity) > 0
    })
})

const extraPlanItemOptions = computed(() => {
    return availableUnaddedPlanItems.value.map(item => {
        const prItem = item.purchase_requisition_item || {}
        const itemName = prItem.item_name || prItem.item?.name || 'Item Pengadaan'
        return {
            value: item.id,
            label: `${itemName} (Sisa Kuota: ${item.remaining_quantity} ${prItem.unit?.code || 'Unit'})`,
            subtitle: `Estimasi Harga: ${formatCurrency(prItem.estimated_price || 0)}`
        }
    })
})

// Fetch Data on Mount
const loadDirectPurchaseData = async () => {
    try {
        isLoading.value = true
        showLoading('Memuat data draft transaksi...')

        // Fetch DP and Suppliers in parallel
        const [dpResponse, supplierResponse] = await Promise.all([
            showDirectPurchase(dpId),
            getSuppliers('', 1, { is_active: 1, per_page: 100 }).catch(err => {
                console.error('Failed to load suppliers:', err)
                return { data: [] }
            })
        ])

        const dp = dpResponse.data || dpResponse
        dpData.value = dp
        suppliers.value = supplierResponse.data || []

        // Guard: only draft status can be edited
        if (dp.status !== 'draft') {
            closeSwal()
            await showError(
                'Akses Ditolak', 
                `Transaksi ${dp.dp_number} berstatus "${dp.status}" dan tidak dapat diedit lagi. Hanya draft yang dapat disunting.`
            )
            router.push({ name: 'user.purchasing.direct.detail', params: { id: dpId } })
            return
        }

        // Fetch associated Procurement Plan to get latest item quotas
        if (dp.procurement_plan_id) {
            const planResponse = await showProcurementPlan(dp.procurement_plan_id)
            procurementPlan.value = planResponse.data || planResponse
        }

        // Populate Form Fields
        form.value.purchase_channel = dp.purchase_channel || 'marketplace'
        form.value.supplier_id = dp.supplier_id || null
        form.value.marketplace_name = dp.marketplace_name || 'Tokopedia'
        form.value.merchant_name = dp.merchant_name || ''
        form.value.store_url = dp.store_url || ''
        form.value.payment_method = dp.payment_method || 'marketplace_va'
        form.value.recipient_type = dp.recipient_type || 'marketplace_merchant'
        form.value.recipient_name = dp.recipient_name || ''
        form.value.bank_name = dp.bank_name || ''
        form.value.bank_account_number = dp.bank_account_number || ''
        form.value.bank_account_holder = dp.bank_account_holder || ''
        form.value.currency = dp.currency || 'IDR'
        form.value.exchange_rate = Number(dp.exchange_rate) || 1
        form.value.discount_amount = Number(dp.discount_amount) || 0
        form.value.shipping_cost = Number(dp.shipping_cost) || 0
        form.value.platform_fee = Number(dp.platform_fee) || 0
        form.value.tax_amount = Number(dp.tax_amount) || 0
        form.value.notes = dp.notes || ''

        // Populate Items with self-excluded available quota calculation
        const planItemsMap = new Map()
        if (procurementPlan.value?.items) {
            procurementPlan.value.items.forEach(pi => {
                planItemsMap.set(Number(pi.id), pi)
            })
        }

        form.value.items = (dp.items || []).map(dpItem => {
            const planItem = planItemsMap.get(Number(dpItem.procurement_plan_item_id))
            const prItem = planItem?.purchase_requisition_item || dpItem.item || {}
            
            // Available quota: current draft item qty + remaining quota in plan
            const currentItemQty = Number(dpItem.quantity) || 0
            const planRemaining = planItem?.remaining_quantity !== undefined 
                ? Number(planItem.remaining_quantity) 
                : Number(planItem?.planned_quantity || currentItemQty)
            const maxAllowedQuota = Number((planRemaining + currentItemQty).toFixed(4))
            const plannedQty = Number(planItem?.planned_quantity || currentItemQty)

            return {
                procurement_plan_item_id: dpItem.procurement_plan_item_id,
                item_id: dpItem.item_id || prItem.item_id || null,
                unit_id: dpItem.unit_id || prItem.unit_id || null,
                item_name: dpItem.description || prItem.item_name || prItem.name || 'Item Pengadaan',
                detail_name: prItem.detail_name || '',
                item_code: prItem.code || prItem.item_code || '',
                is_custom_item: !dpItem.item_id,
                unit_name: dpItem.unit?.code || prItem.unit?.code || 'Unit',
                planned_qty: plannedQty,
                allocated_qty: maxAllowedQuota, // Max allowed for this draft
                quantity: currentItemQty,
                unit_price: Number(dpItem.unit_price) || 0,
                discount_amount: Number(dpItem.discount_amount) || 0,
                product_url: dpItem.product_url || '',
                notes: dpItem.notes || '',
                error: ''
            }
        })

        closeSwal()
    } catch (error) {
        console.error('Failed to load draft direct purchase for editing:', error)
        closeSwal()
        showError('Gagal!', 'Gagal memuat rincian transaksi direct purchase.', error)
        router.push({ name: 'user.purchasing.direct' })
    } finally {
        isLoading.value = false
    }
}

// Add Extra Item from Procurement Plan
const handleAddPlanItem = () => {
    if (!selectedExtraPlanItemId.value) return
    const planItem = procurementPlan.value?.items?.find(i => Number(i.id) === Number(selectedExtraPlanItemId.value))
    if (!planItem) return

    const prItem = planItem.purchase_requisition_item || {}
    const remainingQty = Number(planItem.remaining_quantity) || 0
    const estPrice = Number(prItem.estimated_price) || 0

    form.value.items.push({
        procurement_plan_item_id: planItem.id,
        item_id: prItem.item_id || null,
        unit_id: prItem.unit_id || null,
        item_name: prItem.item_name || prItem.item?.name || 'Item Pengadaan',
        detail_name: prItem.detail_name || '',
        item_code: prItem.item_code || prItem.item?.code || '',
        is_custom_item: prItem.is_custom_item || !prItem.item_id,
        unit_name: prItem.unit?.code || prItem.unit_code || 'Unit',
        planned_qty: Number(planItem.planned_quantity),
        allocated_qty: remainingQty,
        quantity: remainingQty > 0 ? remainingQty : 1,
        unit_price: estPrice > 0 ? estPrice : 0,
        discount_amount: 0,
        product_url: prItem.reference_url || '',
        notes: planItem.notes || '',
        error: ''
    })

    selectedExtraPlanItemId.value = ''
}

// Remove item from draft
const handleRemoveItem = (index) => {
    if (form.value.items.length <= 1) {
        showError('Peringatan', 'Minimal harus ada 1 item barang dalam transaksi.')
        return
    }
    form.value.items.splice(index, 1)
}

// Channel changes watcher
watch(() => form.value.purchase_channel, (newChannel) => {
    if (newChannel === 'marketplace') {
        if (!form.value.payment_method || form.value.payment_method === 'cash') {
            form.value.payment_method = 'marketplace_va'
        }
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

// Auto sync recipient_name from merchant_name if in marketplace or retail
watch(() => form.value.merchant_name, (newName) => {
    if (['marketplace', 'retail_store'].includes(form.value.purchase_channel)) {
        if (!form.value.recipient_name || form.value.recipient_name === form.value.bank_account_holder) {
            form.value.recipient_name = newName || ''
            form.value.bank_account_holder = newName || ''
        }
    }
})

// Auto populate supplier info when supplier selected
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

// Validation
const validateForm = (shouldSubmitForPayment = false) => {
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
        showError('Validasi Gagal', 'Transaksi harus memiliki minimal 1 item barang.')
        return false
    }

    let hasItemError = false
    form.value.items.forEach((item) => {
        const qty = Number(item.quantity)
        const maxQuota = Number(item.allocated_qty)

        if (!item.quantity || qty <= 0) {
            item.error = 'Kuantitas harus > 0'
            hasItemError = true
        } else if (maxQuota > 0 && qty > maxQuota) {
            item.error = `Maks. alokasi kuota ${maxQuota}`
            hasItemError = true
        } else if (item.unit_price === '' || Number(item.unit_price) < 0) {
            item.error = 'Harga satuan tidak boleh kosong atau negatif'
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

// Handle Form Submission
const handleSubmit = async (shouldSubmitForPayment = false) => {
    if (!validateForm(shouldSubmitForPayment)) return

    const channelTitle = form.value.purchase_channel === 'marketplace' 
        ? `${form.value.marketplace_name} (${form.value.merchant_name})`
        : (form.value.purchase_channel === 'direct_supplier' ? 'Supplier Rekanan' : form.value.merchant_name)

    const confirmTitle = shouldSubmitForPayment ? 'Simpan & Ajukan Pembayaran?' : 'Simpan Perubahan Draft?'
    const confirmText = shouldSubmitForPayment
        ? `Perubahan transaksi ${dpData.value?.dp_number} senilai ${formatCurrency(grandTotal.value, form.value.currency)} melalui ${channelTitle} akan disimpan dan langsung diajukan ke bagian keuangan untuk verifikasi pembayaran.`
        : `Perubahan rincian pada draft ${dpData.value?.dp_number} senilai ${formatCurrency(grandTotal.value, form.value.currency)} akan disimpan.`
    const confirmBtnText = shouldSubmitForPayment ? 'Ya, Ajukan Pembayaran' : 'Ya, Simpan Perubahan'

    const confirmed = await showConfirm(confirmTitle, confirmText, confirmBtnText, 'Batal', '#4f46e5')
    if (!confirmed) return

    try {
        isSubmitting.value = true
        showLoading(shouldSubmitForPayment ? 'Menyimpan & mengajukan pembayaran...' : 'Menyimpan perubahan draft...')

        const payload = {
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

        await updateDirectPurchase(dpId, payload)

        if (shouldSubmitForPayment) {
            await submitDirectPurchaseForPayment(dpId, {
                payment_method: form.value.payment_method,
                recipient_type: form.value.recipient_type,
                recipient_name: form.value.recipient_name ? form.value.recipient_name.trim() : null,
                bank_name: form.value.bank_name ? form.value.bank_name.trim() : null,
                bank_account_number: form.value.bank_account_number ? form.value.bank_account_number.trim() : null,
                bank_account_holder: form.value.bank_account_holder ? form.value.bank_account_holder.trim() : null,
                notes: form.value.notes ? form.value.notes.trim() : null
            })
            showSuccess('Berhasil!', `Draft ${dpData.value?.dp_number} berhasil diperbarui dan diajukan untuk proses pembayaran.`)
        } else {
            showSuccess('Berhasil!', `Perubahan pada draft ${dpData.value?.dp_number} berhasil disimpan.`)
        }

        router.push({ name: 'user.purchasing.direct.detail', params: { id: dpId } })
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan perubahan Direct Purchase.'
        showError('Gagal Menyimpan!', errorMsg, error)
    } finally {
        isSubmitting.value = false
    }
}

onMounted(() => {
    fetchCurrenciesList()
    loadDirectPurchaseData()
})
</script>

<template>
    <div class="space-y-6 w-full pb-16">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Direct Purchases', to: { name: 'user.purchasing.direct' } },
                { label: dpData?.dp_number || 'Detail', to: { name: 'user.purchasing.direct.detail', params: { id: dpId } } },
                { label: 'Edit Draft' }
            ]" 
        />

        <!-- Loading Skeleton -->
        <div v-if="isLoading" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-3">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p class="text-sm font-semibold text-gray-600">Memuat data draft transaksi...</p>
        </div>

        <template v-else>
            <!-- Page Header -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <RouterLink :to="{ name: 'user.purchasing.direct.detail', params: { id: dpId } }" class="text-gray-400 hover:text-gray-600">
                        <ArrowLeft class="w-6 h-6" />
                    </RouterLink>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-2xl font-bold text-gray-900">Edit Draft Direct Purchase</h2>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Draft
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1 font-mono">
                            {{ dpData?.dp_number }} • Rencana: {{ procurementPlan?.pp_number || '-' }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Context Banner -->
            <div class="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <Info class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div class="text-xs text-indigo-900 leading-relaxed">
                    <span class="font-bold">Mode Penyuntingan Draft:</span> Anda sedang mengubah rincian barang, harga aktual, saluran pembelian, atau instruksi pembayaran. Kuantitas maksimum yang tersedia telah dihitung dengan mengecualikan alokasi draft ini dari rencana pengadaan, sehingga Anda dapat menambah atau mengurangi kuantitas secara fleksibel tanpa terblokir.
                </div>
            </div>

            <form @submit.prevent="handleSubmit(false)" class="space-y-6">
                <!-- SECTION 1: Rencana Pengadaan (Readonly Context) -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            1
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-gray-900">Rencana Pengadaan Terkait (Procurement Plan)</h3>
                            <p class="text-xs text-gray-500">Rencana pengadaan yang menjadi dasar alokasi pengadaan langsung ini.</p>
                        </div>
                    </div>

                    <!-- Readonly Selected Plan Details -->
                    <div class="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                            <span class="text-gray-400 font-medium block">Nomor PP:</span>
                            <span class="font-bold font-mono text-gray-900">{{ procurementPlan?.pp_number || '-' }}</span>
                        </div>
                        <div>
                            <span class="text-gray-400 font-medium block">Nomor PR:</span>
                            <span class="font-bold font-mono text-gray-900">{{ procurementPlan?.purchase_requisition?.pr_number || '-' }}</span>
                        </div>
                        <div>
                            <span class="text-gray-400 font-medium block">Perusahaan:</span>
                            <span class="font-semibold text-gray-800">{{ procurementPlan?.purchase_requisition?.company?.name || '-' }}</span>
                        </div>
                        <div>
                            <span class="text-gray-400 font-medium block">Divisi:</span>
                            <span class="font-semibold text-gray-800">{{ procurementPlan?.purchase_requisition?.division?.name || '-' }}</span>
                        </div>
                    </div>
                </div>

                <!-- SECTION 2: Saluran & Informasi Toko (Channel) -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            2
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-gray-900">Saluran Pembelian & Rekanan (Purchase Channel)</h3>
                            <p class="text-xs text-gray-500">Pilih platform atau tempat pembelian barang ini dilakukan.</p>
                        </div>
                    </div>

                    <!-- Channel Option Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Marketplace Online -->
                        <div 
                            @click="form.purchase_channel = 'marketplace'"
                            class="p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                            :class="form.purchase_channel === 'marketplace' ? 'border-orange-500 bg-orange-50/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'"
                        >
                            <div class="flex items-start justify-between">
                                <div class="p-2.5 rounded-xl" :class="form.purchase_channel === 'marketplace' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'">
                                    <Store class="w-5 h-5" />
                                </div>
                                <span v-if="form.purchase_channel === 'marketplace'" class="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs">
                                    <Check class="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                            </div>
                            <div class="mt-3">
                                <h4 class="font-bold text-sm text-gray-900">Marketplace Online</h4>
                                <p class="text-[11px] text-gray-500 mt-1">Pembelian melalui Tokopedia, Shopee, Blibli, Lazada, dsb.</p>
                            </div>
                        </div>

                        <!-- Direct Supplier -->
                        <div 
                            @click="form.purchase_channel = 'direct_supplier'"
                            class="p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                            :class="form.purchase_channel === 'direct_supplier' ? 'border-indigo-600 bg-indigo-50/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'"
                        >
                            <div class="flex items-start justify-between">
                                <div class="p-2.5 rounded-xl" :class="form.purchase_channel === 'direct_supplier' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'">
                                    <Building2 class="w-5 h-5" />
                                </div>
                                <span v-if="form.purchase_channel === 'direct_supplier'" class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                                    <Check class="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                            </div>
                            <div class="mt-3">
                                <h4 class="font-bold text-sm text-gray-900">Supplier Rekanan Resmi</h4>
                                <p class="text-[11px] text-gray-500 mt-1">Pembelian langsung ke supplier/vendor terdaftar di master data.</p>
                            </div>
                        </div>

                        <!-- Retail Store -->
                        <div 
                            @click="form.purchase_channel = 'retail_store'"
                            class="p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                            :class="form.purchase_channel === 'retail_store' ? 'border-emerald-600 bg-emerald-50/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'"
                        >
                            <div class="flex items-start justify-between">
                                <div class="p-2.5 rounded-xl" :class="form.purchase_channel === 'retail_store' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'">
                                    <ShoppingCart class="w-5 h-5" />
                                </div>
                                <span v-if="form.purchase_channel === 'retail_store'" class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                                    <Check class="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                            </div>
                            <div class="mt-3">
                                <h4 class="font-bold text-sm text-gray-900">Toko Retail / Fisik</h4>
                                <p class="text-[11px] text-gray-500 mt-1">Toko fisik offline seperti Ace Hardware, Mitra10, toko lokal.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Channel Specific Input Fields -->
                    <div class="pt-4 border-t border-gray-100 space-y-4">
                        <!-- Marketplace Fields -->
                        <template v-if="form.purchase_channel === 'marketplace'">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-2">
                                        Platform Marketplace <span class="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        v-model="form.marketplace_name" 
                                        placeholder="Contoh: Tokopedia, Shopee"
                                        class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500"
                                    />
                                    <div class="flex items-center gap-1.5 flex-wrap mt-2">
                                        <span class="text-[10px] text-gray-400">Pilihan cepat:</span>
                                        <button 
                                            type="button" 
                                            v-for="mp in popularMarketplaces" 
                                            :key="mp" 
                                            @click="form.marketplace_name = mp"
                                            class="px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors"
                                            :class="form.marketplace_name === mp ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'"
                                        >
                                            {{ mp }}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-2">
                                        Nama Toko / Official Store <span class="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        v-model="form.merchant_name" 
                                        placeholder="Contoh: Logitech Official Store, Toko Elektronik Jaya"
                                        class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 mb-2">Tautan Profil Toko (Store URL)</label>
                                <input 
                                    type="url" 
                                    v-model="form.store_url" 
                                    placeholder="https://www.tokopedia.com/logitechofficial"
                                    class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-mono text-xs"
                                />
                            </div>
                        </template>

                        <!-- Direct Supplier Field -->
                        <template v-else-if="form.purchase_channel === 'direct_supplier'">
                            <div>
                                <SearchableSelect
                                    v-model="form.supplier_id"
                                    label="Pilih Supplier Terdaftar"
                                    :options="supplierOptions"
                                    placeholder="-- Cari atau Pilih Supplier Rekanan --"
                                    searchPlaceholder="Ketik nama atau kode supplier..."
                                    required
                                    :loading="isLoadingSuppliers"
                                    clearable
                                />
                            </div>
                        </template>

                        <!-- Retail Store Field -->
                        <template v-else-if="form.purchase_channel === 'retail_store'">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-2">
                                        Nama Toko Retail / Supermarket <span class="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        v-model="form.merchant_name" 
                                        placeholder="Contoh: Ace Hardware Living World, Toko Bangunan Subur"
                                        class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-2">Website / Lokasi Toko</label>
                                    <input 
                                        type="text" 
                                        v-model="form.store_url" 
                                        placeholder="Contoh: https://www.acehardware.co.id atau Jl. Boulevard No. 12"
                                        class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-xs"
                                    />
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- SECTION 3: Rincian Barang & Realisasi Harga -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div class="flex items-center justify-between pb-4 border-b border-gray-100 flex-wrap gap-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                3
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-gray-900">Rincian Barang & Realisasi Harga Beli</h3>
                                <p class="text-xs text-gray-500">Sesuaikan kuantitas dan harga satuan aktual pembelian di toko/marketplace.</p>
                            </div>
                        </div>

                        <!-- Add Extra Items if available -->
                        <div v-if="availableUnaddedPlanItems.length > 0" class="flex items-center gap-2">
                            <select 
                                v-model="selectedExtraPlanItemId"
                                class="text-xs p-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 max-w-xs"
                            >
                                <option value="">-- Tambah Item dari Rencana --</option>
                                <option v-for="opt in extraPlanItemOptions" :key="opt.value" :value="opt.value">
                                    {{ opt.label }}
                                </option>
                            </select>
                            <button
                                type="button"
                                @click="handleAddPlanItem"
                                :disabled="!selectedExtraPlanItemId"
                                class="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                <Plus class="w-3.5 h-3.5" />
                                <span>Tambah</span>
                            </button>
                        </div>
                    </div>

                    <div v-if="form.items.length === 0" class="py-10 text-center text-gray-400">
                        <Package class="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p class="text-sm font-semibold text-gray-600">Belum Ada Item Terpilih</p>
                        <p class="text-xs text-gray-400 mt-1">Tambahkan item dari rencana pengadaan di atas.</p>
                    </div>

                    <!-- Items Table -->
                    <div v-else class="space-y-3">
                        <div class="overflow-x-auto border border-gray-100 rounded-xl">
                            <table class="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr class="bg-gray-50/80 border-b border-gray-100 font-bold text-gray-700 uppercase tracking-wider">
                                        <th class="px-4 py-3 min-w-[240px]">Barang / Item</th>
                                        <th class="px-4 py-3 text-right w-28">Batas Kuota</th>
                                        <th class="px-4 py-3 w-36">Kuantitas Beli</th>
                                        <th class="px-4 py-3 w-44">Harga Satuan ({{ form.currency }})</th>
                                        <th class="px-4 py-3 w-36">Diskon Item ({{ form.currency }})</th>
                                        <th class="px-4 py-3 text-right w-36">Subtotal</th>
                                        <th class="px-4 py-3 min-w-[200px]">Link Produk & Catatan</th>
                                        <th class="px-3 py-3 text-center w-12" v-if="form.items.length > 1">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    <tr v-for="(item, idx) in form.items" :key="item.procurement_plan_item_id" class="hover:bg-gray-50/50">
                                        <!-- Item name -->
                                        <td class="px-4 py-3">
                                            <div class="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                                <span>{{ item.item_name }}</span>
                                                <span v-if="item.is_custom_item" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    Non-Katalog
                                                </span>
                                                <span v-else-if="item.item_code" class="text-[10px] text-gray-400 font-mono">
                                                    {{ item.item_code }}
                                                </span>
                                            </div>
                                            <div v-if="item.detail_name" class="text-xs text-slate-500 font-medium mt-0.5">
                                                {{ item.detail_name }}
                                            </div>
                                            <p v-if="item.error" class="text-[11px] text-rose-600 font-semibold mt-1">
                                                {{ item.error }}
                                            </p>
                                        </td>

                                        <!-- Max Allowed Quota -->
                                        <td class="px-4 py-3 text-right font-semibold">
                                            <div class="text-gray-700">
                                                <span class="font-bold text-indigo-700">{{ item.allocated_qty }}</span>
                                                <span class="text-gray-400 text-[10px]"> / {{ item.planned_qty }}</span>
                                                <span class="text-gray-500 text-[10px] ml-1">{{ item.unit_name }}</span>
                                            </div>
                                        </td>

                                        <!-- Purchased Qty -->
                                        <td class="px-4 py-3">
                                            <div class="relative flex items-center">
                                                <input 
                                                    type="number" 
                                                    step="any" 
                                                    min="0.0001"
                                                    :max="item.allocated_qty"
                                                    v-model="item.quantity" 
                                                    class="w-full p-2 border rounded-lg font-bold text-right pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                                    :class="item.error ? 'border-rose-400' : 'border-gray-200'"
                                                />
                                                <span class="absolute right-2 text-[10px] font-semibold text-gray-400">
                                                    {{ item.unit_name }}
                                                </span>
                                            </div>
                                        </td>

                                        <!-- Unit Price -->
                                        <td class="px-4 py-3">
                                            <div class="relative flex items-center">
                                                <span class="absolute left-2 text-[11px] font-bold text-gray-400">{{ form.currency }}</span>
                                                <input 
                                                    type="number" 
                                                    step="any" 
                                                    min="0" 
                                                    v-model="item.unit_price" 
                                                    placeholder="0"
                                                    class="w-full p-2 border rounded-lg font-bold text-right pl-10 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                                    :class="item.error ? 'border-rose-400' : 'border-gray-200'"
                                                />
                                            </div>
                                        </td>

                                        <!-- Discount -->
                                        <td class="px-4 py-3">
                                            <div class="relative flex items-center">
                                                <span class="absolute left-2 text-[11px] font-bold text-gray-400">{{ form.currency }}</span>
                                                <input 
                                                    type="number" 
                                                    step="any" 
                                                    min="0" 
                                                    v-model="item.discount_amount" 
                                                    placeholder="0"
                                                    class="w-full p-2 border border-gray-200 rounded-lg text-right pl-10 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-700"
                                                />
                                            </div>
                                        </td>

                                        <!-- Row Subtotal -->
                                        <td class="px-4 py-3 text-right font-black text-gray-900 font-mono text-sm">
                                            {{ formatCurrency(Math.max(0, ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)) - (Number(item.discount_amount) || 0)), form.currency) }}
                                        </td>

                                        <!-- Link & Notes -->
                                        <td class="px-4 py-3 space-y-1">
                                            <input 
                                                type="url" 
                                                v-model="item.product_url" 
                                                placeholder="https://tokopedia.com/product/..."
                                                class="w-full p-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                            />
                                            <input 
                                                type="text" 
                                                v-model="item.notes" 
                                                placeholder="Catatan item (warna, spek)..."
                                                class="w-full p-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-600"
                                            />
                                        </td>

                                        <!-- Delete item button (if > 1 item) -->
                                        <td class="px-3 py-3 text-center" v-if="form.items.length > 1">
                                            <button
                                                type="button"
                                                @click="handleRemoveItem(idx)"
                                                class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Hapus Item dari Pembelian"
                                            >
                                                <Trash2 class="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- SECTION 4: Informasi Pembayaran / Rekening Tujuan -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            4
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-gray-900">Informasi Pembayaran & Rekening Tujuan (Finance)</h3>
                            <p class="text-xs text-gray-500">Tentukan metode pencairan dan nomor rekening/Virtual Account untuk pembayaran oleh kasir.</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <!-- Metode Pembayaran Selector -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-2">
                                Metode Pembayaran <span class="text-rose-500">*</span>
                            </label>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <button
                                    type="button"
                                    @click="form.payment_method = 'marketplace_va'"
                                    class="p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold"
                                    :class="form.payment_method === 'marketplace_va' ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-700'"
                                >
                                    <CreditCard class="w-4 h-4 shrink-0 text-blue-600" />
                                    <div>
                                        <p class="leading-tight">Virtual Account</p>
                                        <p class="text-[10px] text-gray-500 font-normal">Tokopedia/Shopee/VA</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    @click="form.payment_method = 'bank_transfer'"
                                    class="p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold"
                                    :class="form.payment_method === 'bank_transfer' ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-700'"
                                >
                                    <Landmark class="w-4 h-4 shrink-0 text-indigo-600" />
                                    <div>
                                        <p class="leading-tight">Transfer Bank</p>
                                        <p class="text-[10px] text-gray-500 font-normal">Rekening giro / tabungan</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    @click="form.payment_method = 'cash'"
                                    class="p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold"
                                    :class="form.payment_method === 'cash' ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-700'"
                                >
                                    <Wallet class="w-4 h-4 shrink-0 text-emerald-600" />
                                    <div>
                                        <p class="leading-tight">Tunai / Kas Kecil</p>
                                        <p class="text-[10px] text-gray-500 font-normal">Petty cash pembelian</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    @click="form.payment_method = 'corporate_card'"
                                    class="p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold"
                                    :class="form.payment_method === 'corporate_card' ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-700'"
                                >
                                    <CreditCard class="w-4 h-4 shrink-0 text-purple-600" />
                                    <div>
                                        <p class="leading-tight">Kartu Perusahaan</p>
                                        <p class="text-[10px] text-gray-500 font-normal">Corporate card / Debit</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <!-- Tipe Penerima & Nama Penerima -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 mb-1.5">
                                    Kategori Penerima Dana
                                </label>
                                <select
                                    v-model="form.recipient_type"
                                    class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                >
                                    <option value="marketplace_merchant">Merchant / Toko Online</option>
                                    <option value="supplier">Vendor / Rekanan Resmi</option>
                                    <option value="employee_reimbursement">Reimbursement Karyawan</option>
                                    <option value="other">Pihak Ketiga Lainnya</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-700 mb-1.5">
                                    Nama Penerima Dana
                                </label>
                                <input
                                    type="text"
                                    v-model="form.recipient_name"
                                    placeholder="Contoh: PT Sumber Mesin atau Toko Jaya Elektronik"
                                    class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <!-- Detail Rekening (Hidden if Cash) -->
                        <div v-if="form.payment_method !== 'cash'" class="space-y-4 pt-2 border-t border-gray-100">
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <label class="block text-xs font-bold text-gray-700">
                                        Nama Bank / Provider VA <span class="text-rose-500">*</span>
                                    </label>
                                    <span class="text-[11px] text-gray-400">Pilih cepat:</span>
                                </div>
                                <input
                                    type="text"
                                    v-model="form.bank_name"
                                    placeholder="Contoh: BCA Virtual Account, Bank Mandiri, BRI"
                                    class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                />
                                <div class="flex flex-wrap gap-1.5 mt-2">
                                    <button
                                        v-for="b in popularBanks"
                                        :key="b"
                                        type="button"
                                        @click="form.bank_name = b"
                                        class="px-2.5 py-1 text-[11px] rounded-lg border transition-all"
                                        :class="form.bank_name === b ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'"
                                    >
                                        {{ b }}
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1.5">
                                        Nomor Rekening / No. Virtual Account <span class="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        v-model="form.bank_account_number"
                                        placeholder="Contoh: 880123456789 atau 142001122334"
                                        class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1.5">
                                        Nama Pemilik Rekening (Atas Nama)
                                    </label>
                                    <input
                                        type="text"
                                        v-model="form.bank_account_holder"
                                        placeholder="Contoh: Tokopedia - PT Toko Komputer"
                                        class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECTION 5: Komponen Biaya Tambahan & Total Transaksi -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            5
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-gray-900">Biaya Tambahan, Valuta & Ringkasan Transaksi</h3>
                            <p class="text-xs text-gray-500">Sesuaikan mata uang transaksi, kurs acuan, biaya ongkir, diskon, dan pajak.</p>
                        </div>
                    </div>

                    <!-- MULTI-CURRENCY SETTINGS BAR -->
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <Coins class="w-5 h-5 text-blue-600 shrink-0" />
                            <div>
                                <h4 class="text-xs font-bold text-slate-800">Mata Uang & Kurs Pembukuan</h4>
                                <span class="text-[11px] text-slate-500">Nilai transaksi akan dikonversi dan dikunci ke pembukuan Rupiah (IDR).</span>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-3">
                            <!-- Currency Select -->
                            <div class="flex items-center gap-2">
                                <label class="text-xs font-semibold text-slate-600">Valuta:</label>
                                <select 
                                    v-model="form.currency"
                                    class="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                                >
                                    <option 
                                        v-for="c in currenciesList" 
                                        :key="c.code" 
                                        :value="c.code"
                                    >
                                        {{ c.code }} - {{ c.name }} ({{ c.symbol }})
                                    </option>
                                </select>
                            </div>

                            <!-- Exchange Rate Input (Editable for Foreign Currency) -->
                            <div v-if="form.currency !== 'IDR'" class="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-2xs">
                                <span class="text-xs font-semibold text-slate-600">1 {{ form.currency }} = Rp</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0.01" 
                                    v-model.number="form.exchange_rate" 
                                    class="w-24 text-xs font-mono font-bold text-blue-700 text-right focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Additional Cost Form -->
                        <div class="space-y-4 bg-gray-50/60 p-4 rounded-xl border border-gray-100 text-xs">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                                        <Truck class="w-3.5 h-3.5 text-gray-400" />
                                        <span>Ongkos Kirim ({{ form.currency }})</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        v-model="form.shipping_cost" 
                                        class="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label class="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                                        <Tag class="w-3.5 h-3.5 text-gray-400" />
                                        <span>Diskon Header / Kupon ({{ form.currency }})</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        v-model="form.discount_amount" 
                                        class="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono text-right font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block font-bold text-gray-700 mb-1">Biaya Layanan / Platform ({{ form.currency }})</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        v-model="form.platform_fee" 
                                        class="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label class="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                                        <Receipt class="w-3.5 h-3.5 text-gray-400" />
                                        <span>Pajak Transaksi / PPN ({{ form.currency }})</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        v-model="form.tax_amount" 
                                        class="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label class="block font-bold text-gray-700 mb-1">Catatan Tambahan Transaksi</label>
                                <textarea 
                                    v-model="form.notes"
                                    rows="2"
                                    placeholder="Catatan nomor invoice, instruksi penerimaan di gudang, dsb..."
                                    class="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                ></textarea>
                            </div>
                        </div>

                        <!-- Financial Summary Box -->
                        <div class="bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 rounded-2xl border border-gray-200/80 flex flex-col justify-between shadow-2xs">
                            <div class="space-y-3 text-xs">
                                <h4 class="font-bold text-gray-900 text-sm pb-2 border-b border-gray-200 flex items-center justify-between">
                                    <span>Rekapitulasi Nilai Transaksi</span>
                                    <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">{{ form.currency }}</span>
                                </h4>

                                <div class="flex justify-between items-center text-gray-600">
                                    <span>Subtotal Barang:</span>
                                    <span class="font-bold font-mono text-gray-800">{{ formatCurrency(itemsSubtotal, form.currency) }}</span>
                                </div>

                                <div v-if="Number(form.discount_amount) > 0" class="flex justify-between items-center text-emerald-700">
                                    <span>Diskon Transaksi:</span>
                                    <span class="font-bold font-mono">- {{ formatCurrency(form.discount_amount, form.currency) }}</span>
                                </div>

                                <div v-if="Number(form.shipping_cost) > 0" class="flex justify-between items-center text-gray-600">
                                    <span>Ongkos Kirim:</span>
                                    <span class="font-bold font-mono">+ {{ formatCurrency(form.shipping_cost, form.currency) }}</span>
                                </div>

                                <div v-if="Number(form.platform_fee) > 0" class="flex justify-between items-center text-gray-600">
                                    <span>Biaya Layanan Platform:</span>
                                    <span class="font-bold font-mono">+ {{ formatCurrency(form.platform_fee, form.currency) }}</span>
                                </div>

                                <div v-if="Number(form.tax_amount) > 0" class="flex justify-between items-center text-gray-600">
                                    <span>Pajak / PPN:</span>
                                    <span class="font-bold font-mono">+ {{ formatCurrency(form.tax_amount, form.currency) }}</span>
                                </div>
                            </div>

                            <div class="pt-4 border-t-2 border-gray-200 mt-4">
                                <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                                    Grand Total Transaksi:
                                </span>
                                <span class="text-2xl font-black text-emerald-700 font-mono block mt-1">
                                    {{ formatCurrency(grandTotal, form.currency) }}
                                </span>

                                <!-- CONVERTED EQUIVALENT TO BASE CURRENCY IDR -->
                                <div v-if="form.currency !== 'IDR'" class="mt-3 p-3 bg-blue-50/90 rounded-xl border border-blue-200 text-xs">
                                    <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                                        Setara Pembukuan Keuangan (IDR):
                                    </span>
                                    <span class="text-lg font-black text-blue-900 font-mono block mt-0.5">
                                        {{ formatCurrency(equivalentIdrGrandTotal, 'IDR') }}
                                    </span>
                                    <span class="text-[10px] text-blue-600 block mt-1">
                                        Kurs Terkunci: 1 {{ form.currency }} = {{ formatCurrency(form.exchange_rate, 'IDR') }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Buttons -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <RouterLink :to="{ name: 'user.purchasing.direct.detail', params: { id: dpId } }">
                        <BaseButton variant="secondary">
                            <span>Batal</span>
                        </BaseButton>
                    </RouterLink>

                    <div class="flex items-center gap-3">
                        <button 
                            type="button" 
                            @click="handleSubmit(false)"
                            :disabled="isSubmitting || form.items.length === 0"
                            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save class="w-4 h-4 text-gray-500" />
                            <span>Simpan Perubahan (Draft)</span>
                        </button>

                        <button 
                            type="button" 
                            @click="handleSubmit(true)"
                            :disabled="isSubmitting || form.items.length === 0"
                            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send class="w-4 h-4" />
                            <span>Simpan & Ajukan Pembayaran</span>
                        </button>
                    </div>
                </div>
            </form>
        </template>
    </div>
</template>
