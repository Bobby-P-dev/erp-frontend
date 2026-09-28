<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { getProcurementPlans, showProcurementPlan } from '../../services/procurementPlanServices.js'
import { getSuppliers } from '../../services/supplierServices.js'
import { createDirectPurchase, submitDirectPurchaseForPayment } from '../../services/directPurchaseServices.js'
import { showLoading, showSuccess, showError, showConfirm, closeSwal } from '../../utils/swal.js'
import Swal from 'sweetalert2'
import { formatCurrency } from '../../utils/stringUtils.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'

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
    Tag
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// State
const isLoadingPlans = ref(false)
const isLoadingSuppliers = ref(false)
const isSubmitting = ref(false)

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
    currency: 'IDR',
    discount_amount: 0,
    shipping_cost: 0,
    platform_fee: 0,
    tax_amount: 0,
    notes: '',
    items: []
})

const popularMarketplaces = ['Tokopedia', 'Shopee', 'Blibli', 'Lazada', 'Bukalapak', 'Monotaro', 'Amazon']

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

// Fetch Active Direct Purchase Plans
const fetchActivePlans = async () => {
    try {
        isLoadingPlans.value = true
        const response = await getProcurementPlans({
            status: 'active',
            procurement_method: 'direct_purchase'
        }, 1, 100)
        activePlans.value = response.data || []

        // If plan_id is passed in query
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

// Fetch Suppliers
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

// Handle Plan Selection
const onPlanSelected = async () => {
    if (!selectedPlanId.value) {
        selectedPlan.value = null
        form.value.items = []
        return
    }

    try {
        // Quick preview from already loaded active plans if available
        const localMatch = activePlans.value.find(p => p.id === Number(selectedPlanId.value))
        if (localMatch && !selectedPlan.value) {
            selectedPlan.value = localMatch
        }

        showLoading('Memuat rincian item rencana...')
        const response = await showProcurementPlan(selectedPlanId.value)
        const planData = response.data || response
        selectedPlan.value = planData

        // Populate items from plan
        if (planData?.items) {
            form.value.items = planData.items.map(item => {
                const prItem = item.purchase_requisition_item || {}
                const estPrice = Number(prItem.estimated_price) || 0
                return {
                    procurement_plan_item_id: item.id,
                    item_id: prItem.item_id || null,
                    unit_id: prItem.unit_id || null,
                    item_name: prItem.item_name || prItem.item?.name || 'Item Pengadaan',
                    item_code: prItem.item_code || prItem.item?.code || '',
                    is_custom_item: prItem.is_custom_item || !prItem.item_id,
                    unit_name: prItem.unit?.code || prItem.unit_code || 'Unit',
                    allocated_qty: Number(item.planned_quantity),
                    quantity: Number(item.planned_quantity),
                    unit_price: estPrice > 0 ? estPrice : '',
                    discount_amount: 0,
                    product_url: prItem.reference_url || '',
                    notes: item.notes || '',
                    error: ''
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

// Validation
const validateForm = () => {
    if (!selectedPlanId.value) {
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

    let hasItemError = false
    form.value.items.forEach((item, idx) => {
        if (!item.quantity || Number(item.quantity) <= 0) {
            item.error = 'Kuantitas harus > 0'
            hasItemError = true
        } else if (Number(item.quantity) > Number(item.allocated_qty)) {
            item.error = `Maks. alokasi ${item.allocated_qty}`
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

    return true
}

// Submit Form
const handleSubmit = async (shouldSubmitForPayment = false) => {
    if (!validateForm()) return

    const channelTitle = form.value.purchase_channel === 'marketplace' 
        ? `${form.value.marketplace_name} (${form.value.merchant_name})`
        : (form.value.purchase_channel === 'direct_supplier' ? 'Supplier Rekanan' : form.value.merchant_name)

    const confirmTitle = shouldSubmitForPayment ? 'Simpan & Ajukan Pembayaran?' : 'Simpan Draft Pembelian?'
    const confirmText = shouldSubmitForPayment
        ? `Direct Purchase senilai ${formatCurrency(grandTotal.value)} melalui ${channelTitle} akan langsung diajukan ke bagian keuangan untuk proses verifikasi pembayaran.`
        : `Direct Purchase senilai ${formatCurrency(grandTotal.value)} akan disimpan sebagai draft.`
    const confirmBtnText = shouldSubmitForPayment ? 'Ya, Ajukan Pembayaran' : 'Ya, Simpan Draft'

    const confirmed = await showConfirm(confirmTitle, confirmText, confirmBtnText, 'Batal', '#4f46e5')
    if (!confirmed) return

    try {
        isSubmitting.value = true
        showLoading(shouldSubmitForPayment ? 'Menyimpan & mengajukan pembayaran...' : 'Menyimpan draft pembelian...')

        const payload = {
            procurement_plan_id: Number(selectedPlanId.value),
            purchase_channel: form.value.purchase_channel,
            supplier_id: form.value.purchase_channel === 'direct_supplier' ? Number(form.value.supplier_id) : null,
            marketplace_name: form.value.purchase_channel === 'marketplace' ? form.value.marketplace_name?.trim() : null,
            merchant_name: form.value.merchant_name ? form.value.merchant_name.trim() : null,
            store_url: form.value.store_url ? form.value.store_url.trim() : null,
            currency: 'IDR',
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

        const createRes = await createDirectPurchase(payload)
        const dpId = createRes.data?.id || createRes.id
        const dpNumber = createRes.data?.dp_number || createRes.dp_number || ''

        if (shouldSubmitForPayment && dpId) {
            await submitDirectPurchaseForPayment(dpId)
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

onMounted(() => {
    fetchActivePlans()
    fetchSuppliers()
})
</script>

<template>
    <div class="space-y-6 max-w-7xl mx-auto pb-16">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <RouterLink to="/" class="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <Home class="w-4 h-4" />
                <span>Beranda</span>
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <RouterLink to="/purchasing" class="hover:text-indigo-600 transition-colors">
                Purchasing
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <RouterLink :to="{ name: 'user.purchasing.direct' }" class="hover:text-indigo-600 transition-colors">
                Direct Purchases
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <span class="text-gray-900 font-semibold">Buat Transaksi</span>
        </nav>

        <!-- Page Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <RouterLink :to="{ name: 'user.purchasing.direct' }" class="text-gray-400 hover:text-gray-600">
                    <ArrowLeft class="w-6 h-6" />
                </RouterLink>
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">Buat Transaksi Direct Purchase</h2>
                    <p class="text-xs text-gray-500 mt-1">
                        Eksekusi pembelian barang langsung untuk rencana pengadaan yang telah disetujui.
                    </p>
                </div>
            </div>
        </div>

        <form @submit.prevent="handleSubmit(false)" class="space-y-6">
            <!-- SECTION 1: Pilih Rencana Pengadaan (Procurement Plan) -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        1
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-gray-900">Pilih Rencana Pengadaan (Procurement Plan)</h3>
                        <p class="text-xs text-gray-500">Pilih rencana pengadaan bertipe Direct Purchase yang sedang berstatus Aktif.</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-2">
                        Nomor Rencana Pengadaan <span class="text-rose-500">*</span>
                    </label>
                    <select 
                        v-model="selectedPlanId" 
                        @change="onPlanSelected"
                        class="w-full text-sm font-semibold p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                        :disabled="isLoadingPlans"
                    >
                        <option value="">-- Pilih Rencana Pengadaan Aktif --</option>
                        <option 
                            v-for="plan in activePlans" 
                            :key="plan.id" 
                            :value="plan.id"
                        >
                            {{ plan.pp_number }} • PR: {{ plan.purchase_requisition?.pr_number || '-' }} ({{ plan.items?.length || 0 }} Item)
                        </option>
                    </select>

                    <p v-if="activePlans.length === 0 && !isLoadingPlans" class="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                        <AlertCircle class="w-4 h-4 shrink-0" />
                        <span>Tidak ada Rencana Pengadaan Direct Purchase yang aktif saat ini. Buat dan aktifkan rencana pengadaan terlebih dahulu.</span>
                    </p>
                </div>

                <!-- Preview Selected Plan Info -->
                <div v-if="selectedPlan" class="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                        <span class="text-gray-400 font-medium block">Nomor PR:</span>
                        <span class="font-bold text-gray-900">{{ selectedPlan.purchase_requisition?.pr_number || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-gray-400 font-medium block">Perusahaan:</span>
                        <span class="font-semibold text-gray-800">{{ selectedPlan.purchase_requisition?.company?.name || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-gray-400 font-medium block">Divisi:</span>
                        <span class="font-semibold text-gray-800">{{ selectedPlan.purchase_requisition?.division?.name || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-gray-400 font-medium block">Target Kebutuhan:</span>
                        <span class="font-bold text-amber-700">{{ selectedPlan.purchase_requisition?.required_date || '-' }}</span>
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
                        <p class="text-xs text-gray-500">Tentukan platform atau tempat pembelian barang ini dilakukan.</p>
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
                                <!-- Popular marketplace chips -->
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
                            <label class="block text-xs font-bold text-gray-700 mb-2">
                                Pilih Supplier Terdaftar <span class="text-rose-500">*</span>
                            </label>
                            <select 
                                v-model="form.supplier_id" 
                                class="w-full text-sm font-semibold p-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
                            >
                                <option :value="null">-- Pilih Supplier Rekanan --</option>
                                <option 
                                    v-for="sup in suppliers" 
                                    :key="sup.id" 
                                    :value="sup.id"
                                >
                                    {{ sup.name }} ({{ sup.code || 'ID: ' + sup.id }})
                                </option>
                            </select>
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
                <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        3
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-gray-900">Rincian Barang & Realisasi Harga Beli</h3>
                        <p class="text-xs text-gray-500">Masukkan kuantitas dan harga satuan aktual pembelian di toko/marketplace.</p>
                    </div>
                </div>

                <div v-if="form.items.length === 0" class="py-10 text-center text-gray-400">
                    <Package class="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p class="text-sm font-semibold text-gray-600">Belum Ada Item Terpilih</p>
                    <p class="text-xs text-gray-400 mt-1">Pilih Rencana Pengadaan pada Langkah 1 untuk memuat rincian item.</p>
                </div>

                <!-- Items Table -->
                <div v-else class="overflow-x-auto border border-gray-100 rounded-xl">
                    <table class="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-gray-50/80 border-b border-gray-100 font-bold text-gray-700 uppercase tracking-wider">
                                <th class="px-4 py-3 min-w-[240px]">Barang / Item</th>
                                <th class="px-4 py-3 text-right w-24">Alokasi</th>
                                <th class="px-4 py-3 w-36">Kuantitas Beli</th>
                                <th class="px-4 py-3 w-44">Harga Satuan (Rp)</th>
                                <th class="px-4 py-3 w-36">Diskon Item (Rp)</th>
                                <th class="px-4 py-3 text-right w-36">Subtotal</th>
                                <th class="px-4 py-3 min-w-[200px]">Link Produk & Catatan</th>
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
                                    <p v-if="item.error" class="text-[11px] text-rose-600 font-semibold mt-1">
                                        {{ item.error }}
                                    </p>
                                </td>

                                <!-- Allocated Qty -->
                                <td class="px-4 py-3 text-right font-semibold text-gray-500">
                                    {{ item.allocated_qty }} {{ item.unit_name }}
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
                                        <span class="absolute left-2 text-[11px] font-bold text-gray-400">Rp</span>
                                        <input 
                                            type="number" 
                                            step="any"
                                            min="0"
                                            v-model="item.unit_price" 
                                            placeholder="0"
                                            class="w-full p-2 border rounded-lg font-bold text-right pl-8 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                            :class="item.error ? 'border-rose-400' : 'border-gray-200'"
                                        />
                                    </div>
                                </td>

                                <!-- Discount -->
                                <td class="px-4 py-3">
                                    <div class="relative flex items-center">
                                        <span class="absolute left-2 text-[11px] font-bold text-gray-400">Rp</span>
                                        <input 
                                            type="number" 
                                            step="any"
                                            min="0"
                                            v-model="item.discount_amount" 
                                            placeholder="0"
                                            class="w-full p-2 border border-gray-200 rounded-lg text-right pl-8 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-700"
                                        />
                                    </div>
                                </td>

                                <!-- Row Subtotal -->
                                <td class="px-4 py-3 text-right font-black text-gray-900 font-mono text-sm">
                                    {{ formatCurrency(Math.max(0, ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)) - (Number(item.discount_amount) || 0))) }}
                                </td>

                                <!-- Link & Notes -->
                                <td class="px-4 py-3 space-y-1">
                                    <input 
                                        type="url" 
                                        v-model="item.product_url" 
                                        placeholder="https://tokopedia.com/product/..."
                                        class="w-full p-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <input 
                                        type="text" 
                                        v-model="item.notes" 
                                        placeholder="Catatan item (warna, spek)..."
                                        class="w-full p-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-600"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- SECTION 4: Komponen Biaya Tambahan & Total Transaksi -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        4
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-gray-900">Biaya Tambahan & Ringkasan Transaksi</h3>
                        <p class="text-xs text-gray-500">Masukkan komponen ongkos kirim, diskon voucher toko, dan pajak transaksi.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Additional Cost Form -->
                    <div class="space-y-4 bg-gray-50/60 p-4 rounded-xl border border-gray-100 text-xs">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                                    <Truck class="w-3.5 h-3.5 text-gray-400" />
                                    <span>Ongkos Kirim (Rp)</span>
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
                                    <span>Diskon Header / Kupon (Rp)</span>
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
                                <label class="block font-bold text-gray-700 mb-1">Biaya Layanan / Platform (Rp)</label>
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
                                    <span>Pajak Transaksi / PPN (Rp)</span>
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
                            <h4 class="font-bold text-gray-900 text-sm pb-2 border-b border-gray-200">
                                Rekapitulasi Nilai Transaksi
                            </h4>

                            <div class="flex justify-between items-center text-gray-600">
                                <span>Subtotal Barang:</span>
                                <span class="font-bold font-mono text-gray-800">{{ formatCurrency(itemsSubtotal) }}</span>
                            </div>

                            <div v-if="Number(form.discount_amount) > 0" class="flex justify-between items-center text-emerald-700">
                                <span>Diskon Transaksi:</span>
                                <span class="font-bold font-mono">- {{ formatCurrency(form.discount_amount) }}</span>
                            </div>

                            <div v-if="Number(form.shipping_cost) > 0" class="flex justify-between items-center text-gray-600">
                                <span>Ongkos Kirim:</span>
                                <span class="font-bold font-mono">+ {{ formatCurrency(form.shipping_cost) }}</span>
                            </div>

                            <div v-if="Number(form.platform_fee) > 0" class="flex justify-between items-center text-gray-600">
                                <span>Biaya Layanan Platform:</span>
                                <span class="font-bold font-mono">+ {{ formatCurrency(form.platform_fee) }}</span>
                            </div>

                            <div v-if="Number(form.tax_amount) > 0" class="flex justify-between items-center text-gray-600">
                                <span>Pajak / PPN:</span>
                                <span class="font-bold font-mono">+ {{ formatCurrency(form.tax_amount) }}</span>
                            </div>
                        </div>

                        <div class="pt-4 border-t-2 border-gray-200 mt-4">
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                                Grand Total Pembayaran:
                            </span>
                            <span class="text-2xl font-black text-emerald-700 font-mono block mt-1">
                                {{ formatCurrency(grandTotal) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer Buttons -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <RouterLink :to="{ name: 'user.purchasing.direct' }">
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
                        <span>Simpan sebagai Draft</span>
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
    </div>
</template>
