<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { 
    showRfq, 
    publishRfq, 
    startEvaluationRfq, 
    cancelRfq, 
    recordSupplierQuotation 
} from '../../services/rfqServices.js'
import { searchTaxes } from '../../services/taxServices.js'
import { uploadFile } from '../../services/fileServices.js'
import { showLoading, showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    Scale,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Calendar,
    Building2,
    User,
    Play,
    Ban,
    ExternalLink,
    Users,
    Package,
    Plus,
    RefreshCw,
    Copy,
    Check,
    UploadCloud,
    CheckCheck,
    DollarSign,
    MapPin,
    CreditCard,
    AlertTriangle,
    Eye,
    TrendingDown,
    X
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

const rfqId = computed(() => route.params.id)

const loading = ref(false)
const rfq = ref(null)
const activeTab = ref('items') // 'items' | 'suppliers'

// Magic link copy feedback
const copiedToken = ref(null)

// Manual quotation modal state
const isModalOpen = ref(false)
const modalSubmitting = ref(false)
const taxes = ref([])
const taxesLoading = ref(false)
const uploadingFile = ref(false)

const manualForm = ref({
    supplier_id: '',
    vendor_quotation_reference: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    payment_terms: '',
    lead_time_days: null,
    tax_id: '',
    shipping_cost: 0,
    quotation_file_id: null,
    quotation_file_name: '',
    notes: '',
    items: []
})

// Load RFQ Detail
const fetchRfqDetail = async () => {
    loading.value = true
    try {
        const response = await showRfq(rfqId.value)
        rfq.value = response.data || response
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal memuat detail tender RFQ')
    } finally {
        loading.value = false
    }
}

// Fetch taxes for manual quotation modal
const fetchTaxes = async () => {
    taxesLoading.value = true
    try {
        const response = await searchTaxes('', null, 50)
        taxes.value = response.data || response || []
    } catch {
        taxes.value = []
    } finally {
        taxesLoading.value = false
    }
}

onMounted(() => {
    fetchRfqDetail()
    fetchTaxes()
})

// Lifecycle Stepper calculation
const steps = [
    { key: 'draft', label: 'Draf', description: 'Tender disusun' },
    { key: 'published', label: 'Diterbitkan', description: 'Vendor diundang' },
    { key: 'evaluation', label: 'Evaluasi', description: 'Komparasi penawaran' },
    { key: 'completed', label: 'Selesai', description: 'Pemenang ditetapkan' }
]

const currentStepIndex = computed(() => {
    if (!rfq.value) return 0
    const status = rfq.value.status
    if (status === 'draft') return 0
    if (status === 'published') return 1
    if (status === 'evaluation') return 2
    if (status === 'completed') return 3
    if (status === 'cancelled') return -1
    return 0
})

// Calculations for items tab
const totalTargetHps = computed(() => {
    if (!rfq.value?.items) return 0
    return rfq.value.items.reduce((sum, item) => {
        const price = Number(item.target_price || 0)
        const qty = Number(item.target_quantity || 0)
        return sum + (price * qty)
    }, 0)
})

// Suppliers list with status summary
const invitedSuppliers = computed(() => {
    return rfq.value?.rfq_suppliers || []
})

const quotationsList = computed(() => {
    return rfq.value?.quotations || []
})

// Deadline countdown helper
const deadlineInfo = computed(() => {
    if (!rfq.value?.deadline_date) return null
    const deadline = new Date(rfq.value.deadline_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadline.setHours(0, 0, 0, 0)
    
    const diffTime = deadline - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
        return { label: `Lewat ${Math.abs(diffDays)} hari`, color: 'text-rose-600 bg-rose-50 border-rose-200' }
    } else if (diffDays === 0) {
        return { label: 'Berakhir Hari Ini', color: 'text-amber-600 bg-amber-50 border-amber-200' }
    } else {
        return { label: `Sisa ${diffDays} hari`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    }
})

// Copy Magic Link to clipboard with robust fallback for non-HTTPS local dev
const copyMagicLink = async (token) => {
    if (!token) return
    const magicUrl = `${window.location.origin}/portal/rfq/${token}`
    let success = false

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(magicUrl)
            success = true
        } catch {
            success = false
        }
    }

    if (!success) {
        try {
            const textArea = document.createElement('textarea')
            textArea.value = magicUrl
            textArea.style.position = 'fixed'
            textArea.style.left = '-999999px'
            textArea.style.top = '-999999px'
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            success = document.execCommand('copy')
            textArea.remove()
        } catch {
            success = false
        }
    }

    if (success) {
        copiedToken.value = token
        showSuccess('Tautan Tersalin!', 'Tautan portal vendor telah disalin ke clipboard.')
        setTimeout(() => {
            if (copiedToken.value === token) copiedToken.value = null
        }, 2500)
    } else {
        window.prompt('Salin tautan portal berikut secara manual (Ctrl+C):', magicUrl)
    }
}

// Action Handlers
const handlePublish = async () => {
    const confirmed = await showConfirm(
        'Publikasikan Tender RFQ?',
        'Vendor yang diundang akan menerima notifikasi dan token akses ke Portal Penawaran Vendor.'
    )
    if (!confirmed) return

    showLoading('Menerbitkan tender RFQ...')
    try {
        await publishRfq(rfqId.value)
        await showSuccess('Tender RFQ berhasil diterbitkan dan portal vendor telah diaktifkan!')
        fetchRfqDetail()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal menerbitkan tender RFQ')
    }
}

const handleStartEvaluation = async () => {
    const confirmed = await showConfirm(
        'Mulai Evaluasi Penawaran?',
        'Status tender akan dialihkan ke tahap evaluasi dan Anda dapat melakukan komparasi penawaran.'
    )
    if (!confirmed) return

    showLoading('Memperbarui status tender...')
    try {
        await startEvaluationRfq(rfqId.value)
        await showSuccess('Status berhasil diubah ke tahap Evaluasi Penawaran!')
        fetchRfqDetail()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal memulai evaluasi penawaran')
    }
}

const handleCancel = async () => {
    const reason = await showPrompt(
        'Batalkan Tender RFQ',
        'Masukkan alasan pembatalan tender ini:',
        'Alasan pembatalan'
    )
    if (!reason) return

    showLoading('Membatalkan tender...')
    try {
        await cancelRfq(rfqId.value, reason)
        await showSuccess('Tender RFQ berhasil dibatalkan')
        fetchRfqDetail()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal membatalkan tender RFQ')
    }
}

// Modal Manual Quotation Management
const openManualModal = (preselectedSupplierId = null) => {
    if (!rfq.value?.items || rfq.value.items.length === 0) {
        showError('Item tender tidak ditemukan')
        return
    }

    const defaultItems = rfq.value.items.map(item => ({
        rfq_item_id: item.id,
        item_name: (item.item_name && item.item_name !== 'Item Tanpa Nama') ? item.item_name : (item.item?.name || 'Item Tanpa Nama'),
        target_quantity: Number(item.target_quantity || 0),
        unit_name: item.unit?.name || 'Unit',
        offered_quantity: Number(item.target_quantity || 0),
        unit_price: Number(item.target_price || 0),
        lead_time_days: null,
        brand: '',
        notes: ''
    }))

    manualForm.value = {
        supplier_id: preselectedSupplierId || '',
        vendor_quotation_reference: '',
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: rfq.value.deadline_date || '',
        payment_terms: rfq.value.payment_terms_requested || 'Net 30 Days',
        lead_time_days: null,
        tax_id: '',
        shipping_cost: 0,
        quotation_file_id: null,
        quotation_file_name: '',
        notes: '',
        items: defaultItems
    }
    isModalOpen.value = true
}

const closeModal = () => {
    isModalOpen.value = false
}

// Handle PDF upload
const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
        showError('Hanya berkas PDF yang diperbolehkan untuk dokumen penawaran!')
        return
    }

    uploadingFile.value = true
    try {
        const response = await uploadFile(file, 'supplier_quotations')
        const uploaded = response.data || response
        manualForm.value.quotation_file_id = uploaded.id
        manualForm.value.quotation_file_name = file.name
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal mengunggah berkas PDF')
    } finally {
        uploadingFile.value = false
    }
}

// Calculations inside modal
const modalItemsSubtotal = computed(() => {
    return manualForm.value.items.reduce((sum, item) => {
        const qty = Number(item.offered_quantity) || 0
        const price = Number(item.unit_price) || 0
        return sum + (qty * price)
    }, 0)
})

const selectedTaxRate = computed(() => {
    if (!manualForm.value.tax_id) return 0
    const tax = taxes.value.find(t => t.id === Number(manualForm.value.tax_id))
    return tax ? Number(tax.rate || 0) : 0
})

const modalTaxAmount = computed(() => {
    return (modalItemsSubtotal.value * selectedTaxRate.value) / 100
})

const modalGrandTotal = computed(() => {
    const shipping = Number(manualForm.value.shipping_cost) || 0
    return modalItemsSubtotal.value + modalTaxAmount.value + shipping
})

// Submit manual quotation
const submitManualQuotation = async () => {
    if (!manualForm.value.supplier_id) {
        showError('Silakan pilih vendor/supplier!')
        return
    }

    if (!manualForm.value.vendor_quotation_reference) {
        showError('Nomor referensi surat penawaran vendor wajib diisi!')
        return
    }

    for (const item of manualForm.value.items) {
        if (!item.offered_quantity || Number(item.offered_quantity) <= 0) {
            showError(`Kuantitas penawaran untuk item '${item.item_name}' harus lebih dari 0!`)
            return
        }
        if (item.unit_price === null || item.unit_price === undefined || Number(item.unit_price) < 0) {
            showError(`Harga satuan untuk item '${item.item_name}' tidak valid!`)
            return
        }
    }

    const payload = {
        rfq_id: Number(rfqId.value),
        supplier_id: Number(manualForm.value.supplier_id),
        vendor_quotation_reference: manualForm.value.vendor_quotation_reference,
        quotation_date: manualForm.value.quotation_date || null,
        valid_until: manualForm.value.valid_until || null,
        payment_terms: manualForm.value.payment_terms || null,
        lead_time_days: manualForm.value.lead_time_days ? Number(manualForm.value.lead_time_days) : null,
        tax_id: manualForm.value.tax_id ? Number(manualForm.value.tax_id) : null,
        shipping_cost: Number(manualForm.value.shipping_cost) || 0,
        quotation_file_id: manualForm.value.quotation_file_id,
        notes: manualForm.value.notes || null,
        items: manualForm.value.items.map(item => ({
            rfq_item_id: item.rfq_item_id,
            offered_quantity: Number(item.offered_quantity),
            unit_price: Number(item.unit_price),
            lead_time_days: item.lead_time_days ? Number(item.lead_time_days) : null,
            brand: item.brand || null,
            notes: item.notes || null
        }))
    }

    modalSubmitting.value = true
    try {
        await recordSupplierQuotation(payload)
        await showSuccess('Penawaran vendor berhasil dicatat ke sistem!')
        closeModal()
        fetchRfqDetail()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal menyimpan penawaran vendor')
    } finally {
        modalSubmitting.value = false
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header & Actions -->
        <PageHeader 
            :title="rfq ? `${rfq.rfq_number} — ${rfq.title}` : 'Detail Tender RFQ'" 
            subtitle="Pusat kendali tender, undangan vendor, dan pencatatan penawaran harga"
        >
            <template #breadcrumbs>
                <div class="flex items-center gap-2 text-xs text-slate-500">
                    <RouterLink :to="{ name: 'user.dashboard' }" class="hover:text-blue-600">
                        <Home class="w-3.5 h-3.5" />
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span>Purchasing</span>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink :to="{ name: 'user.purchasing.rfq' }" class="hover:text-blue-600">
                        Tender RFQ
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-slate-800 font-medium">{{ rfq?.rfq_number || 'Detail' }}</span>
                </div>
            </template>

            <template #actions>
                <div class="flex items-center gap-2.5">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="router.push({ name: 'user.purchasing.rfq' })"
                        class="text-slate-600"
                    >
                        <ArrowLeft class="w-4 h-4 mr-1.5" />
                        Kembali
                    </BaseButton>

                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="fetchRfqDetail"
                        :disabled="loading"
                    >
                        <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': loading }" />
                        Segarkan
                    </BaseButton>

                    <!-- Contextual Actions depending on RFQ Status -->
                    <template v-if="rfq">
                        <!-- Draft: Publish & Cancel -->
                        <template v-if="rfq.status === 'draft'">
                            <BaseButton
                                variant="destructive"
                                size="sm"
                                @click="handleCancel"
                            >
                                <Ban class="w-4 h-4 mr-1.5" />
                                Batalkan Tender
                            </BaseButton>
                            <BaseButton
                                variant="primary"
                                size="sm"
                                @click="handlePublish"
                                class="bg-blue-600 hover:bg-blue-700"
                            >
                                <Play class="w-4 h-4 mr-1.5" />
                                Publikasikan Tender
                            </BaseButton>
                        </template>

                        <!-- Published: Start Evaluation, View Comparison Matrix, Cancel -->
                        <template v-else-if="rfq.status === 'published'">
                            <BaseButton
                                variant="destructive"
                                size="sm"
                                @click="handleCancel"
                            >
                                <Ban class="w-4 h-4 mr-1.5" />
                                Batalkan Tender
                            </BaseButton>
                            <BaseButton
                                variant="outline"
                                size="sm"
                                @click="router.push({ name: 'user.purchasing.rfq.comparison', params: { id: rfq.id } })"
                                class="border-blue-600 text-blue-700 hover:bg-blue-50"
                            >
                                <Scale class="w-4 h-4 mr-1.5" />
                                Matriks Komparasi
                            </BaseButton>
                            <BaseButton
                                variant="primary"
                                size="sm"
                                @click="handleStartEvaluation"
                                class="bg-blue-600 hover:bg-blue-700"
                            >
                                <CheckCheck class="w-4 h-4 mr-1.5" />
                                Mulai Evaluasi Penawaran
                            </BaseButton>
                        </template>

                        <!-- Evaluation: Open Comparison Matrix & Cancel -->
                        <template v-else-if="rfq.status === 'evaluation'">
                            <BaseButton
                                variant="destructive"
                                size="sm"
                                @click="handleCancel"
                            >
                                <Ban class="w-4 h-4 mr-1.5" />
                                Batalkan Tender
                            </BaseButton>
                            <BaseButton
                                variant="primary"
                                size="sm"
                                @click="router.push({ name: 'user.purchasing.rfq.comparison', params: { id: rfq.id } })"
                                class="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <Scale class="w-4 h-4 mr-1.5" />
                                Buka Matriks Komparasi
                            </BaseButton>
                        </template>

                        <!-- Completed: Open Comparison Matrix -->
                        <template v-else-if="rfq.status === 'completed'">
                            <BaseButton
                                variant="primary"
                                size="sm"
                                @click="router.push({ name: 'user.purchasing.rfq.comparison', params: { id: rfq.id } })"
                                class="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Scale class="w-4 h-4 mr-1.5" />
                                Hasil Matriks Komparasi
                            </BaseButton>
                        </template>
                    </template>
                </div>
            </template>
        </PageHeader>

        <!-- Loading State -->
        <div v-if="loading && !rfq" class="p-12 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw class="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p class="text-sm text-slate-500 font-medium">Memuat rincian tender RFQ...</p>
        </div>

        <template v-else-if="rfq">
            <!-- Cancelled Notice Banner -->
            <div 
                v-if="rfq.status === 'cancelled'"
                class="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3"
            >
                <AlertTriangle class="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div>
                    <h3 class="text-sm font-semibold text-rose-800">Tender Ini Telah Dibatalkan</h3>
                    <p class="text-xs text-rose-700 mt-0.5">
                        Tender RFQ ini telah dibatalkan dan tidak lagi menerima penawaran atau proses awarding.
                    </p>
                </div>
            </div>

            <!-- Visual Status Stepper (Lifecycle Bar) -->
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Tahapan Tender:</span>
                        <StatusBadge :status="rfq.status" />
                    </div>
                    <div v-if="deadlineInfo && rfq.status !== 'completed' && rfq.status !== 'cancelled'" class="flex items-center gap-1.5">
                        <Clock class="w-3.5 h-3.5 text-slate-400" />
                        <span class="text-xs font-medium px-2 py-0.5 rounded-full border" :class="deadlineInfo.color">
                            {{ deadlineInfo.label }}
                        </span>
                    </div>
                </div>

                <div v-if="rfq.status !== 'cancelled'" class="mt-6 grid grid-cols-4 gap-3 relative">
                    <!-- Continuous Progress Bar Background -->
                    <div class="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0"></div>
                    <div 
                        class="absolute top-4 left-6 h-0.5 bg-blue-600 -z-0 transition-all duration-500"
                        :style="{ width: `${(Math.max(0, currentStepIndex) / 3) * 100}%` }"
                    ></div>

                    <!-- Steps -->
                    <div 
                        v-for="(step, idx) in steps" 
                        :key="step.key"
                        class="flex flex-col items-center text-center relative z-10"
                    >
                        <div 
                            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs"
                            :class="[
                                idx < currentStepIndex 
                                    ? 'bg-blue-600 text-white' 
                                    : idx === currentStepIndex 
                                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 ring-offset-1' 
                                        : 'bg-white text-slate-400 border-2 border-slate-300'
                            ]"
                        >
                            <Check v-if="idx < currentStepIndex" class="w-4 h-4 stroke-[3]" />
                            <span v-else>{{ idx + 1 }}</span>
                        </div>
                        <span 
                            class="text-xs font-semibold mt-2"
                            :class="idx <= currentStepIndex ? 'text-slate-800' : 'text-slate-400'"
                        >
                            {{ step.label }}
                        </span>
                        <span class="text-[11px] text-slate-500 mt-0.5 hidden sm:inline">{{ step.description }}</span>
                    </div>
                </div>
            </div>

            <!-- Bento Metadata Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <!-- Card 1: Identification & Plan -->
                <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identitas Tender</span>
                            <span class="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {{ rfq.rfq_number }}
                            </span>
                        </div>
                        <div class="mt-4 space-y-3">
                            <div>
                                <span class="text-xs text-slate-400 block">Judul Pengadaan</span>
                                <span class="text-sm font-semibold text-slate-800">{{ rfq.title }}</span>
                            </div>
                            <div v-if="rfq.procurement_plan">
                                <span class="text-xs text-slate-400 block">Rencana Pengadaan (PP)</span>
                                <div class="flex items-center gap-1.5 mt-0.5">
                                    <span class="text-xs font-mono font-medium text-slate-700">
                                        {{ rfq.procurement_plan.pp_number || rfq.procurement_plan.plan_number || `PP #${rfq.procurement_plan_id}` }}
                                    </span>
                                    <RouterLink 
                                        :to="{ name: 'user.purchasing.plans.detail', params: { id: rfq.procurement_plan_id } }"
                                        class="text-blue-600 hover:text-blue-800"
                                        title="Buka Dokumen Rencana Pengadaan"
                                    >
                                        <ExternalLink class="w-3.5 h-3.5" />
                                    </RouterLink>
                                </div>
                            </div>
                            <div>
                                <span class="text-xs text-slate-400 block">Dibuat Oleh</span>
                                <span class="text-xs font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                                    <User class="w-3.5 h-3.5 text-slate-400" />
                                    {{ rfq.created_by_user?.name || `User #${rfq.created_by}` }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Timeline & Terms -->
                <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jadwal & Komersial</span>
                            <Calendar class="w-4 h-4 text-slate-400" />
                        </div>
                        <div class="mt-4 space-y-3">
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <span class="text-xs text-slate-400 block">Tanggal Terbit</span>
                                    <span class="text-xs font-medium text-slate-700 mt-0.5 block">
                                        {{ formatDate(rfq.issue_date) }}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-xs text-slate-400 block">Batas Penawaran</span>
                                    <span class="text-xs font-semibold text-slate-800 mt-0.5 block">
                                        {{ formatDate(rfq.deadline_date) }}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <span class="text-xs text-slate-400 block">Syarat Pembayaran Diminta</span>
                                <span class="text-xs font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                                    <CreditCard class="w-3.5 h-3.5 text-slate-400" />
                                    {{ rfq.payment_terms_requested || 'Sesuai Standar Perusahaan' }}
                                </span>
                            </div>
                            <div>
                                <span class="text-xs text-slate-400 block">Alamat Pengiriman Target</span>
                                <span class="text-xs text-slate-600 mt-0.5 flex items-start gap-1.5">
                                    <MapPin class="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                    <span class="line-clamp-2">{{ rfq.delivery_address || 'Gudang Pusat PT Padma Soode Indonesia' }}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Metrics & Stats -->
                <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statistik Pengadaan</span>
                            <Package class="w-4 h-4 text-slate-400" />
                        </div>
                        <div class="mt-4 grid grid-cols-3 gap-2 text-center">
                            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span class="text-xl font-bold text-slate-800">{{ rfq.items?.length || 0 }}</span>
                                <span class="text-[11px] text-slate-500 block mt-1">Item Barang</span>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span class="text-xl font-bold text-blue-600">{{ invitedSuppliers.length }}</span>
                                <span class="text-[11px] text-slate-500 block mt-1">Vendor Diundang</span>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span class="text-xl font-bold text-emerald-600">{{ quotationsList.length }}</span>
                                <span class="text-[11px] text-slate-500 block mt-1">Penawaran Masuk</span>
                            </div>
                        </div>
                        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span class="text-xs text-slate-500 font-medium">Estimasi HPS Total:</span>
                            <span class="text-sm font-bold text-slate-900 font-mono">
                                {{ formatCurrency(totalTargetHps) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabs Section -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <!-- Tab Header Nav -->
                <div class="flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50/50">
                    <div class="flex items-center gap-6">
                        <button
                            type="button"
                            @click="activeTab = 'items'"
                            class="py-4 text-xs font-semibold transition-all border-b-2 flex items-center gap-2"
                            :class="[
                                activeTab === 'items' 
                                    ? 'border-blue-600 text-blue-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            ]"
                        >
                            <Package class="w-4 h-4" />
                            Item yang Ditenderkan
                            <span class="px-2 py-0.5 rounded-full text-[11px]" :class="activeTab === 'items' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'">
                                {{ rfq.items?.length || 0 }}
                            </span>
                        </button>

                        <button
                            type="button"
                            @click="activeTab = 'suppliers'"
                            class="py-4 text-xs font-semibold transition-all border-b-2 flex items-center gap-2"
                            :class="[
                                activeTab === 'suppliers' 
                                    ? 'border-blue-600 text-blue-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            ]"
                        >
                            <Users class="w-4 h-4" />
                            Vendor Undangan & Penawaran Masuk
                            <span class="px-2 py-0.5 rounded-full text-[11px]" :class="activeTab === 'suppliers' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'">
                                {{ invitedSuppliers.length }}
                            </span>
                        </button>
                    </div>

                    <!-- Right side tab action button -->
                    <div v-if="activeTab === 'suppliers'">
                        <BaseButton
                            variant="primary"
                            size="sm"
                            @click="openManualModal()"
                            class="bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus class="w-4 h-4 mr-1.5" />
                            Input Penawaran Manual
                        </BaseButton>
                    </div>
                </div>

                <!-- Tab 1: Line Items -->
                <div v-if="activeTab === 'items'" class="p-6">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 bg-slate-50/70">
                                    <th class="w-12 text-center text-xs font-semibold text-slate-600 py-3 px-4">No</th>
                                    <th class="text-left text-xs font-semibold text-slate-600 py-3 px-4">Barang & Spesifikasi</th>
                                    <th class="text-center text-xs font-semibold text-slate-600 py-3 px-4">Satuan</th>
                                    <th class="text-right text-xs font-semibold text-slate-600 py-3 px-4">Target Qty</th>
                                    <th class="text-right text-xs font-semibold text-slate-600 py-3 px-4">HPS / Target Harga</th>
                                    <th class="text-right text-xs font-semibold text-slate-600 py-3 px-4">Subtotal Target</th>
                                    <th class="text-center text-xs font-semibold text-slate-600 py-3 px-4">Tgl Dibutuhkan</th>
                                    <th class="text-left text-xs font-semibold text-slate-600 py-3 px-4">Catatan</th>
                                </tr>
                            </thead>

                            <tbody class="divide-y divide-slate-100">
                                <tr v-if="!rfq.items || rfq.items.length === 0">
                                    <td colspan="8" class="text-center py-8 text-sm text-slate-400">
                                        Tidak ada rincian item dalam tender ini.
                                    </td>
                                </tr>
                                <tr 
                                    v-for="(item, idx) in rfq.items" 
                                    :key="item.id"
                                    class="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                                >
                                    <td class="text-center text-xs text-slate-500 py-3 px-4 font-medium">{{ idx + 1 }}</td>
                                    <td class="py-3 px-4">
                                        <div class="font-semibold text-xs text-slate-900">
                                            {{ (item.item_name && item.item_name !== 'Item Tanpa Nama') ? item.item_name : (item.item?.name || 'Item Tanpa Nama') }}
                                        </div>
                                        <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                                            {{ item.item?.code || item.item?.item_code || '-' }}
                                        </div>
                                        <div v-if="item.item_specifications || item.item?.description" class="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                                            {{ item.item_specifications || item.item?.description }}
                                        </div>
                                    </td>
                                    <td class="text-center text-xs text-slate-600 py-3 px-4">
                                        {{ item.unit?.name || 'Unit' }}
                                    </td>
                                    <td class="text-right text-xs font-semibold text-slate-800 py-3 px-4 font-mono">
                                        {{ Number(item.target_quantity).toLocaleString('id-ID') }}
                                    </td>
                                    <td class="text-right text-xs text-slate-700 py-3 px-4 font-mono">
                                        {{ item.target_price ? formatCurrency(item.target_price) : '-' }}
                                    </td>
                                    <td class="text-right text-xs font-semibold text-slate-900 py-3 px-4 font-mono">
                                        {{ item.target_price ? formatCurrency(Number(item.target_price) * Number(item.target_quantity)) : '-' }}
                                    </td>
                                    <td class="text-center text-xs text-slate-600 py-3 px-4">
                                        {{ formatDate(item.required_delivery_date) }}
                                    </td>
                                    <td class="text-xs text-slate-500 py-3 px-4">
                                        {{ item.notes || '-' }}
                                    </td>
                                </tr>
                            </tbody>

                            <tfoot>
                                <tr class="bg-slate-50 font-bold border-t-2 border-slate-200">
                                    <td colspan="3" class="text-left text-xs text-slate-800 py-3 px-4">
                                        Total {{ rfq.items?.length || 0 }} Rincian Barang
                                    </td>
                                    <td class="text-right text-xs text-slate-800 py-3 px-4 font-mono">
                                        {{ rfq.items?.reduce((sum, it) => sum + Number(it.target_quantity || 0), 0).toLocaleString('id-ID') }}
                                    </td>
                                    <td class="text-right text-xs text-slate-600 py-3 px-4">
                                        Total HPS:
                                    </td>
                                    <td class="text-right text-xs text-blue-700 py-3 px-4 font-mono">
                                        {{ formatCurrency(totalTargetHps) }}
                                    </td>
                                    <td colspan="2" class="py-3 px-4"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <!-- Tab 2: Invited Vendors & Quotes -->
                <div v-if="activeTab === 'suppliers'" class="p-6">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 bg-slate-50/50">
                                    <th class="py-3 px-4 text-xs font-semibold text-slate-600">Vendor / Pemasok</th>
                                    <th class="py-3 px-4 text-xs font-semibold text-slate-600">Kontak Person</th>
                                    <th class="py-3 px-4 text-xs font-semibold text-slate-600 text-center">Status Respon</th>
                                    <th class="py-3 px-4 text-xs font-semibold text-slate-600">Portal Magic Link</th>
                                    <th class="py-3 px-4 text-xs font-semibold text-slate-600">Waktu Aktivitas</th>
                                    <th class="py-3 px-4 text-xs font-semibold text-slate-600 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-if="invitedSuppliers.length === 0">
                                    <td colspan="6" class="py-8 text-center text-sm text-slate-400">
                                        Belum ada vendor yang diundang dalam tender ini.
                                    </td>
                                </tr>
                                <tr 
                                    v-for="sup in invitedSuppliers" 
                                    :key="sup.id"
                                    class="hover:bg-slate-50/80 transition-colors"
                                >
                                    <td class="py-3 px-4">
                                        <div class="font-semibold text-xs text-slate-900">
                                            {{ sup.supplier?.name || `Supplier #${sup.supplier_id}` }}
                                        </div>
                                        <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                                            {{ sup.supplier?.supplier_code || '-' }}
                                        </div>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="text-xs text-slate-800 font-medium">{{ sup.contact_person || sup.supplier?.contact_name || '-' }}</div>
                                        <div class="text-[11px] text-slate-500 mt-0.5">
                                            {{ sup.email || sup.phone || '-' }}
                                        </div>
                                    </td>
                                    <td class="py-3 px-4 text-center">
                                        <span 
                                            v-if="sup.quote_status === 'submitted' || sup.quote_status === 'received'"
                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        >
                                            <CheckCircle2 class="w-3 h-3" />
                                            Penawaran Masuk
                                        </span>
                                        <span 
                                            v-else-if="sup.quote_status === 'viewed'"
                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                        >
                                            <Eye class="w-3 h-3" />
                                            Telah Dilihat
                                        </span>
                                        <span 
                                            v-else-if="sup.quote_status === 'declined'"
                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                                        >
                                            <XCircle class="w-3 h-3" />
                                            Menolak Tender
                                        </span>
                                        <span 
                                            v-else
                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                                        >
                                            <Clock class="w-3 h-3" />
                                            Menunggu Respon
                                        </span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div v-if="sup.portal_access_token" class="flex items-center gap-1.5 flex-wrap">
                                            <span class="text-[11px] font-mono text-slate-500 truncate max-w-[120px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                ...{{ sup.portal_access_token.slice(-8) }}
                                            </span>
                                            <button
                                                type="button"
                                                @click="copyMagicLink(sup.portal_access_token)"
                                                class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors cursor-pointer"
                                                title="Salin tautan portal vendor ke clipboard"
                                            >
                                                <Check v-if="copiedToken === sup.portal_access_token" class="w-3.5 h-3.5 text-emerald-600" />
                                                <Copy v-else class="w-3.5 h-3.5" />
                                                <span>{{ copiedToken === sup.portal_access_token ? 'Tersalin!' : 'Salin Link' }}</span>
                                            </button>
                                            <a
                                                :href="`/portal/rfq/${sup.portal_access_token}`"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="text-xs text-slate-700 hover:text-blue-700 flex items-center gap-1 font-medium bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-200 transition-colors"
                                                title="Buka portal langsung di tab baru"
                                            >
                                                <ExternalLink class="w-3.5 h-3.5 text-slate-500" />
                                                <span>Buka Tab</span>
                                            </a>
                                        </div>
                                        <span v-else class="text-xs text-slate-400 italic">Belum dibuat</span>
                                    </td>
                                    <td class="py-3 px-4">
                                        <div class="text-[11px] text-slate-600">
                                            <span class="text-slate-400">Undang:</span> {{ formatDate(sup.invitation_sent_at) || '-' }}
                                        </div>
                                        <div v-if="sup.submitted_at" class="text-[11px] text-emerald-700 font-medium mt-0.5">
                                            <span class="text-slate-400">Masuk:</span> {{ formatDate(sup.submitted_at) }}
                                        </div>
                                    </td>
                                    <td class="py-3 px-4 text-right">
                                        <div class="flex items-center justify-end gap-2">
                                            <BaseButton
                                                variant="outline"
                                                size="sm"
                                                @click="openManualModal(sup.supplier_id)"
                                                class="text-xs"
                                                title="Input penawaran vendor manual"
                                            >
                                                <Plus class="w-3.5 h-3.5 mr-1" />
                                                Input Quote
                                            </BaseButton>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </template>

        <!-- Modal Input Penawaran Manual (Solid overlay, STRICTLY NO backdrop-blur) -->
        <div 
            v-if="isModalOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
            @click.self="closeModal"
        >
            <div class="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                            <FileText class="w-5 h-5 text-blue-600" />
                            Input Penawaran Harga Vendor (Manual)
                        </h3>
                        <p class="text-xs text-slate-500 mt-0.5">
                            Catat penawaran harga vendor yang diterima via email/dokumen fisik ke dalam sistem RFQ.
                        </p>
                    </div>
                    <button
                        type="button"
                        @click="closeModal"
                        class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Modal Body Form -->
                <div class="p-6 overflow-y-auto space-y-6 flex-1">
                    <!-- Section 1: Informasi Vendor & Penawaran -->
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                            1. Header Penawaran Vendor
                        </span>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Supplier Select -->
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Pilih Vendor / Rekanan <span class="text-rose-500">*</span>
                                </label>
                                <select 
                                    v-model="manualForm.supplier_id"
                                    class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 bg-white"
                                    required
                                >
                                    <option value="" disabled>-- Pilih Vendor Terdaftar --</option>
                                    <option 
                                        v-for="sup in invitedSuppliers" 
                                        :key="sup.supplier_id" 
                                        :value="sup.supplier_id"
                                    >
                                        {{ sup.supplier?.name || `Vendor #${sup.supplier_id}` }} ({{ sup.supplier?.supplier_code || '-' }})
                                    </option>
                                </select>
                            </div>

                            <!-- Quotation Reference -->
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    No. Surat Penawaran Vendor <span class="text-rose-500">*</span>
                                </label>
                                <input 
                                    type="text"
                                    v-model="manualForm.vendor_quotation_reference"
                                    placeholder="Contoh: QUO-PSI-2026-089"
                                    class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <!-- Dates -->
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Tanggal Surat Penawaran
                                </label>
                                <input 
                                    type="date"
                                    v-model="manualForm.quotation_date"
                                    class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Masa Berlaku Penawaran
                                </label>
                                <input 
                                    type="date"
                                    v-model="manualForm.valid_until"
                                    class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <!-- Terms & Overall Lead Time -->
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Syarat Pembayaran (TOP)
                                </label>
                                <input 
                                    type="text"
                                    v-model="manualForm.payment_terms"
                                    placeholder="Contoh: Net 30 Days / COD"
                                    class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Lead Time Pengiriman (Hari)
                                </label>
                                <input 
                                    type="number"
                                    v-model.number="manualForm.lead_time_days"
                                    min="0"
                                    placeholder="Contoh: 14"
                                    class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <!-- Tax & Shipping Cost -->
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Pajak / PPN
                                </label>
                                <select 
                                    v-model="manualForm.tax_id"
                                    class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 bg-white"
                                >
                                    <option value="">Tanpa Pajak (0%)</option>
                                    <option v-for="tax in taxes" :key="tax.id" :value="tax.id">
                                        {{ tax.name }} ({{ tax.rate }}%)
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Biaya Pengiriman (Ongkir IDR)
                                </label>
                                <input 
                                    type="number"
                                    v-model.number="manualForm.shipping_cost"
                                    min="0"
                                    placeholder="0"
                                    class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <!-- File Upload Attachment -->
                            <div class="md:col-span-2">
                                <label class="block text-xs font-semibold text-slate-700 mb-1">
                                    Unggah Berkas PDF Penawaran Vendor
                                </label>
                                <div class="flex items-center gap-3">
                                    <label class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs">
                                        <UploadCloud class="w-4 h-4 text-blue-600" />
                                        <span>{{ uploadingFile ? 'Mengunggah...' : 'Pilih Berkas PDF' }}</span>
                                        <input 
                                            type="file" 
                                            accept="application/pdf"
                                            @change="handleFileUpload" 
                                            class="hidden" 
                                            :disabled="uploadingFile"
                                        />
                                    </label>
                                    <span v-if="manualForm.quotation_file_name" class="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                        <CheckCircle2 class="w-3.5 h-3.5" />
                                        {{ manualForm.quotation_file_name }}
                                    </span>
                                    <span v-else class="text-xs text-slate-400">Format: .pdf (Maks 10MB)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Items Table -->
                    <div class="space-y-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                            2. Rincian Harga Item yang Ditawarkan
                        </span>

                        <div class="border border-slate-200 rounded-xl overflow-hidden">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th class="py-2.5 px-3 text-xs font-semibold">Nama Item</th>
                                        <th class="py-2.5 px-3 text-xs font-semibold text-right w-28">Qty Ditawar</th>
                                        <th class="py-2.5 px-3 text-xs font-semibold text-right w-36">Harga Satuan (IDR)</th>
                                        <th class="py-2.5 px-3 text-xs font-semibold text-center w-24">Lead Time</th>
                                        <th class="py-2.5 px-3 text-xs font-semibold w-28">Merk / Brand</th>
                                        <th class="py-2.5 px-3 text-xs font-semibold text-right w-36">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-xs">
                                    <tr v-for="item in manualForm.items" :key="item.rfq_item_id" class="hover:bg-slate-50">
                                        <td class="py-2.5 px-3">
                                            <div class="font-semibold text-slate-900">{{ item.item_name }}</div>
                                            <div class="text-[11px] text-slate-400">
                                                Target: {{ item.target_quantity }} {{ item.unit_name }}
                                            </div>
                                        </td>
                                        <td class="py-2.5 px-3">
                                            <input 
                                                type="number"
                                                v-model.number="item.offered_quantity"
                                                min="0.0001"
                                                step="any"
                                                class="w-full text-right text-xs rounded border-slate-300 py-1 px-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            />
                                        </td>
                                        <td class="py-2.5 px-3">
                                            <input 
                                                type="number"
                                                v-model.number="item.unit_price"
                                                min="0"
                                                step="any"
                                                class="w-full text-right text-xs rounded border-slate-300 py-1 px-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            />
                                        </td>
                                        <td class="py-2.5 px-3">
                                            <input 
                                                type="number"
                                                v-model.number="item.lead_time_days"
                                                min="0"
                                                placeholder="Hari"
                                                class="w-full text-center text-xs rounded border-slate-300 py-1 px-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td class="py-2.5 px-3">
                                            <input 
                                                type="text"
                                                v-model="item.brand"
                                                placeholder="Merk"
                                                class="w-full text-xs rounded border-slate-300 py-1 px-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </td>
                                        <td class="py-2.5 px-3 text-right font-semibold font-mono text-slate-900">
                                            {{ formatCurrency((Number(item.offered_quantity) || 0) * (Number(item.unit_price) || 0)) }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Section 3: Commercial Summary -->
                    <div class="bg-blue-50/60 p-4 rounded-xl border border-blue-200 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div class="text-xs text-blue-800">
                            <span class="font-bold block">Kalkulasi Nilai Penawaran:</span>
                            Pastikan rincian harga dan nominal sudah sesuai dengan fisik surat penawaran vendor.
                        </div>
                        <div class="w-full md:w-64 space-y-1.5 text-xs text-slate-700">
                            <div class="flex justify-between">
                                <span>Subtotal Barang:</span>
                                <span class="font-mono font-medium">{{ formatCurrency(modalItemsSubtotal) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>PPN ({{ selectedTaxRate }}%):</span>
                                <span class="font-mono font-medium">{{ formatCurrency(modalTaxAmount) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Biaya Pengiriman:</span>
                                <span class="font-mono font-medium">{{ formatCurrency(manualForm.shipping_cost || 0) }}</span>
                            </div>
                            <div class="flex justify-between pt-1.5 border-t border-blue-200 text-slate-900 font-bold text-sm">
                                <span>Grand Total:</span>
                                <span class="font-mono text-blue-700">{{ formatCurrency(modalGrandTotal) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/70">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="closeModal"
                        :disabled="modalSubmitting"
                    >
                        Batal
                    </BaseButton>
                    <BaseButton
                        variant="primary"
                        size="sm"
                        @click="submitManualQuotation"
                        :disabled="modalSubmitting || uploadingFile"
                        class="bg-blue-600 hover:bg-blue-700"
                    >
                        <RefreshCw v-if="modalSubmitting" class="w-4 h-4 mr-1.5 animate-spin" />
                        <Check v-else class="w-4 h-4 mr-1.5" />
                        Simpan Penawaran Vendor
                    </BaseButton>
                </div>
            </div>
        </div>
    </div>
</template>
