<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../../components/ui/BaseButton.vue'
import Pagination from '../../components/ui/Pagination.vue'
import {
    getPaymentRequests,
    getPaymentRequestDetail,
    disbursePayment,
    resubmitPaymentRequest
} from '../../services/financeServices.js'
import {
    getAccountingAccounts,
    searchAccountingAccounts
} from '../../services/accountingAccountServices.js'
import { uploadFile } from '../../services/fileServices.js'
import { formatCurrency, parseCurrency } from '../../utils/stringUtils.js'
import { showSuccess, showError, showConfirm } from '../../utils/swal.js'
import {
    Landmark,
    CheckCircle2,
    Clock,
    AlertTriangle,
    CreditCard,
    FileText,
    ArrowUpRight,
    Search,
    X,
    Building2,
    Eye,
    Receipt,
    RotateCcw,
    Send,
    DollarSign,
    Calendar,
    UserCheck,
    AlertCircle,
    UploadCloud,
    Paperclip,
    ExternalLink,
    FileCheck,
    Trash2,
    Package,
    ShoppingCart,
    Tag,
    Truck
} from '@lucide/vue'

// State
const isLoading = ref(false)
const items = ref([])
const serverCounts = ref(null)
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10
})

// Search & Filter state
const searchQuery = ref('')
const statusFilter = ref('')
const recipientTypeFilter = ref('')

// Accounts for disbursement
const accountingAccounts = ref([])
const isLoadingAccounts = ref(false)

// Modals
const showDetailModal = ref(false)
const selectedPRQ = ref(null)
const isLoadingDetail = ref(false)

const showDisburseModal = ref(false)
const isSubmittingDisburse = ref(false)
const isUploadingProof = ref(false)
const proofFilePreview = ref(null)
const disburseForm = ref({
    source_account_id: '',
    payment_date: new Date().toISOString().substring(0, 10),
    payment_method: 'bank_transfer',
    bank_fee: 0,
    reference_number: '',
    proof_file_id: null,
    notes: ''
})

const showResubmitModal = ref(false)
const isSubmittingResubmit = ref(false)
const resubmitForm = ref({
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    notes: ''
})

// KPI Metrics computed from items
const kpiMetrics = computed(() => {
    let pendingApproval = 0
    let readyToDisburse = 0
    let paidCount = 0
    let totalPaidAmount = 0

    items.value.forEach(item => {
        const st = item.status?.value || item.status
        const amt = parseFloat(item.amount) || 0
        if (st === 'pending_approval') pendingApproval++
        if (st === 'approved') readyToDisburse++
        if (st === 'paid') {
            paidCount++
            totalPaidAmount += amt
        }
    })

    return {
        pendingApproval,
        readyToDisburse,
        paidCount,
        totalPaidAmount
    }
})

// Status counts for tab badges
const statusCounts = computed(() => {
    if (serverCounts.value) {
        return {
            all: serverCounts.value.all ?? 0,
            pending_approval: serverCounts.value.pending_approval ?? 0,
            approved: serverCounts.value.approved ?? 0,
            readyToDisburse: serverCounts.value.approved ?? 0,
            paid: serverCounts.value.paid ?? 0,
            revisions_or_rejected: serverCounts.value.revision_or_rejected ?? 0
        }
    }
    const counts = {
        all: items.value.length,
        pending_approval: 0,
        approved: 0,
        readyToDisburse: 0,
        paid: 0,
        revisions_or_rejected: 0
    }
    items.value.forEach(item => {
        const st = item.status?.value || item.status
        if (st === 'pending_approval') counts.pending_approval++
        else if (st === 'approved') {
            counts.approved++
            counts.readyToDisburse++
        }
        else if (st === 'paid') counts.paid++
        else if (st === 'revision_requested' || st === 'rejected') counts.revisions_or_rejected++
    })
    return counts
})

// Filtered items based on local tabs if total items loaded
const filteredItems = computed(() => {
    return items.value.filter(item => {
        const st = item.status?.value || item.status
        if (statusFilter.value === 'pending_approval' && st !== 'pending_approval') return false
        if (statusFilter.value === 'approved' && st !== 'approved') return false
        if (statusFilter.value === 'paid' && st !== 'paid') return false
        if (statusFilter.value === 'revision_rejected' && !['revision_requested', 'rejected'].includes(st)) return false
        if (recipientTypeFilter.value && item.recipient_type !== recipientTypeFilter.value) return false
        return true
    })
})

// Source Document Info for Selected PRQ
const sourceDocInfo = computed(() => {
    if (selectedPRQ.value?.direct_purchase) {
        const dp = selectedPRQ.value.direct_purchase
        return {
            type: 'Direct Purchase (Pembelian Langsung)',
            typeCode: 'direct_purchase',
            documentNumber: dp.dp_number,
            channel: dp.purchase_channel,
            marketplace: dp.marketplace_name,
            merchant: dp.merchant_name || dp.supplier?.name,
            storeUrl: dp.store_url,
            route: `/purchasing/direct-purchases/${dp.id}`
        }
    }
    if (selectedPRQ.value?.payable_type === 'direct_purchase' || selectedPRQ.value?.direct_purchase_id) {
        return {
            type: 'Direct Purchase (Pembelian Langsung)',
            typeCode: 'direct_purchase',
            documentNumber: selectedPRQ.value.direct_purchase?.dp_number || `DP #${selectedPRQ.value.direct_purchase_id}`,
            channel: selectedPRQ.value.direct_purchase?.purchase_channel || 'marketplace',
            marketplace: selectedPRQ.value.direct_purchase?.marketplace_name,
            merchant: selectedPRQ.value.direct_purchase?.merchant_name,
            storeUrl: selectedPRQ.value.direct_purchase?.store_url,
            route: `/purchasing/direct-purchases/${selectedPRQ.value.direct_purchase_id}`
        }
    }
    if (selectedPRQ.value?.payable_type === 'rfq' || selectedPRQ.value?.payable_type === 'purchase_order') {
        return {
            type: selectedPRQ.value.payable_type === 'rfq' ? 'RFQ / Tender Vendor' : 'Purchase Order',
            typeCode: selectedPRQ.value.payable_type,
            documentNumber: selectedPRQ.value.payable_number || `#${selectedPRQ.value.payable_id}`,
            channel: 'supplier',
            marketplace: null,
            merchant: selectedPRQ.value.recipient_name,
            storeUrl: null,
            route: null
        }
    }
    return null
})

// Effective Items for Selected PRQ
const effectivePRQItems = computed(() => {
    if (selectedPRQ.value?.items && Array.isArray(selectedPRQ.value.items) && selectedPRQ.value.items.length > 0) {
        return selectedPRQ.value.items
    }
    const dpItems = selectedPRQ.value?.direct_purchase?.items
    if (Array.isArray(dpItems) && dpItems.length > 0) {
        return dpItems.map(item => ({
            id: item.id,
            item_name: item.description || item.item?.name || (item.item_id ? `Item #${item.item_id}` : 'Item Pengadaan'),
            item_code: item.item?.code || null,
            is_non_catalog: !item.item_id,
            quantity: item.quantity,
            unit_name: item.unit?.code || item.unit?.name || '-',
            unit_price: item.unit_price,
            discount_amount: item.discount_amount || 0,
            subtotal: item.total || item.subtotal || ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)),
            notes: item.notes,
            product_url: item.product_url
        }))
    }
    return []
})

// Cost Breakdown for Selected PRQ
const effectiveCostBreakdown = computed(() => {
    if (selectedPRQ.value?.cost_breakdown) {
        return selectedPRQ.value.cost_breakdown
    }
    if (selectedPRQ.value?.direct_purchase) {
        const dp = selectedPRQ.value.direct_purchase
        return {
            subtotal: Number(dp.subtotal) || 0,
            discount_amount: Number(dp.discount_amount) || 0,
            shipping_cost: Number(dp.shipping_cost) || 0,
            platform_fee: Number(dp.platform_fee) || 0,
            tax_amount: Number(dp.tax_amount) || 0,
            grand_total: Number(dp.grand_total) || Number(selectedPRQ.value?.amount) || 0
        }
    }
    return null
})

// Fetch Data
const fetchData = async (page = 1) => {
    isLoading.value = true
    try {
        const filters = {}
        if (statusFilter.value && statusFilter.value !== 'revision_rejected') {
            filters.status = statusFilter.value
        }
        if (recipientTypeFilter.value) {
            filters.recipient_type = recipientTypeFilter.value
        }

        const response = await getPaymentRequests(searchQuery.value, page, filters)
        const rawItems = response.data || response || []
        items.value = Array.isArray(rawItems) ? rawItems : []

        if (response.counts) {
            serverCounts.value = response.counts
        }

        if (response.meta) {
            pagination.value = {
                current_page: response.meta.current_page || 1,
                last_page: response.meta.last_page || 1,
                from: response.meta.from || (items.value.length > 0 ? 1 : 0),
                to: response.meta.to || items.value.length,
                total: response.meta.total ?? items.value.length,
                per_page: response.meta.per_page || 10
            }
        } else {
            pagination.value = {
                current_page: page,
                last_page: 1,
                from: items.value.length > 0 ? 1 : 0,
                to: items.value.length,
                total: items.value.length,
                per_page: 10
            }
        }
    } catch (err) {
        console.error('Failed to fetch payment requests:', err)
        items.value = []
    } finally {
        isLoading.value = false
    }
}

// Fetch accounting accounts for disbursement (filter exclusively to liquid Cash & Bank accounts)
const fetchAccounts = async () => {
    isLoadingAccounts.value = true
    try {
        // Query accounting accounts in subcategory 1 ("Aset Lancar") which contains Kas & Bank
        const res = await searchAccountingAccounts('', 1)
        const accs = res.data?.data || res.data || []
        
        // Filter to liquid cash & bank accounts (1101, 1102, 1103) and exclude non-liquid assets
        const liquidAccounts = accs.filter(acc => {
            const nameLower = (acc.name || '').toLowerCase()
            return (nameLower.includes('kas') || nameLower.includes('bank')) && !nameLower.includes('utang') && !nameLower.includes('bunga')
        })
        accountingAccounts.value = liquidAccounts.length > 0 ? liquidAccounts : accs
    } catch (err) {
        console.error('Failed to load accounting accounts:', err)
        accountingAccounts.value = []
    } finally {
        isLoadingAccounts.value = false
    }
}

// Open Detail Modal
const openDetail = async (item) => {
    selectedPRQ.value = item
    showDetailModal.value = true
    isLoadingDetail.value = true
    try {
        const fullDetail = await getPaymentRequestDetail(item.id)
        selectedPRQ.value = fullDetail.data || fullDetail
    } catch (err) {
        console.warn('Failed to load full PRQ detail, using table row data:', err)
    } finally {
        isLoadingDetail.value = false
    }
}

// Handle upload payment proof file (slip transfer / mutasi)
const handleProofFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
        showError('File Terlalu Besar', 'Ukuran bukti pembayaran maksimal 10MB.')
        return
    }

    isUploadingProof.value = true
    try {
        const res = await uploadFile(file, 'payments')
        const fileData = res.data || res
        disburseForm.value.proof_file_id = fileData.id
        proofFilePreview.value = {
            id: fileData.id,
            name: fileData.original_name || file.name,
            size: fileData.file_size || file.size,
            url: fileData.file_url || (typeof window !== 'undefined' ? window.URL.createObjectURL(file) : ''),
            type: fileData.file_type || file.type,
            isImage: (fileData.file_type || file.type || '').startsWith('image/')
        }
    } catch (err) {
        console.error('Failed to upload payment proof:', err)
        showError('Upload Gagal', err.response?.data?.message || 'Gagal mengunggah file bukti pembayaran.')
    } finally {
        isUploadingProof.value = false
        event.target.value = ''
    }
}

const removeProofFile = () => {
    disburseForm.value.proof_file_id = null
    proofFilePreview.value = null
}

// Open Disburse Modal
const openDisburse = (item) => {
    selectedPRQ.value = item
    
    // Auto-select primary operational bank account (e.g. BCA or Mandiri)
    const defaultAcc = accountingAccounts.value.find(a => (a.name || '').toLowerCase().includes('bca'))
        || accountingAccounts.value.find(a => (a.name || '').toLowerCase().includes('mandiri'))
        || (accountingAccounts.value.length > 0 ? accountingAccounts.value[0] : null)

    disburseForm.value = {
        source_account_id: defaultAcc ? defaultAcc.id : '',
        payment_date: new Date().toISOString().substring(0, 10),
        payment_method: item.payment_method || 'bank_transfer',
        bank_fee: 0,
        reference_number: '',
        proof_file_id: null,
        notes: `Pencairan tagihan ${item.prq_number} kepada ${item.recipient_name}`
    }
    proofFilePreview.value = null
    showDisburseModal.value = true
}

// Submit Disbursement
const handleDisburseSubmit = async () => {
    if (!disburseForm.value.source_account_id) {
        showError('Validasi Gagal', 'Silakan pilih Akun Sumber Kas/Bank.')
        return
    }

    const totalDisbursed = (parseFloat(selectedPRQ.value?.amount) || 0) + (parseFloat(disburseForm.value.bank_fee) || 0)
    const confirmed = await showConfirm(
        'Konfirmasi Pencairan Kas/Bank',
        `Apakah Anda yakin ingin mencairkan dana sebesar ${formatCurrency(totalDisbursed)} untuk dokumen ${selectedPRQ.value?.prq_number}?`,
        'Ya, Cairkan Dana'
    )

    if (!confirmed) return

    isSubmittingDisburse.value = true
    try {
        const payload = {
            source_account_id: parseInt(disburseForm.value.source_account_id, 10),
            payment_date: disburseForm.value.payment_date,
            bank_fee: parseFloat(disburseForm.value.bank_fee) || 0,
            reference_number: disburseForm.value.reference_number || null,
            proof_file_id: disburseForm.value.proof_file_id || null,
            notes: disburseForm.value.notes || null
        }

        await disbursePayment(selectedPRQ.value.id, payload)
        showSuccess('Berhasil!', `Dana sebesar ${formatCurrency(totalDisbursed)} berhasil dicairkan.`)
        showDisburseModal.value = false
        fetchData(pagination.value.current_page)
    } catch (err) {
        console.error('Disbursement failed:', err)
        showError('Pencairan Gagal', err.response?.data?.message || 'Terjadi kesalahan saat memproses pencairan kas.')
    } finally {
        isSubmittingDisburse.value = false
    }
}

// Open Resubmit Modal
const openResubmit = (item) => {
    selectedPRQ.value = item
    resubmitForm.value = {
        bank_name: item.bank_name || '',
        bank_account_number: item.bank_account_number || '',
        bank_account_holder: item.bank_account_holder || '',
        notes: ''
    }
    showResubmitModal.value = true
}

// Handle Resubmit Submit
const handleResubmitSubmit = async () => {
    if (!resubmitForm.value.bank_name || !resubmitForm.value.bank_account_number || !resubmitForm.value.bank_account_holder) {
        showError('Validasi Gagal', 'Nama bank, nomor rekening, dan nama pemilik rekening wajib diisi.')
        return
    }

    const confirmed = await showConfirm(
        'Ajukan Ulang Pembayaran',
        `Kirimkan data perbaikan rekening untuk dokumen ${selectedPRQ.value?.prq_number} ke approver?`,
        'Ya, Ajukan Ulang'
    )

    if (!confirmed) return

    isSubmittingResubmit.value = true
    try {
        await resubmitPaymentRequest(selectedPRQ.value.id, resubmitForm.value)
        showSuccess('Berhasil!', 'Permohonan pembayaran berhasil diajukan ulang ke approver.')
        showResubmitModal.value = false
        fetchData(pagination.value.current_page)
    } catch (err) {
        console.error('Resubmit failed:', err)
        showError('Gagal Mengajukan Ulang', err.response?.data?.message || 'Terjadi kesalahan sistem.')
    } finally {
        isSubmittingResubmit.value = false
    }
}

// Status helpers
const getStatusBadge = (status) => {
    const st = typeof status === 'object' && status !== null ? status.value : status
    switch (st) {
        case 'approved':
            return {
                label: 'Siap Dicairkan',
                class: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
        case 'paid':
            return {
                label: 'Telah Dibayar (Paid)',
                class: 'bg-blue-50 text-blue-700 border-blue-200'
            }
        case 'revision_requested':
            return {
                label: 'Perlu Revisi',
                class: 'bg-amber-50 text-amber-800 border-amber-200'
            }
        case 'rejected':
            return {
                label: 'Ditolak',
                class: 'bg-rose-50 text-rose-700 border-rose-200'
            }
        case 'pending_approval':
        default:
            return {
                label: 'Menunggu Approval',
                class: 'bg-amber-50 text-amber-800 border-amber-200'
            }
    }
}

const getRecipientLabel = (type) => {
    switch (type) {
        case 'supplier': return 'Supplier Resmi'
        case 'marketplace_va': return 'VA / Marketplace'
        case 'employee_reimbursement': return 'Reimbursement'
        default: return type || '-'
    }
}

// Debounce search
let searchTimeout = null
watch(searchQuery, () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchData(1)
    }, 400)
})

watch([statusFilter, recipientTypeFilter], () => {
    fetchData(1)
})

onMounted(() => {
    fetchData()
    fetchAccounts()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Finance', icon: Landmark },
                { label: 'Permohonan Pembayaran' }
            ]" 
        />

        <!-- 1. Header & Segmented Sub-Navigation -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <Landmark class="w-5 h-5" />
                    </span>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
                            Permohonan Pembayaran (Payment Requests)
                        </h1>
                        <p class="text-sm text-slate-500 mt-0.5">
                            Kelola verifikasi tagihan rekanan, nomor rekening/Virtual Account tujuan, dan pencairan dana kas/bank.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Segmented Sub-Navigation -->
            <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
                <RouterLink
                    :to="{ name: 'user.finance.payment-requests' }"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 bg-white text-blue-600 shadow-xs border border-slate-200/60"
                >
                    <Receipt class="w-3.5 h-3.5" />
                    Permohonan Pembayaran
                </RouterLink>
                <RouterLink
                    :to="{ name: 'user.finance.payments' }"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900"
                >
                    <CreditCard class="w-3.5 h-3.5" />
                    Riwayat Kas Keluar
                </RouterLink>
            </div>
        </div>

        <!-- 2. KPI Metrics Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                    <FileText class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500">Total Permohonan</p>
                    <p class="text-xl font-bold text-slate-900 mt-0.5">{{ statusCounts.all ?? items.length }} <span class="text-xs font-normal text-slate-400">Tagihan</span></p>
                </div>
            </div>

            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                    <CheckCircle2 class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500">Siap Dicairkan Kasir</p>
                    <p class="text-xl font-bold text-emerald-600 mt-0.5">{{ kpiMetrics.readyToDisburse }} <span class="text-xs font-normal text-slate-400">Tagihan</span></p>
                </div>
            </div>

            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                    <Receipt class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500">Telah Dibayar (Bulan Ini)</p>
                    <p class="text-xl font-bold text-blue-600 mt-0.5">{{ kpiMetrics.paidCount }} <span class="text-xs font-normal text-slate-400">Transaksi</span></p>
                </div>
            </div>

            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-11 h-11 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
                    <DollarSign class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500">Nominal Cair (Bulan Ini)</p>
                    <p class="text-lg font-bold font-mono text-slate-900 mt-0.5">{{ formatCurrency(kpiMetrics.totalPaidAmount) }}</p>
                </div>
            </div>
        </div>

        <!-- 3. Filter Bar & Segmented Tabs -->
        <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-4">
            <!-- Search & Dropdown Filters -->
            <div class="flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cari No. PRQ, nama penerima, no. rekening, atau catatan..."
                        class="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    />
                    <button
                        v-if="searchQuery"
                        type="button"
                        @click="searchQuery = ''"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <div class="sm:w-56">
                    <select
                        v-model="recipientTypeFilter"
                        class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    >
                        <option value="">Semua Tipe Penerima</option>
                        <option value="supplier">Supplier Resmi</option>
                        <option value="marketplace_va">Virtual Account / Marketplace</option>
                        <option value="employee_reimbursement">Reimbursement Karyawan</option>
                    </select>
                </div>
            </div>

            <!-- Status Tabs -->
            <div class="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 text-xs">
                <button
                    type="button"
                    @click="statusFilter = ''"
                    :class="[
                        'px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap',
                        statusFilter === ''
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                    ]"
                >
                    Semua
                    <span :class="['ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]', statusFilter === '' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700']">
                        {{ statusCounts.all ?? 0 }}
                    </span>
                </button>

                <button
                    type="button"
                    @click="statusFilter = 'approved'"
                    :class="[
                        'px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap',
                        statusFilter === 'approved'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                    ]"
                >
                    Siap Dicairkan (Belum Bayar)
                    <span :class="['ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]', statusFilter === 'approved' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800']">
                        {{ statusCounts.readyToDisburse ?? 0 }}
                    </span>
                </button>

                <button
                    type="button"
                    @click="statusFilter = 'paid'"
                    :class="[
                        'px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap',
                        statusFilter === 'paid'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                    ]"
                >
                    Telah Dibayar (Paid)
                    <span :class="['ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]', statusFilter === 'paid' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700']">
                        {{ statusCounts.paid ?? 0 }}
                    </span>
                </button>
            </div>
        </div>

        <!-- 4. Data Table -->
        <div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th class="py-3 px-4">No. Dokumen PRQ</th>
                            <th class="py-3 px-4">Dokumen Asal</th>
                            <th class="py-3 px-4">Penerima Dana</th>
                            <th class="py-3 px-4">Rekening Tujuan</th>
                            <th class="py-3 px-4 text-right">Total Tagihan</th>
                            <th class="py-3 px-4 text-center">Status</th>
                            <th class="py-3 px-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-xs">
                        <tr v-if="isLoading" class="bg-white">
                            <td colspan="7" class="py-12 text-center text-slate-400">
                                <div class="inline-flex items-center gap-2">
                                    <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    Memuat data permohonan pembayaran...
                                </div>
                            </td>
                        </tr>

                        <tr v-else-if="filteredItems.length === 0" class="bg-white">
                            <td colspan="7" class="py-12 text-center">
                                <div class="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center border border-slate-200/60 mb-2">
                                    <Receipt class="w-6 h-6" />
                                </div>
                                <p class="text-sm font-semibold text-slate-700">Tidak ada permohonan pembayaran ditemukan</p>
                                <p class="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter status transaksi.</p>
                            </td>
                        </tr>

                        <tr
                            v-for="item in filteredItems"
                            :key="item.id"
                            class="hover:bg-slate-50/60 transition-colors"
                        >
                            <!-- No Dokumen PRQ & Tanggal -->
                            <td class="py-3.5 px-4 font-mono font-semibold text-blue-600">
                                <button
                                    type="button"
                                    @click="openDetail(item)"
                                    class="hover:underline text-left"
                                >
                                    {{ item.prq_number }}
                                </button>
                                <div class="text-[11px] font-sans font-normal text-slate-400 mt-0.5">
                                    {{ item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }}
                                </div>
                            </td>

                            <!-- Asal Dokumen -->
                            <td class="py-3.5 px-4">
                                <div v-if="item.direct_purchase" class="flex flex-col">
                                    <span class="font-mono text-[11px] font-semibold text-slate-800">
                                        {{ item.direct_purchase.dp_number }}
                                    </span>
                                    <span class="text-[10px] text-slate-400">Direct Purchase</span>
                                </div>
                                <span v-else class="text-slate-400 font-mono text-[11px]">-</span>
                            </td>

                            <!-- Penerima Dana -->
                            <td class="py-3.5 px-4">
                                <div class="font-medium text-slate-800">
                                    {{ item.recipient_name || '-' }}
                                </div>
                                <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200/60">
                                    {{ getRecipientLabel(item.recipient_type) }}
                                </span>
                            </td>

                            <!-- Rekening Tujuan -->
                            <td class="py-3.5 px-4">
                                <div class="text-slate-800 font-medium">
                                    {{ item.bank_name || '-' }}
                                </div>
                                <div class="font-mono text-[11px] text-slate-500">
                                    {{ item.bank_account_number || '-' }}
                                </div>
                                <div class="text-[10px] text-slate-400 truncate max-w-[160px]">
                                    a.n. {{ item.bank_account_holder || '-' }}
                                </div>
                            </td>

                            <!-- Total Tagihan -->
                            <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                                {{ formatCurrency(item.amount) }}
                            </td>

                            <!-- Status -->
                            <td class="py-3.5 px-4 text-center">
                                <span
                                    :class="[
                                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                                        getStatusBadge(item.status).class
                                    ]"
                                >
                                    {{ getStatusBadge(item.status).label }}
                                </span>
                            </td>

                            <!-- Aksi -->
                            <td class="py-3.5 px-4 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <!-- Detail / Review -->
                                    <button
                                        type="button"
                                        @click="openDetail(item)"
                                        class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Lihat Detail & Workflow"
                                    >
                                        <Eye class="w-4 h-4" />
                                    </button>

                                    <!-- Cairkan Dana (Khusus status approved) -->
                                    <button
                                        v-if="(item.status?.value || item.status) === 'approved'"
                                        type="button"
                                        @click="openDisburse(item)"
                                        class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-2xs"
                                        title="Cairkan Dana Kasir"
                                    >
                                        <CreditCard class="w-3.5 h-3.5" />
                                        Cairkan
                                    </button>

                                    <!-- Ajukan Ulang (Khusus status revision_requested) -->
                                    <button
                                        v-if="(item.status?.value || item.status) === 'revision_requested'"
                                        type="button"
                                        @click="openResubmit(item)"
                                        class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1 shadow-2xs"
                                        title="Perbaiki & Ajukan Ulang"
                                    >
                                        <RotateCcw class="w-3.5 h-3.5" />
                                        Ajukan Ulang
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="p-4 border-t border-slate-100 flex items-center justify-between">
                <Pagination
                    :pagination="pagination"
                    @page-change="fetchData"
                />
            </div>
        </div>

        <!-- 5. Modal Detail & Workflow Review -->
        <div
            v-if="showDetailModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
        >
            <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                    <div class="flex items-center gap-2.5">
                        <span class="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                            <Receipt class="w-5 h-5" />
                        </span>
                        <div>
                            <h3 class="text-lg font-bold text-slate-900">
                                Detail Permohonan Pembayaran
                            </h3>
                            <p class="text-xs font-mono text-slate-500">
                                {{ selectedPRQ?.prq_number }}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        @click="showDetailModal = false"
                        class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                    <!-- Ringkasan Finansial Card -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div>
                            <span class="text-slate-400">Total Nominal Tagihan:</span>
                            <p class="text-base font-bold font-mono text-slate-900 mt-0.5">
                                {{ formatCurrency(selectedPRQ?.amount) }}
                            </p>
                        </div>
                        <div>
                            <span class="text-slate-400">Status Pembayaran:</span>
                            <div class="mt-1">
                                <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', getStatusBadge(selectedPRQ?.status).class]">
                                    {{ getStatusBadge(selectedPRQ?.status).label }}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span class="text-slate-400">Jatuh Tempo:</span>
                            <p class="font-medium text-slate-800 mt-0.5">
                                {{ selectedPRQ?.due_date || 'Segera (Immediate)' }}
                            </p>
                        </div>
                    </div>

                    <!-- Dokumen Asal Pengadaan (Direct Purchase / RFQ) -->
                    <div v-if="sourceDocInfo" class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                        <div class="flex items-center justify-between">
                            <h4 class="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                <ShoppingCart class="w-4 h-4 text-blue-600" />
                                Dokumen Asal Pengadaan
                            </h4>
                            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {{ sourceDocInfo.type }}
                            </span>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <p class="text-slate-400">Nomor Dokumen:</p>
                                <div class="mt-0.5 flex items-center gap-1.5">
                                    <span class="font-mono font-bold text-slate-900">{{ sourceDocInfo.documentNumber }}</span>
                                    <RouterLink
                                        v-if="sourceDocInfo.route"
                                        :to="sourceDocInfo.route"
                                        target="_blank"
                                        class="text-blue-600 hover:text-blue-700 inline-flex items-center"
                                        title="Buka Dokumen Pengadaan"
                                    >
                                        <ExternalLink class="w-3.5 h-3.5" />
                                    </RouterLink>
                                </div>
                            </div>
                            <div>
                                <p class="text-slate-400">Saluran Pembelian:</p>
                                <p class="font-medium text-slate-800 mt-0.5 capitalize">{{ sourceDocInfo.channel?.replace('_', ' ') || '-' }}</p>
                            </div>
                            <div>
                                <p class="text-slate-400">Toko / Merchant / Marketplace:</p>
                                <div class="mt-0.5 flex items-center gap-1.5">
                                    <span class="font-medium text-slate-800">{{ sourceDocInfo.merchant || sourceDocInfo.marketplace || '-' }}</span>
                                    <a
                                        v-if="sourceDocInfo.storeUrl"
                                        :href="sourceDocInfo.storeUrl"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-blue-600 hover:text-blue-700 inline-flex items-center"
                                        title="Kunjungi Toko"
                                    >
                                        <ExternalLink class="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                            <div>
                                <p class="text-slate-400">Pemohon (Purchasing):</p>
                                <p class="font-medium text-slate-800 mt-0.5">
                                    {{ selectedPRQ?.requester?.employee?.name || selectedPRQ?.requester?.name || '-' }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Informasi Rekening & Rekanan -->
                    <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                        <h4 class="font-semibold text-slate-900 text-sm flex items-center gap-2">
                            <Building2 class="w-4 h-4 text-blue-600" />
                            Informasi Rekening Penerima Dana
                        </h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <p class="text-slate-400">Nama Penerima / Vendor:</p>
                                <p class="font-medium text-slate-800 mt-0.5">{{ selectedPRQ?.recipient_name || '-' }}</p>
                            </div>
                            <div>
                                <p class="text-slate-400">Tipe Penerima:</p>
                                <p class="font-medium text-slate-800 mt-0.5">{{ getRecipientLabel(selectedPRQ?.recipient_type) }}</p>
                            </div>
                            <div>
                                <p class="text-slate-400">Bank Tujuan:</p>
                                <p class="font-medium text-slate-800 mt-0.5">{{ selectedPRQ?.bank_name || '-' }}</p>
                            </div>
                            <div>
                                <p class="text-slate-400">Nomor Rekening / VA:</p>
                                <p class="font-mono font-bold text-slate-900 mt-0.5">{{ selectedPRQ?.bank_account_number || '-' }}</p>
                                <p class="text-[10px] text-slate-400">a.n. {{ selectedPRQ?.bank_account_holder || '-' }}</p>
                            </div>
                        </div>
                        <div v-if="selectedPRQ?.notes" class="pt-2 border-t border-slate-100">
                            <p class="text-slate-400">Catatan Pengajuan:</p>
                            <p class="text-slate-700 italic mt-0.5">{{ selectedPRQ.notes }}</p>
                        </div>
                    </div>

                    <!-- RINCIAN BARANG / JASA (ITEMS TABLE) & KALKULASI BIAYA -->
                    <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <h4 class="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                <Package class="w-4 h-4 text-blue-600" />
                                Daftar Barang / Jasa yang Dibayarkan
                            </h4>
                            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {{ effectivePRQItems.length }} Item
                            </span>
                        </div>

                        <!-- Empty State -->
                        <div v-if="effectivePRQItems.length === 0" class="p-6 text-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500">
                            <Package class="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p>Dokumen ini tidak memiliki rincian item barang/jasa atau item dimuat dari sistem dokumen terkait.</p>
                        </div>

                        <!-- Table -->
                        <div v-else class="rounded-lg border border-slate-200 overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                                            <th class="py-2.5 px-3 w-10 text-center">No</th>
                                            <th class="py-2.5 px-3 min-w-[200px]">Item / Deskripsi</th>
                                            <th class="py-2.5 px-3 text-right w-20">Jumlah</th>
                                            <th class="py-2.5 px-3 text-center w-20">Satuan</th>
                                            <th class="py-2.5 px-3 text-right w-28">Harga Satuan</th>
                                            <th class="py-2.5 px-3 text-right w-28">Subtotal</th>
                                            <th class="py-2.5 px-3 min-w-[150px]">Catatan / Tautan</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 bg-white">
                                        <tr v-for="(item, idx) in effectivePRQItems" :key="item.id || idx" class="hover:bg-slate-50/60 transition-colors">
                                            <td class="py-2.5 px-3 text-center text-slate-400 font-medium">{{ idx + 1 }}</td>
                                            <td class="py-2.5 px-3">
                                                <div class="flex items-center gap-1.5 flex-wrap">
                                                    <span class="font-bold text-slate-900">{{ item.item_name }}</span>
                                                    <span v-if="item.is_non_catalog" class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        Non-Katalog
                                                    </span>
                                                    <span v-else-if="item.item_code" class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-600">
                                                        {{ item.item_code }}
                                                    </span>
                                                </div>
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                                {{ Number(item.quantity).toLocaleString('id-ID') }}
                                            </td>
                                            <td class="py-2.5 px-3 text-center text-slate-600 font-medium">
                                                {{ item.unit_name || item.unit?.code || '-' }}
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono text-slate-700">
                                                {{ formatCurrency(item.unit_price) }}
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                                {{ formatCurrency(item.subtotal) }}
                                            </td>
                                            <td class="py-2.5 px-3">
                                                <div class="space-y-0.5">
                                                    <p v-if="item.notes" class="text-slate-500 italic">{{ item.notes }}</p>
                                                    <a
                                                        v-if="item.product_url"
                                                        :href="item.product_url"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                                    >
                                                        <ExternalLink class="w-3 h-3" />
                                                        <span>Link Produk</span>
                                                    </a>
                                                    <span v-if="!item.notes && !item.product_url" class="text-slate-300">-</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Rincian Biaya Tambahan & Total (Cost Breakdown) -->
                            <div v-if="effectiveCostBreakdown" class="bg-slate-50/80 p-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                                <div class="text-[11px] text-slate-500 space-y-0.5">
                                    <p>Verifikasi item dan nominal tagihan sebelum memproses pencairan kasir.</p>
                                    <p v-if="effectiveCostBreakdown.shipping_cost > 0 || effectiveCostBreakdown.platform_fee > 0" class="text-slate-400">
                                        Termasuk ongkos kirim dan biaya platform dari marketplace / vendor.
                                    </p>
                                </div>
                                <div class="w-full sm:w-72 space-y-1.5 text-xs">
                                    <div class="flex justify-between text-slate-600">
                                        <span>Subtotal Barang:</span>
                                        <span class="font-mono font-medium">{{ formatCurrency(effectiveCostBreakdown.subtotal) }}</span>
                                    </div>
                                    <div v-if="effectiveCostBreakdown.discount_amount > 0" class="flex justify-between text-emerald-700">
                                        <span>Diskon:</span>
                                        <span class="font-mono font-medium">-{{ formatCurrency(effectiveCostBreakdown.discount_amount) }}</span>
                                    </div>
                                    <div v-if="effectiveCostBreakdown.shipping_cost > 0" class="flex justify-between text-slate-600">
                                        <span>Ongkos Kirim:</span>
                                        <span class="font-mono font-medium">+{{ formatCurrency(effectiveCostBreakdown.shipping_cost) }}</span>
                                    </div>
                                    <div v-if="effectiveCostBreakdown.platform_fee > 0" class="flex justify-between text-slate-600">
                                        <span>Biaya Layanan:</span>
                                        <span class="font-mono font-medium">+{{ formatCurrency(effectiveCostBreakdown.platform_fee) }}</span>
                                    </div>
                                    <div v-if="effectiveCostBreakdown.tax_amount > 0" class="flex justify-between text-slate-600">
                                        <span>Pajak (PPN):</span>
                                        <span class="font-mono font-medium">+{{ formatCurrency(effectiveCostBreakdown.tax_amount) }}</span>
                                    </div>
                                    <div class="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-slate-900 text-sm">
                                        <span>Total Tagihan:</span>
                                        <span class="font-mono text-blue-600">{{ formatCurrency(effectiveCostBreakdown.grand_total) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Realisasi Pembayaran Kasir & Bukti Transfer (Jika Sudah Paid) -->
                    <div v-if="selectedPRQ?.payment" class="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
                        <div class="flex items-center justify-between">
                            <h4 class="font-bold text-slate-800 flex items-center gap-1.5">
                                <CreditCard class="w-4 h-4 text-emerald-600" />
                                Realisasi Pencairan Kasir (Disbursement)
                            </h4>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Telah Dibayar (Paid)
                            </span>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-700">
                            <div>
                                <p class="text-slate-400">No. Bukti Kasir:</p>
                                <p class="font-mono font-bold text-slate-900 mt-0.5">{{ selectedPRQ.payment.payment_number }}</p>
                            </div>
                            <div>
                                <p class="text-slate-400">Tanggal Realisasi:</p>
                                <p class="font-medium text-slate-800 mt-0.5">
                                    {{ selectedPRQ.payment.payment_date ? new Date(selectedPRQ.payment.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' }}
                                </p>
                            </div>
                            <div>
                                <p class="text-slate-400">Akun Sumber Dana:</p>
                                <p class="font-medium text-slate-800 mt-0.5">{{ selectedPRQ.payment.source_account?.name || '-' }}</p>
                            </div>
                            <div>
                                <p class="text-slate-400">Biaya Admin Bank:</p>
                                <p class="font-mono text-slate-800 mt-0.5">{{ formatCurrency(selectedPRQ.payment.bank_fee) }}</p>
                            </div>
                            <div>
                                <p class="text-slate-400">No. Referensi / Mutasi:</p>
                                <p class="font-mono font-bold text-slate-900 mt-0.5">{{ selectedPRQ.payment.reference_number || '-' }}</p>
                            </div>
                        </div>

                        <!-- Bukti Transfer File Preview -->
                        <div v-if="selectedPRQ.payment.proof_file" class="pt-2 border-t border-emerald-200/80">
                            <p class="text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                                <Paperclip class="w-3.5 h-3.5 text-emerald-600" />
                                Lampiran Bukti Transfer / Slip Pembayaran:
                            </p>
                            <div class="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-lg">
                                <div class="flex items-center gap-2.5 overflow-hidden">
                                    <div class="w-8 h-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <FileCheck class="w-4 h-4" />
                                    </div>
                                    <div class="truncate">
                                        <p class="font-semibold text-slate-800 truncate text-xs">{{ selectedPRQ.payment.proof_file.original_name }}</p>
                                        <p class="text-[10px] text-slate-400 font-mono">{{ Math.round((selectedPRQ.payment.proof_file.file_size || 0) / 1024) }} KB</p>
                                    </div>
                                </div>
                                <a
                                    :href="selectedPRQ.payment.proof_file.file_url"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 shrink-0"
                                >
                                    <ExternalLink class="w-3 h-3" />
                                    Buka File
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Informasi Status Tagihan -->
                    <div class="border border-blue-200 bg-blue-50/50 rounded-xl p-4 flex items-start gap-3">
                        <CheckCircle2 class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p class="text-xs font-bold text-slate-800">Tagihan Siap Dicairkan (Persetujuan Otomatis dari PR)</p>
                            <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                Sesuai regulasi sistem, permohonan pembayaran (Payment Request) tidak melewati jenjang approval finance terpisah. Dokumen ini disahkan secara langsung saat Purchase Requisition (PR) / Direct Purchase disetujui, dan kasir dapat langsung memproses pencairan dana melalui tombol di bawah.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button
                        type="button"
                        @click="showDetailModal = false"
                        class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Tutup
                    </button>

                    <div class="flex items-center gap-2">
                        <button
                            v-if="(selectedPRQ?.status?.value || selectedPRQ?.status) === 'approved'"
                            type="button"
                            @click="showDetailModal = false; openDisburse(selectedPRQ)"
                            class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5"
                        >
                            <CreditCard class="w-4 h-4" />
                            Cairkan Dana Sekarang
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 6. Modal Kasir: Pencairan Dana (Disburse) -->
        <div
            v-if="showDisburseModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
        >
            <div class="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/60">
                    <div class="flex items-center gap-2.5">
                        <span class="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                            <CreditCard class="w-5 h-5" />
                        </span>
                        <div>
                            <h3 class="text-base font-bold text-slate-900">
                                Pencairan Dana Kasir (Disbursement)
                            </h3>
                            <p class="text-xs font-mono text-slate-500">
                                Dokumen: {{ selectedPRQ?.prq_number }}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        @click="showDisburseModal = false"
                        class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-4 text-xs">
                    <!-- Ringkasan Tagihan -->
                    <div class="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
                        <div v-if="sourceDocInfo" class="flex justify-between items-center">
                            <span class="text-slate-500">Dokumen Acuan:</span>
                            <span class="font-mono font-medium text-slate-800">{{ sourceDocInfo.documentNumber }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-500">Penerima Dana:</span>
                            <span class="font-medium text-slate-800">{{ selectedPRQ?.recipient_name }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-500">Bank & No Rekening:</span>
                            <span class="font-mono text-slate-800">{{ selectedPRQ?.bank_name }} - {{ selectedPRQ?.bank_account_number }}</span>
                        </div>
                        <div v-if="effectivePRQItems.length > 0" class="flex justify-between items-center">
                            <span class="text-slate-500">Rincian Item:</span>
                            <span class="text-slate-700 font-medium">{{ effectivePRQItems.length }} Item ({{ effectivePRQItems[0]?.item_name }}{{ effectivePRQItems.length > 1 ? ', dll' : '' }})</span>
                        </div>
                        <div class="flex justify-between items-center pt-1.5 border-t border-slate-200 font-bold">
                            <span class="text-slate-700">Nominal Tagihan:</span>
                            <span class="font-mono text-slate-900 text-sm">{{ formatCurrency(selectedPRQ?.amount) }}</span>
                        </div>
                    </div>

                    <!-- Form Input Kasir -->
                    <div class="space-y-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">
                                Akun Sumber Kas/Bank <span class="text-rose-500">*</span>
                            </label>
                            <select
                                v-model="disburseForm.source_account_id"
                                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            >
                                <option value="" disabled>Pilih Akun Sumber Dana</option>
                                <option
                                    v-for="acc in accountingAccounts"
                                    :key="acc.id"
                                    :value="acc.id"
                                >
                                    {{ acc.account_code || acc.code ? `[${acc.account_code || acc.code}] ` : '' }}{{ acc.name }}
                                </option>
                            </select>
                            <p class="text-[11px] text-slate-400 mt-1">
                                Menampilkan akun Kas & Bank operasional aktif.
                            </p>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">
                                    Metode Pembayaran
                                </label>
                                <select
                                    v-model="disburseForm.payment_method"
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                >
                                    <option value="bank_transfer">Transfer Bank</option>
                                    <option value="cash">Tunai / Kas Kecil</option>
                                    <option value="marketplace_va">Virtual Account</option>
                                    <option value="corporate_card">Kartu Korporat</option>
                                </select>
                            </div>

                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">
                                    Tanggal Pembayaran <span class="text-rose-500">*</span>
                                </label>
                                <input
                                    v-model="disburseForm.payment_date"
                                    type="date"
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">
                                    Biaya Admin Bank (Rp)
                                </label>
                                <input
                                    v-model="disburseForm.bank_fee"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">
                                    No. Referensi / Bukti Mutasi
                                </label>
                                <input
                                    v-model="disburseForm.reference_number"
                                    type="text"
                                    placeholder="e.g. TRF-BCA-8921"
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                />
                            </div>
                        </div>

                        <!-- Bukti Pembayaran / Slip Transfer Upload -->
                        <div class="space-y-1.5">
                            <label class="block font-semibold text-slate-700">
                                Bukti Pembayaran / Slip Transfer <span class="text-slate-400 font-normal">(Opsional / Dianjurkan)</span>
                            </label>
                            
                            <!-- If already uploaded, show preview card -->
                            <div v-if="proofFilePreview" class="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                                <div class="flex items-center gap-2.5 overflow-hidden">
                                    <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <FileCheck class="w-5 h-5" />
                                    </div>
                                    <div class="truncate">
                                        <p class="font-semibold text-slate-800 text-xs truncate">{{ proofFilePreview.name }}</p>
                                        <p class="text-[10px] text-slate-400 font-mono">{{ Math.round((proofFilePreview.size || 0) / 1024) }} KB • Berhasil Diunggah</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    <a
                                        :href="proofFilePreview.url"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                        title="Buka File"
                                    >
                                        <ExternalLink class="w-4 h-4" />
                                    </a>
                                    <button
                                        type="button"
                                        @click="removeProofFile"
                                        class="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                        title="Hapus / Ganti File"
                                    >
                                        <Trash2 class="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <!-- Upload Box -->
                            <div v-else class="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-3 text-center transition-colors bg-slate-50/50 hover:bg-blue-50/30">
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    @change="handleProofFileUpload"
                                    :disabled="isUploadingProof"
                                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <div v-if="isUploadingProof" class="py-2 flex flex-col items-center justify-center gap-1.5 text-blue-600">
                                    <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span class="text-xs font-semibold">Mengunggah bukti pembayaran...</span>
                                </div>
                                <div v-else class="flex flex-col items-center justify-center py-1">
                                    <UploadCloud class="w-6 h-6 text-slate-400 mb-1" />
                                    <p class="font-medium text-slate-700 text-xs">
                                        Klik atau seret file slip transfer / bukti mutasi di sini
                                    </p>
                                    <p class="text-[10px] text-slate-400 mt-0.5">
                                        Format JPG, PNG, WEBP, atau PDF (Maks. 10 MB)
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">
                                Catatan Pembayaran Kasir
                            </label>
                            <textarea
                                v-model="disburseForm.notes"
                                rows="2"
                                placeholder="Catatan internal pengeluaran kas..."
                                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            ></textarea>
                        </div>

                        <!-- Grand Total Disburse Calculation -->
                        <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                            <div>
                                <p class="text-[11px] text-emerald-800 font-medium">Total Kas Keluar (Tagihan + Admin):</p>
                                <p class="text-sm font-bold font-mono text-emerald-900 mt-0.5">
                                    {{ formatCurrency((parseFloat(selectedPRQ?.amount) || 0) + (parseFloat(disburseForm.bank_fee) || 0)) }}
                                </p>
                            </div>
                            <span class="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded">
                                Realisasi Kasir
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button
                        type="button"
                        @click="showDisburseModal = false"
                        class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Batal
                    </button>

                    <button
                        type="button"
                        @click="handleDisburseSubmit"
                        :disabled="isSubmittingDisburse"
                        class="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                        <CheckCircle2 v-if="!isSubmittingDisburse" class="w-4 h-4" />
                        <div v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {{ isSubmittingDisburse ? 'Memproses...' : 'Konfirmasi Pencairan Kasir' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- 7. Modal Ajukan Ulang (Resubmit) -->
        <div
            v-if="showResubmitModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
        >
            <div class="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/60">
                    <div class="flex items-center gap-2">
                        <RotateCcw class="w-5 h-5 text-amber-600" />
                        <h3 class="text-base font-bold text-slate-900">
                            Ajukan Ulang Permohonan Pembayaran
                        </h3>
                    </div>
                    <button
                        type="button"
                        @click="showResubmitModal = false"
                        class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <div class="p-6 space-y-3.5 text-xs">
                    <p class="text-slate-500">
                        Perbarui rincian rekening tujuan atau catatan koreksi untuk diajukan kembali ke approver keuangan.
                    </p>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Nama Bank <span class="text-rose-500">*</span></label>
                        <input
                            v-model="resubmitForm.bank_name"
                            type="text"
                            placeholder="e.g. Bank Central Asia (BCA)"
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Nomor Rekening <span class="text-rose-500">*</span></label>
                        <input
                            v-model="resubmitForm.bank_account_number"
                            type="text"
                            placeholder="e.g. 521098231"
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Nama Pemilik Rekening <span class="text-rose-500">*</span></label>
                        <input
                            v-model="resubmitForm.bank_account_holder"
                            type="text"
                            placeholder="e.g. PT Mitra Sejahtera"
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Catatan Koreksi</label>
                        <textarea
                            v-model="resubmitForm.notes"
                            rows="2"
                            placeholder="Jelaskan perbaikan yang telah dilakukan..."
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        ></textarea>
                    </div>
                </div>

                <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button
                        type="button"
                        @click="showResubmitModal = false"
                        class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        @click="handleResubmitSubmit"
                        :disabled="isSubmittingResubmit"
                        class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                        <Send v-if="!isSubmittingResubmit" class="w-3.5 h-3.5" />
                        <div v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {{ isSubmittingResubmit ? 'Mengajukan...' : 'Ajukan Ulang Sekarang' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
