<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { 
    showDirectPurchase, 
    submitDirectPurchaseForPayment, 
    disbursePayment,
    recordGoodsReceipt,
    cancelDirectPurchase 
} from '../../services/directPurchaseServices.js'
import { getAccountingAccounts } from '../../services/accountingAccountServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'
import Swal from 'sweetalert2'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import DocumentWorkflowTracker from '../../components/approval/DocumentWorkflowTracker.vue'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    ShoppingCart,
    Store,
    Building2,
    Calendar,
    Clock,
    CreditCard,
    CheckCircle2,
    XCircle,
    Ban,
    ExternalLink,
    FileText,
    Layers,
    Truck,
    Receipt,
    Tag,
    Package,
    ShieldCheck,
    Coins,
    ClipboardCheck,
    AlertCircle,
    X
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// State
const dp = ref(null)
const isLoading = ref(true)
const bankAccounts = ref([])

// Modals State
const showSubmitModal = ref(false)
const showDisburseModal = ref(false)
const showGoodsReceiptModal = ref(false)

// Form states
const submitForm = reactive({
    payment_method: 'bank_transfer',
    recipient_type: 'supplier',
    recipient_name: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    notes: '',
    approval_notes: ''
})

const disburseForm = reactive({
    source_account_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    bank_fee: 0,
    notes: ''
})

const grForm = reactive({
    receipt_date: new Date().toISOString().split('T')[0],
    delivery_note_number: '',
    shipping_carrier: '',
    notes: '',
    items: []
})

// Fetch DP Detail
const fetchDetail = async () => {
    try {
        isLoading.value = true
        const id = route.params.id
        const response = await showDirectPurchase(id)
        dp.value = response.data || null

        // Initialize default recipient info from DP
        if (dp.value) {
            submitForm.recipient_name = dp.value.supplier?.name || dp.value.merchant_name || dp.value.marketplace_name || ''
            submitForm.bank_account_holder = submitForm.recipient_name
        }
    } catch (error) {
        showError('Gagal Memuat Detail!', 'Transaksi Direct Purchase tidak ditemukan atau terjadi kesalahan server.', error)
        router.push({ name: 'user.purchasing.direct' })
    } finally {
        isLoading.value = false
    }
}

// Fetch Cash/Bank Accounts
const fetchBankAccounts = async () => {
    try {
        const response = await getAccountingAccounts('', 1, { is_active: 1 })
        bankAccounts.value = response.data || response || []
    } catch (e) {
        console.error('Failed to load accounting accounts', e)
    }
}

// Table Columns for items
const tableColumns = [
    { key: 'no', label: 'No', class: 'w-14 text-center' },
    { key: 'item', label: 'Item & Referensi', class: 'min-w-[240px]' },
    { key: 'unit', label: 'Satuan', class: 'w-24 text-center' },
    { key: 'qty', label: 'Kuantitas', class: 'w-28 text-right' },
    { key: 'price', label: 'Harga Satuan (Rp)', class: 'w-36 text-right' },
    { key: 'discount', label: 'Diskon (Rp)', class: 'w-32 text-right' },
    { key: 'subtotal', label: 'Subtotal (Rp)', class: 'w-40 text-right' },
    { key: 'notes', label: 'Catatan & Tautan', class: 'min-w-[180px]' }
]

const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date)
}

const getStatusBadge = (status) => {
    switch (status) {
        case 'draft':
            return {
                label: 'Draft (Pembelian Baru)',
                bg: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: Clock
            }
        case 'ready_for_payment':
            return {
                label: 'Menunggu Persetujuan Keuangan',
                bg: 'bg-blue-50 text-blue-700 border-blue-200',
                icon: CreditCard
            }
        case 'paid':
            return {
                label: 'Telah Dibayar (Siap Terima Barang)',
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: Coins
            }
        case 'partially_received':
            return {
                label: 'Diterima Sebagian',
                bg: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: Truck
            }
        case 'completed':
            return {
                label: 'Selesai Lengkap (Diterima Penuh)',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                icon: CheckCircle2
            }
        case 'cancelled':
            return {
                label: 'Dibatalkan',
                bg: 'bg-rose-50 text-rose-700 border-rose-200',
                icon: XCircle
            }
        default:
            return {
                label: status || '-',
                bg: 'bg-gray-50 text-gray-600 border-gray-200',
                icon: Clock
            }
    }
}

// Action: Open Submit Modal
const openSubmitModal = () => {
    if (!dp.value) return
    submitForm.payment_method = dp.value.payment_method || (dp.value.purchase_channel === 'marketplace' ? 'marketplace_va' : 'bank_transfer')
    submitForm.recipient_type = dp.value.recipient_type || (dp.value.purchase_channel === 'marketplace' ? 'marketplace_merchant' : (dp.value.purchase_channel === 'direct_supplier' ? 'supplier' : 'other'))
    submitForm.recipient_name = dp.value.recipient_name || dp.value.supplier?.name || dp.value.merchant_name || dp.value.marketplace_name || ''
    submitForm.bank_name = dp.value.bank_name || ''
    submitForm.bank_account_number = dp.value.bank_account_number || ''
    submitForm.bank_account_holder = dp.value.bank_account_holder || submitForm.recipient_name
    submitForm.notes = dp.value.notes || ''
    showSubmitModal.value = true
}

// Action: Confirm Submit For Payment
const confirmSubmitForPayment = async () => {
    if (!dp.value) return
    try {
        showLoading('Mengajukan permohonan pembayaran...')
        await submitDirectPurchaseForPayment(dp.value.id, {
            payment_method: submitForm.payment_method,
            recipient_type: submitForm.recipient_type,
            recipient_name: submitForm.recipient_name,
            bank_name: submitForm.bank_name,
            bank_account_number: submitForm.bank_account_number,
            bank_account_holder: submitForm.bank_account_holder,
            notes: submitForm.notes
        })
        showSubmitModal.value = false
        showSuccess('Berhasil!', `Permohonan pembayaran untuk ${dp.value.dp_number} siap dicairkan oleh bagian keuangan.`)
        fetchDetail()
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal mengajukan pembayaran.'
        showError('Gagal!', errorMsg, error)
    }
}

// Action: Open Disburse Modal
const openDisburseModal = async () => {
    await fetchBankAccounts()
    disburseForm.payment_date = new Date().toISOString().split('T')[0]
    disburseForm.reference_number = ''
    disburseForm.bank_fee = 0
    disburseForm.notes = ''
    showDisburseModal.value = true
}

// Action: Confirm Disburse
const confirmDisburse = async () => {
    if (!dp.value?.payment_request) return
    if (!disburseForm.source_account_id) {
        showError('Validasi Gagal', 'Silakan pilih akun kas/bank sumber dana.')
        return
    }

    try {
        showLoading('Memproses pencairan dana...')
        await disbursePayment(dp.value.payment_request.id, {
            source_account_id: disburseForm.source_account_id,
            payment_date: disburseForm.payment_date,
            reference_number: disburseForm.reference_number,
            bank_fee: disburseForm.bank_fee,
            notes: disburseForm.notes
        })
        showDisburseModal.value = false
        showSuccess('Pembayaran Sukses!', 'Dana pembayaran telah dicairkan. Status direct purchase kini lunas.')
        fetchDetail()
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal mencairkan pembayaran.'
        showError('Gagal!', errorMsg, error)
    }
}

// Action: Open Goods Receipt Modal
const openGoodsReceiptModal = () => {
    if (!dp.value?.items) return
    grForm.receipt_date = new Date().toISOString().split('T')[0]
    grForm.delivery_note_number = ''
    grForm.shipping_carrier = ''
    grForm.notes = ''
    grForm.items = dp.value.items.map(item => ({
        direct_purchase_item_id: item.id,
        item_description: item.description || item.item?.name || 'Item',
        ordered_qty: Number(item.quantity),
        quantity_received: Number(item.quantity),
        quantity_accepted: Number(item.quantity),
        quantity_rejected: 0,
        rejection_reason: ''
    }))
    showGoodsReceiptModal.value = true
}

// Action: Confirm Goods Receipt
const confirmGoodsReceipt = async () => {
    if (!dp.value) return
    if (!grForm.delivery_note_number) {
        showError('Validasi Gagal', 'Nomor surat jalan / bukti pengiriman wajib diisi.')
        return
    }

    try {
        showLoading('Mencatat penerimaan barang fisik...')
        await recordGoodsReceipt({
            direct_purchase_id: dp.value.id,
            receipt_date: grForm.receipt_date,
            delivery_note_number: grForm.delivery_note_number,
            shipping_carrier: grForm.shipping_carrier,
            notes: grForm.notes,
            items: grForm.items.map(it => ({
                direct_purchase_item_id: it.direct_purchase_item_id,
                quantity_received: it.quantity_received,
                quantity_accepted: it.quantity_accepted,
                quantity_rejected: it.quantity_rejected,
                rejection_reason: it.rejection_reason
            }))
        })
        showGoodsReceiptModal.value = false
        showSuccess('Penerimaan Berhasil!', 'Penerimaan fisik barang berhasil dicatat di gudang.')
        fetchDetail()
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal mencatat penerimaan barang.'
        showError('Gagal!', errorMsg, error)
    }
}

const handleCancel = async () => {
    if (!dp.value) return
    const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Batalkan Pembelian Langsung?',
        text: `Masukkan alasan pembatalan untuk ${dp.value.dp_number}:`,
        input: 'textarea',
        inputPlaceholder: 'Tuliskan alasan pembatalan pembelian ini...',
        showCancelButton: true,
        confirmButtonText: 'Ya, Batalkan Pembelian',
        cancelButtonText: 'Tutup',
        confirmButtonColor: '#e11d48',
        inputValidator: (value) => {
            if (!value) {
                return 'Alasan pembatalan wajib diisi!'
            }
        }
    })

    if (!isConfirmed) return

    try {
        showLoading('Membatalkan pembelian...')
        await cancelDirectPurchase(dp.value.id, reason)
        showSuccess('Berhasil!', `Direct Purchase ${dp.value.dp_number} telah dibatalkan.`)
        fetchDetail()
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal membatalkan transaksi.'
        showError('Gagal!', errorMsg, error)
    }
}

onMounted(() => {
    fetchDetail()
})
</script>

<template>
    <div class="space-y-6 w-full pb-16">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Direct Purchases', to: { name: 'user.purchasing.direct' } },
                { label: dp?.dp_number || 'Detail Transaksi' }
            ]" 
        />

        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm font-medium text-gray-600">Memuat rincian Direct Purchase...</p>
        </div>

        <template v-else-if="dp">
            <!-- Header Section -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-3 flex-wrap">
                        <RouterLink :to="{ name: 'user.purchasing.direct' }" class="text-gray-400 hover:text-gray-600">
                            <ArrowLeft class="w-5 h-5" />
                        </RouterLink>
                        <h2 class="text-2xl font-bold text-gray-900 font-mono">{{ dp.dp_number }}</h2>

                        <!-- Status Badge -->
                        <span 
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                            :class="getStatusBadge(dp.status).bg"
                        >
                            <component :is="getStatusBadge(dp.status).icon" class="w-3.5 h-3.5" />
                            {{ getStatusBadge(dp.status).label }}
                        </span>

                        <!-- Channel Badge -->
                        <span 
                            v-if="dp.purchase_channel === 'marketplace'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200"
                        >
                            <Store class="w-3.5 h-3.5" />
                            {{ dp.marketplace_name || 'Marketplace' }}
                        </span>
                        <span 
                            v-else-if="dp.purchase_channel === 'direct_supplier'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                            <Building2 class="w-3.5 h-3.5" />
                            Supplier Resmi
                        </span>
                        <span 
                            v-else-if="dp.purchase_channel === 'retail_store'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                            <ShoppingCart class="w-3.5 h-3.5" />
                            Toko Retail
                        </span>
                    </div>

                    <p class="text-xs text-gray-500">
                        Dibuat pada {{ formatDate(dp.created_at) }} oleh 
                        <strong class="text-gray-700 font-semibold">{{ dp.created_by_user?.name || 'Staff Purchasing' }}</strong>
                    </p>
                </div>

                <!-- Header Actions -->
                <div class="flex items-center gap-2.5 flex-wrap">
                    <!-- Action: Submit for Payment (Draft only) -->
                    <button 
                        v-if="dp.status === 'draft'"
                        @click="openSubmitModal"
                        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                    >
                        <CreditCard class="w-4 h-4" />
                        <span>Ajukan Pembayaran</span>
                    </button>

                    <!-- Action: Disburse Payment (If payment request approved & not yet paid) -->
                    <button 
                        v-if="dp.payment_request?.status === 'approved' && ['draft', 'ready_for_payment'].includes(dp.status)"
                        @click="openDisburseModal"
                        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                    >
                        <Coins class="w-4 h-4" />
                        <span>Cairkan Pembayaran (Finance)</span>
                    </button>

                    <!-- Action: Record Goods Receipt (If paid or partially received) -->
                    <button 
                        v-if="['paid', 'partially_received'].includes(dp.status)"
                        @click="openGoodsReceiptModal"
                        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                    >
                        <Truck class="w-4 h-4" />
                        <span>Catat Penerimaan Barang (GRN)</span>
                    </button>

                    <!-- Action: Cancel (Draft & Ready for payment only) -->
                    <button 
                        v-if="['draft', 'ready_for_payment'].includes(dp.status)"
                        @click="handleCancel"
                        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-sm transition-all"
                    >
                        <Ban class="w-4 h-4" />
                        <span>Batalkan Pembelian</span>
                    </button>
                </div>
            </div>

            <!-- Lifecycle Progress Stepper Bar -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div class="flex items-center justify-between text-xs font-semibold overflow-x-auto gap-4 py-1">
                    <!-- Step 1: PR Approved -->
                    <div class="flex items-center gap-2 min-w-max text-emerald-700">
                        <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-800">1</span>
                        <span>PR Disetujui</span>
                    </div>
                    <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                    <!-- Step 2: Procurement Plan -->
                    <div class="flex items-center gap-2 min-w-max text-emerald-700">
                        <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-800">2</span>
                        <span>Procurement Plan</span>
                    </div>
                    <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                    <!-- Step 3: Direct Purchase Order -->
                    <div 
                        class="flex items-center gap-2 min-w-max"
                        :class="dp.status !== 'draft' ? 'text-emerald-700' : 'text-blue-700'"
                    >
                        <span 
                            class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                            :class="dp.status !== 'draft' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'"
                        >3</span>
                        <span>Direct Purchase</span>
                    </div>
                    <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                    <!-- Step 4: Tagihan Siap Cair -->
                    <div 
                        class="flex items-center gap-2 min-w-max"
                        :class="dp.payment_request?.status === 'approved' || ['paid', 'partially_received', 'completed'].includes(dp.status) ? 'text-emerald-700' : (dp.status === 'ready_for_payment' ? 'text-blue-700' : 'text-gray-400')"
                    >
                        <span 
                            class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                            :class="dp.payment_request?.status === 'approved' || ['paid', 'partially_received', 'completed'].includes(dp.status) ? 'bg-emerald-100 text-emerald-800' : (dp.status === 'ready_for_payment' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500')"
                        >4</span>
                        <span>Tagihan Siap Cair</span>
                    </div>
                    <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                    <!-- Step 5: Payment Disbursement -->
                    <div 
                        class="flex items-center gap-2 min-w-max"
                        :class="['paid', 'partially_received', 'completed'].includes(dp.status) ? 'text-emerald-700' : 'text-gray-400'"
                    >
                        <span 
                            class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                            :class="['paid', 'partially_received', 'completed'].includes(dp.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'"
                        >5</span>
                        <span>Pembayaran (Paid)</span>
                    </div>
                    <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                    <!-- Step 6: Goods Receipt -->
                    <div 
                        class="flex items-center gap-2 min-w-max"
                        :class="['partially_received', 'completed'].includes(dp.status) ? 'text-emerald-700' : 'text-gray-400'"
                    >
                        <span 
                            class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                            :class="['partially_received', 'completed'].includes(dp.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'"
                        >6</span>
                        <span>Penerimaan Barang</span>
                    </div>
                    <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                    <!-- Step 7: Completed -->
                    <div 
                        class="flex items-center gap-2 min-w-max"
                        :class="dp.status === 'completed' ? 'text-emerald-800 font-bold' : 'text-gray-400'"
                    >
                        <span 
                            class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                            :class="dp.status === 'completed' ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100 text-gray-500'"
                        >7</span>
                        <span>Selesai</span>
                    </div>
                </div>
            </div>

            <!-- Two-Column Information Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Channel & Toko Information Card -->
                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <div class="flex items-center gap-2 pb-3 border-b border-gray-100">
                        <Store class="w-4 h-4 text-orange-600" />
                        <h3 class="text-sm font-bold text-gray-900">Saluran Pembelian & Tempat Transaksi</h3>
                    </div>

                    <div class="space-y-3 text-xs">
                        <template v-if="dp.purchase_channel === 'marketplace'">
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Marketplace:</span>
                                <span class="font-bold text-gray-900">{{ dp.marketplace_name }}</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Nama Official Store / Penjual:</span>
                                <span class="font-semibold text-gray-800">{{ dp.merchant_name }}</span>
                            </div>
                            <div v-if="dp.store_url" class="pt-1">
                                <span class="text-gray-500 block mb-1">Tautan Toko Online:</span>
                                <a 
                                    :href="dp.store_url" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-semibold"
                                >
                                    <ExternalLink class="w-3.5 h-3.5" />
                                    <span>Buka Halaman Toko Penjual</span>
                                </a>
                            </div>
                        </template>

                        <template v-else-if="dp.purchase_channel === 'direct_supplier'">
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Nama Supplier:</span>
                                <span class="font-bold text-gray-900">{{ dp.supplier?.name || '-' }}</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Kode Supplier:</span>
                                <span class="font-mono text-gray-700">{{ dp.supplier?.supplier_code || dp.supplier?.code || '-' }}</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Email / Kontak:</span>
                                <span class="text-gray-700">{{ dp.supplier?.email || dp.supplier?.phone || '-' }}</span>
                            </div>
                        </template>

                        <template v-else-if="dp.purchase_channel === 'retail_store'">
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Nama Toko Retail:</span>
                                <span class="font-bold text-gray-900">{{ dp.merchant_name }}</span>
                            </div>
                            <div v-if="dp.store_url" class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Lokasi / URL:</span>
                                <span class="text-gray-700">{{ dp.store_url }}</span>
                            </div>
                        </template>

                        <div v-if="dp.notes" class="pt-1">
                            <span class="text-gray-500 block mb-1">Catatan Transaksi:</span>
                            <p class="text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100 italic">
                                {{ dp.notes }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Plan & Financial Summary Card -->
                <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center gap-2 pb-3 border-b border-gray-100">
                            <Receipt class="w-4 h-4 text-emerald-600" />
                            <h3 class="text-sm font-bold text-gray-900">Rincian Dokumen & Finansial</h3>
                        </div>

                        <div class="space-y-2.5 text-xs mt-3">
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Rencana Pengadaan:</span>
                                <span class="font-bold text-gray-900 font-mono">{{ dp.procurement_plan?.pp_number || '-' }}</span>
                            </div>

                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Subtotal Barang:</span>
                                <span class="font-bold font-mono text-gray-800">{{ formatCurrency(dp.subtotal) }}</span>
                            </div>

                            <div v-if="Number(dp.discount_amount) > 0" class="flex justify-between items-center py-1 border-b border-gray-50 text-emerald-700">
                                <span>Diskon Transaksi:</span>
                                <span class="font-bold font-mono">- {{ formatCurrency(dp.discount_amount) }}</span>
                            </div>

                            <div v-if="Number(dp.shipping_cost) > 0" class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Ongkos Kirim:</span>
                                <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.shipping_cost) }}</span>
                            </div>

                            <div v-if="Number(dp.platform_fee) > 0" class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Biaya Platform:</span>
                                <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.platform_fee) }}</span>
                            </div>

                            <div v-if="Number(dp.tax_amount) > 0" class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Pajak / PPN:</span>
                                <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.tax_amount) }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="pt-4 border-t-2 border-gray-200 mt-3 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                        <span class="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                            Grand Total Pembayaran:
                        </span>
                        <span class="text-2xl font-black text-emerald-800 font-mono block mt-1">
                            {{ formatCurrency(dp.grand_total) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Finance Payment Request & Approval Section -->
            <div v-if="dp.payment_request" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                    <div class="flex items-center gap-2">
                        <CreditCard class="w-5 h-5 text-blue-600" />
                        <div>
                            <h3 class="text-sm font-bold text-gray-900">Permohonan Pembayaran (Payment Request)</h3>
                            <p class="text-xs text-gray-500 font-mono">{{ dp.payment_request.prq_number }}</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <span 
                            class="px-2.5 py-1 rounded-full text-xs font-bold border"
                            :class="dp.payment_request.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (dp.payment_request.status === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200')"
                        >
                            {{ dp.payment_request.status?.toUpperCase() }}
                        </span>

                        <button 
                            v-if="dp.payment_request.status === 'approved' && ['draft', 'ready_for_payment'].includes(dp.status)"
                            @click="openDisburseModal"
                            class="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                            Cairkan Pembayaran
                        </button>
                    </div>
                </div>

                <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div class="space-y-1">
                        <span class="text-gray-500 block">Metode Pembayaran:</span>
                        <span class="font-semibold text-gray-800 block capitalize">{{ dp.payment_request.payment_method?.replace('_', ' ') }}</span>
                        <span class="text-gray-500 block mt-2">Penerima Dana:</span>
                        <span class="font-bold text-gray-900 block">{{ dp.payment_request.recipient_name || '-' }}</span>
                    </div>

                    <div class="space-y-1">
                        <span class="text-gray-500 block">Rekening Tujuan:</span>
                        <span class="font-mono text-gray-900 block font-bold">{{ dp.payment_request.bank_name || '-' }} - {{ dp.payment_request.bank_account_number || '-' }}</span>
                        <span class="text-gray-500 block mt-2">Atas Nama Rekening:</span>
                        <span class="font-semibold text-gray-800 block">{{ dp.payment_request.bank_account_holder || '-' }}</span>
                    </div>

                    <div class="space-y-1">
                        <span class="text-gray-500 block">Nominal Permohonan:</span>
                        <span class="font-mono text-base font-black text-gray-900 block">{{ formatCurrency(dp.payment_request.amount) }}</span>
                        <span class="text-gray-500 block mt-2">Diajukan Oleh:</span>
                        <span class="text-gray-700 block">{{ dp.payment_request.requester?.name || 'Staff' }}</span>
                    </div>
                </div>

                <!-- Disbursement Details if already paid -->
                <div v-if="dp.payment_request.payment" class="mx-6 mb-6 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <div class="flex items-center gap-2 mb-2 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                        <span>Rincian Pembayaran Kas / Bank (Disbursed)</span>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                            <span class="text-gray-500 block">Nomor Bukti Bayar:</span>
                            <span class="font-mono font-bold text-gray-900">{{ dp.payment_request.payment.payment_number }}</span>
                        </div>
                        <div>
                            <span class="text-gray-500 block">Akun Sumber Dana:</span>
                            <span class="font-semibold text-gray-900">{{ dp.payment_request.payment.source_account?.name || 'Kas / Bank' }}</span>
                        </div>
                        <div>
                            <span class="text-gray-500 block">No. Referensi Bank:</span>
                            <span class="font-mono font-semibold text-gray-900">{{ dp.payment_request.payment.reference_number || '-' }}</span>
                        </div>
                        <div>
                            <span class="text-gray-500 block">Tanggal Pencairan:</span>
                            <span class="font-semibold text-gray-900">{{ formatDate(dp.payment_request.payment.payment_date) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Direct Disbursement Info Banner -->
                <div class="border-t border-gray-100 p-5 bg-blue-50/40 flex items-start gap-3">
                    <CheckCircle2 class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <p class="text-xs font-bold text-slate-800">Pencairan Langsung (Tanpa Alur Approval Finance)</p>
                        <p class="text-[11px] text-slate-600 mt-0.5">
                            Permohonan pembayaran disetujui otomatis berdasarkan Purchase Requisition yang telah disahkan. Kasir keuangan dapat langsung melakukan pencairan dana ke rekening / Virtual Account tujuan.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Goods Receipts (GRN) Section -->
            <div v-if="dp.goods_receipts?.length > 0 || ['paid', 'partially_received', 'completed'].includes(dp.status)" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div class="flex items-center gap-2">
                        <Truck class="w-5 h-5 text-indigo-600" />
                        <div>
                            <h3 class="text-sm font-bold text-gray-900">Penerimaan Barang Fisik (Goods Receipts / GRN)</h3>
                            <p class="text-xs text-gray-500">Pemeriksaan fisik dan tanda terima barang gudang</p>
                        </div>
                    </div>

                    <button 
                        v-if="['paid', 'partially_received'].includes(dp.status)"
                        @click="openGoodsReceiptModal"
                        class="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                    >
                        <Package class="w-3.5 h-3.5" />
                        <span>Catat Penerimaan Barang</span>
                    </button>
                </div>

                <div v-if="dp.goods_receipts?.length > 0" class="divide-y divide-gray-100">
                    <div v-for="gr in dp.goods_receipts" :key="gr.id" class="p-5 space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div class="flex items-center gap-2 font-mono font-bold text-gray-900">
                                <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{{ gr.grn_number }}</span>
                                <span 
                                    :class="[
                                        'px-2 py-0.5 rounded text-[11px] font-sans font-bold border',
                                        gr.handover_status === 'handed_over' 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : 'bg-amber-50 text-amber-800 border-amber-300'
                                    ]"
                                >
                                    {{ gr.handover_status_label || (gr.handover_status === 'handed_over' ? 'Sudah Diambil Pemohon' : 'Sampai di Gudang (Belum Diambil)') }}
                                </span>
                                <span class="text-gray-500 font-sans font-normal ml-1">Surat Jalan:</span>
                                <span class="text-gray-800">{{ gr.delivery_note_number || '-' }}</span>
                            </div>
                            <div class="text-gray-500">
                                Diterima tgl: <strong class="text-gray-800">{{ formatDate(gr.receipt_date) }}</strong>
                                <span v-if="gr.shipping_carrier" class="ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-sans">Kurir: {{ gr.shipping_carrier }}</span>
                            </div>
                        </div>

                        <!-- GR Items List -->
                        <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <table class="w-full text-xs text-left">
                                <thead>
                                    <tr class="text-gray-500 border-b border-gray-200">
                                        <th class="py-1.5">Deskripsi Item</th>
                                        <th class="py-1.5 text-right">Diterima Fisik</th>
                                        <th class="py-1.5 text-right text-emerald-700">Diterima Baik</th>
                                        <th class="py-1.5 text-right text-rose-700">Ditolak (Cacat)</th>
                                        <th class="py-1.5 pl-3">Alasan Penolakan</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    <tr v-for="it in gr.items" :key="it.id">
                                        <td class="py-2 font-medium text-gray-900">{{ it.item_description }}</td>
                                        <td class="py-2 text-right font-mono">{{ Number(it.quantity_received) }}</td>
                                        <td class="py-2 text-right font-mono font-bold text-emerald-700">{{ Number(it.quantity_accepted) }}</td>
                                        <td class="py-2 text-right font-mono font-bold text-rose-700">{{ Number(it.quantity_rejected) }}</td>
                                        <td class="py-2 pl-3 text-gray-500 italic">{{ it.rejection_reason || '-' }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div v-else class="p-8 text-center text-xs text-gray-400">
                    Belum ada bukti fisik penerimaan barang yang dicatat untuk transaksi ini.
                </div>
            </div>

            <!-- Associated PR Approval Workflow & History -->
            <DocumentWorkflowTracker
                v-if="dp.procurement_plan?.purchase_requisition_id"
                documentType="purchase_requisition"
                :documentId="dp.procurement_plan?.purchase_requisition_id"
                title="Progres Alur Persetujuan Dokumen PR Terkait (Workflow)"
                auditTrailTitle="Jejak Audit Persetujuan PR Terkait (Audit Trail)"
            />

            <!-- Items Table -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <Package class="w-4 h-4 text-indigo-600" />
                        <h3 class="text-sm font-bold text-gray-900">Daftar Barang yang Dibeli</h3>
                    </div>
                    <span class="text-xs font-semibold text-gray-500">
                        {{ dp.items?.length || 0 }} Item Transaksi
                    </span>
                </div>

                <BaseTable :columns="tableColumns">
                    <tr 
                        v-for="(item, idx) in dp.items" 
                        :key="item.id"
                        class="hover:bg-gray-50/70 transition-colors"
                    >
                        <!-- No -->
                        <td class="px-6 py-4 text-sm text-gray-500 text-center font-medium">
                            {{ idx + 1 }}
                        </td>

                        <!-- Item details -->
                        <td class="px-6 py-4">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-bold text-gray-900 text-sm">
                                        {{ item.item?.name || item.description || 'Item Pengadaan' }}
                                    </span>
                                    <span 
                                        v-if="!item.item_id" 
                                        class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                    >
                                        Non-Katalog
                                    </span>
                                    <span 
                                        v-else-if="item.item?.code" 
                                        class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600"
                                    >
                                        {{ item.item.code }}
                                    </span>
                                </div>

                                <!-- Product link -->
                                <a 
                                    v-if="item.product_url" 
                                    :href="item.product_url" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
                                >
                                    <ExternalLink class="w-3 h-3" />
                                    <span>Buka Link Produk</span>
                                </a>
                            </div>
                        </td>

                        <!-- Unit -->
                        <td class="px-6 py-4 text-center text-xs font-semibold text-gray-700">
                            {{ item.unit?.code || item.unit?.name || '-' }}
                        </td>

                        <!-- Qty -->
                        <td class="px-6 py-4 text-right font-black text-gray-900 text-sm">
                            {{ Number(item.quantity).toLocaleString('id-ID') }}
                        </td>

                        <!-- Unit Price -->
                        <td class="px-6 py-4 text-right font-mono text-gray-800 text-xs">
                            {{ formatCurrency(item.unit_price) }}
                        </td>

                        <!-- Item Discount -->
                        <td class="px-6 py-4 text-right font-mono text-emerald-700 text-xs">
                            {{ Number(item.discount_amount) > 0 ? formatCurrency(item.discount_amount) : '-' }}
                        </td>

                        <!-- Subtotal -->
                        <td class="px-6 py-4 text-right font-black font-mono text-gray-900 text-sm">
                            {{ formatCurrency(item.total || item.subtotal) }}
                        </td>

                        <!-- Notes -->
                        <td class="px-6 py-4 text-xs text-gray-500 italic">
                            {{ item.notes || '-' }}
                        </td>
                    </tr>
                </BaseTable>
            </div>

            <!-- MODAL 1: Submit Payment Request Modal -->
            <div 
                v-if="showSubmitModal"
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            >
                <div class="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200">
                    <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div class="flex items-center gap-2">
                            <CreditCard class="w-5 h-5 text-blue-600" />
                            <h3 class="font-bold text-gray-900 text-base">Ajukan Pembayaran ke Finance</h3>
                        </div>
                        <button @click="showSubmitModal = false" class="text-gray-400 hover:text-gray-600">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="space-y-3 text-xs">
                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Metode Pembayaran</label>
                            <select v-model="submitForm.payment_method" class="w-full rounded-xl border-gray-300 text-xs p-2.5">
                                <option value="bank_transfer">Transfer Bank (Bank Transfer)</option>
                                <option value="corporate_card">Kartu Kredit Perusahaan (Corporate Card)</option>
                                <option value="cash">Kas Tunai / Cash</option>
                                <option value="marketplace_va">Marketplace Virtual Account</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-gray-700 mb-1">Nama Bank / Channel</label>
                                <input v-model="submitForm.bank_name" type="text" placeholder="misal: BCA / Mandiri" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                            </div>
                            <div>
                                <label class="block font-semibold text-gray-700 mb-1">Nomor Rekening / VA</label>
                                <input v-model="submitForm.bank_account_number" type="text" placeholder="1234567890" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Atas Nama Rekening</label>
                            <input v-model="submitForm.bank_account_holder" type="text" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                        </div>

                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Catatan Pembayaran (Untuk Kasir)</label>
                            <textarea v-model="submitForm.notes" rows="2" placeholder="Catatan instruksi pembayaran untuk kasir keuangan..." class="w-full rounded-xl border-gray-300 text-xs p-2.5"></textarea>
                        </div>

                        <div class="p-3 bg-blue-50 rounded-xl text-blue-800 text-xs">
                            Nominal yang akan diajukan: <strong class="font-mono font-bold">{{ formatCurrency(dp.grand_total) }}</strong>
                        </div>
                    </div>

                    <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button @click="showSubmitModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
                            Batal
                        </button>
                        <button @click="confirmSubmitForPayment" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                            Ajukan ke Kasir Finance
                        </button>
                    </div>
                </div>
            </div>

            <!-- MODAL 2: Disburse Payment Modal (Finance) -->
            <div 
                v-if="showDisburseModal"
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            >
                <div class="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200">
                    <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div class="flex items-center gap-2">
                            <Coins class="w-5 h-5 text-emerald-600" />
                            <h3 class="font-bold text-gray-900 text-base">Pencairan Pembayaran Kas / Bank</h3>
                        </div>
                        <button @click="showDisburseModal = false" class="text-gray-400 hover:text-gray-600">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="space-y-3 text-xs">
                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Akun Sumber Dana (Kas / Rekening Bank) <span class="text-rose-500">*</span></label>
                            <select v-model="disburseForm.source_account_id" class="w-full rounded-xl border-gray-300 text-xs p-2.5">
                                <option value="">-- Pilih Akun Sumber Dana --</option>
                                <option v-for="acc in bankAccounts" :key="acc.id" :value="acc.id">
                                    {{ acc.code }} - {{ acc.name }}
                                </option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-gray-700 mb-1">Tanggal Bayar</label>
                                <input v-model="disburseForm.payment_date" type="date" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                            </div>
                            <div>
                                <label class="block font-semibold text-gray-700 mb-1">No. Referensi Transfer / Cek</label>
                                <input v-model="disburseForm.reference_number" type="text" placeholder="TRX-12345" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Biaya Administrasi Bank (Rp)</label>
                            <input v-model="disburseForm.bank_fee" type="number" min="0" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                        </div>

                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Catatan Pembayaran</label>
                            <textarea v-model="disburseForm.notes" rows="2" placeholder="Catatan pembayaran kasir..." class="w-full rounded-xl border-gray-300 text-xs p-2.5"></textarea>
                        </div>

                        <div class="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs">
                            Total dana yang dicairkan: <strong class="font-mono font-bold">{{ formatCurrency(dp.grand_total) }}</strong>
                        </div>
                    </div>

                    <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button @click="showDisburseModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
                            Batal
                        </button>
                        <button @click="confirmDisburse" class="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                            Konfirmasi Pembayaran
                        </button>
                    </div>
                </div>
            </div>

            <!-- MODAL 3: Goods Receipt Record Modal (Warehouse) -->
            <div 
                v-if="showGoodsReceiptModal"
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto"
            >
                <div class="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-gray-200 my-8">
                    <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div class="flex items-center gap-2">
                            <Truck class="w-5 h-5 text-indigo-600" />
                            <h3 class="font-bold text-gray-900 text-base">Pencatatan Fisik Penerimaan Barang (GRN)</h3>
                        </div>
                        <button @click="showGoodsReceiptModal = false" class="text-gray-400 hover:text-gray-600">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="space-y-4 text-xs">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label class="block font-semibold text-gray-700 mb-1">Nomor Surat Jalan <span class="text-rose-500">*</span></label>
                                <input v-model="grForm.delivery_note_number" type="text" placeholder="misal: SJ-09821" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                            </div>
                            <div>
                                <label class="block font-semibold text-gray-700 mb-1">Kurir / Ekspedisi</label>
                                <input v-model="grForm.shipping_carrier" type="text" placeholder="misal: JNE / Internal Pickup" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                            </div>
                            <div>
                                <label class="block font-semibold text-gray-700 mb-1">Tanggal Penerimaan</label>
                                <input v-model="grForm.receipt_date" type="date" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                            </div>
                        </div>

                        <!-- Items Inspection Table -->
                        <div class="border border-gray-200 rounded-xl overflow-hidden">
                            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 font-bold text-gray-700">
                                Verifikasi & Pemeriksaan Kuantitas Barang
                            </div>
                            <div class="p-3 space-y-3">
                                <div 
                                    v-for="(item, idx) in grForm.items" 
                                    :key="item.direct_purchase_item_id"
                                    class="p-3 rounded-lg border border-gray-100 bg-gray-50/50 space-y-2"
                                >
                                    <div class="flex justify-between items-center font-semibold text-gray-800">
                                        <span>{{ idx + 1 }}. {{ item.item_description }}</span>
                                        <span class="text-gray-500 font-mono">Dipesan: {{ item.ordered_qty }}</span>
                                    </div>
                                    <div class="grid grid-cols-3 gap-2">
                                        <div>
                                            <label class="block text-[11px] text-gray-500 mb-0.5">Qty Diterima Fisik</label>
                                            <input v-model.number="item.quantity_received" type="number" min="0" step="any" class="w-full rounded-lg border-gray-300 text-xs p-1.5" />
                                        </div>
                                        <div>
                                            <label class="block text-[11px] text-emerald-700 font-semibold mb-0.5">Qty Diterima Baik</label>
                                            <input v-model.number="item.quantity_accepted" type="number" min="0" step="any" class="w-full rounded-lg border-gray-300 text-xs p-1.5" />
                                        </div>
                                        <div>
                                            <label class="block text-[11px] text-rose-700 font-semibold mb-0.5">Qty Ditolak (Cacat)</label>
                                            <input v-model.number="item.quantity_rejected" type="number" min="0" step="any" class="w-full rounded-lg border-gray-300 text-xs p-1.5" />
                                        </div>
                                    </div>
                                    <div v-if="item.quantity_rejected > 0">
                                        <label class="block text-[11px] text-rose-700 mb-0.5">Alasan Penolakan</label>
                                        <input v-model="item.rejection_reason" type="text" placeholder="Pecah / tidak sesuai spek..." class="w-full rounded-lg border-gray-300 text-xs p-1.5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Catatan Tambahan Penerimaan</label>
                            <textarea v-model="grForm.notes" rows="2" placeholder="Catatan kondisi fisik barang di gudang..." class="w-full rounded-xl border-gray-300 text-xs p-2.5"></textarea>
                        </div>
                    </div>

                    <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button @click="showGoodsReceiptModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
                            Batal
                        </button>
                        <button @click="confirmGoodsReceipt" class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                            Simpan Tanda Terima Barang
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
