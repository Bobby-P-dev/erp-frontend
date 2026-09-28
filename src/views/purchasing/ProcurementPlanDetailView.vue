<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { 
    showProcurementPlan, 
    activateProcurementPlan, 
    cancelProcurementPlan 
} from '../../services/procurementPlanServices.js'
import { getApprovalTrackerByDocument } from '../../services/approvalServices.js'
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
    Layers,
    ShoppingCart,
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
    Store,
    Users,
    Package,
    ArrowRight,
    Info,
    CheckCheck,
    GitBranch,
    History,
    ChevronDown,
    ChevronUp,
    DollarSign
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// State
const plan = ref(null)
const isLoading = ref(true)
const trackerData = ref(null)
const isLoadingTracker = ref(false)
const showPrAuditTrail = ref(false)

// Fetch Plan Detail
const fetchPlan = async () => {
    try {
        isLoading.value = true
        const planId = route.params.id
        const response = await showProcurementPlan(planId)
        plan.value = response.data || null

        // Fetch approval tracker if PR exists
        const prId = plan.value?.purchase_requisition_id || plan.value?.purchase_requisition?.id
        if (prId) {
            fetchWorkflowTracker(prId)
        }
    } catch (error) {
        showError('Gagal Memuat Detail Rencana!', 'Rencana pengadaan tidak ditemukan atau terjadi kesalahan server.', error)
        router.push({ name: 'user.purchasing.plans' })
    } finally {
        isLoading.value = false
    }
}

// Fetch Workflow Tracker for PR
const fetchWorkflowTracker = async (prId) => {
    if (!prId) return
    try {
        isLoadingTracker.value = true
        const trackerRes = await getApprovalTrackerByDocument('purchase_requisition', prId)
        trackerData.value = trackerRes.data || trackerRes || null
    } catch (e) {
        console.warn('Could not fetch approval tracker for PR:', e)
    } finally {
        isLoadingTracker.value = false
    }
}

// Workflow Computations
const workflowLevels = computed(() => {
    return trackerData.value?.levels || plan.value?.purchase_requisition?.approval_request?.levels || []
})

const workflowCurrentStep = computed(() => {
    return trackerData.value?.request?.current_step_order || plan.value?.purchase_requisition?.approval_request?.current_step_order || 1
})

const workflowStatus = computed(() => {
    return trackerData.value?.request?.status || plan.value?.purchase_requisition?.approval_request?.status || plan.value?.purchase_requisition?.status || 'approved'
})

const workflowActions = computed(() => {
    return trackerData.value?.actions || plan.value?.purchase_requisition?.approval_request?.actions || []
})

// Financial & Quantity Computations
const totalPlannedAmount = computed(() => {
    if (!plan.value?.items) return 0
    return plan.value.items.reduce((sum, item) => {
        const lineSubtotal = item.planned_estimated_subtotal 
            ?? (Number(item.planned_quantity || 0) * Number(item.purchase_requisition_item?.estimated_price || 0))
        return sum + Number(lineSubtotal || 0)
    }, 0)
})

const totalPlannedQty = computed(() => {
    if (!plan.value?.items) return 0
    return plan.value.items.reduce((sum, item) => sum + Number(item.planned_quantity || 0), 0)
})

// Table Columns for items
const tableColumns = [
    { key: 'no', label: 'No', class: 'w-12 text-center' },
    { key: 'item', label: 'Item & Referensi', class: 'min-w-[240px]' },
    { key: 'unit', label: 'Satuan', class: 'w-20 text-center' },
    { key: 'price', label: 'Harga Satuan (PR)', class: 'w-36 text-right' },
    { key: 'qty', label: 'Kuantitas Terencana', class: 'w-36 text-right' },
    { key: 'subtotal', label: 'Subtotal Terencana', class: 'w-36 text-right' },
    { key: 'notes', label: 'Catatan Item', class: 'min-w-[180px]' }
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

const handleActivate = async () => {
    if (!plan.value) return
    const confirmed = await showConfirm(
        'Aktifkan Rencana Pengadaan?',
        `Rencana ${plan.value.pp_number} akan diaktifkan dan alokasi item akan dikunci. Status PR terkait akan berubah menjadi In Procurement.`,
        'Ya, Aktifkan',
        'Batal',
        '#2563eb'
    )
    if (!confirmed) return

    try {
        showLoading('Mengaktifkan rencana...')
        await activateProcurementPlan(plan.value.id)
        showSuccess('Berhasil!', `Rencana pengadaan ${plan.value.pp_number} berhasil diaktifkan.`)
        fetchPlan()
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal mengaktifkan rencana pengadaan.'
        showError('Gagal!', errorMsg, error)
    }
}

const handleCancel = async () => {
    if (!plan.value) return
    const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Batalkan Rencana Pengadaan?',
        text: `Masukkan alasan pembatalan untuk rencana ${plan.value.pp_number}:`,
        input: 'textarea',
        inputPlaceholder: 'Tuliskan alasan pembatalan rencana ini...',
        showCancelButton: true,
        confirmButtonText: 'Ya, Batalkan Rencana',
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
        showLoading('Membatalkan rencana...')
        await cancelProcurementPlan(plan.value.id, reason)
        showSuccess('Berhasil!', `Rencana pengadaan ${plan.value.pp_number} telah dibatalkan.`)
        fetchPlan()
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal membatalkan rencana pengadaan.'
        showError('Gagal!', errorMsg, error)
    }
}

onMounted(() => {
    fetchPlan()
})
</script>

<template>
    <div class="space-y-6 max-w-7xl mx-auto pb-16">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <RouterLink to="/" class="hover:text-blue-600 transition-colors flex items-center gap-1">
                <Home class="w-4 h-4" />
                <span>Beranda</span>
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-slate-400" />
            <RouterLink to="/purchasing" class="hover:text-blue-600 transition-colors">
                Purchasing
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-slate-400" />
            <RouterLink :to="{ name: 'user.purchasing.plans' }" class="hover:text-blue-600 transition-colors">
                Rencana Pengadaan
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-slate-400" />
            <span class="text-slate-900 font-semibold font-mono">{{ plan?.pp_number || 'Detail Rencana' }}</span>
        </nav>

        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
            <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm font-medium text-slate-600">Memuat rincian rencana pengadaan...</p>
        </div>

        <template v-else-if="plan">
            <!-- Header Section -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-3 flex-wrap">
                        <RouterLink :to="{ name: 'user.purchasing.plans' }" class="text-slate-400 hover:text-slate-600">
                            <ArrowLeft class="w-5 h-5" />
                        </RouterLink>
                        <h2 class="text-2xl font-bold text-slate-900 font-mono">{{ plan.pp_number }}</h2>

                        <!-- Status Badge -->
                        <span 
                            v-if="plan.status === 'draft'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200"
                        >
                            <Clock class="w-3.5 h-3.5 text-amber-600" /> Draft
                        </span>
                        <span 
                            v-else-if="plan.status === 'active'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
                        >
                            <CheckCircle2 class="w-3.5 h-3.5 text-blue-600" /> Aktif Berjalan
                        </span>
                        <span 
                            v-else-if="plan.status === 'completed'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                            <CheckCheck class="w-3.5 h-3.5 text-emerald-600" /> Selesai
                        </span>
                        <span 
                            v-else-if="plan.status === 'cancelled'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
                        >
                            <XCircle class="w-3.5 h-3.5 text-rose-600" /> Dibatalkan
                        </span>

                        <!-- Method Badge -->
                        <span 
                            v-if="plan.procurement_method === 'direct_purchase'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                            <ShoppingCart class="w-3.5 h-3.5" /> Direct Purchase
                        </span>
                        <span 
                            v-else-if="plan.procurement_method === 'rfq'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
                        >
                            <Scale class="w-3.5 h-3.5" /> Tender RFQ
                        </span>
                    </div>

                    <p class="text-xs text-slate-500">
                        Dibuat pada {{ formatDate(plan.created_at) }} oleh 
                        <strong class="text-slate-700 font-semibold">{{ plan.created_by_user?.name || 'Staff Purchasing' }}</strong>
                    </p>
                </div>

                <!-- Header Actions -->
                <div class="flex items-center gap-3">
                    <button 
                        v-if="plan.status === 'draft'"
                        @click="handleActivate"
                        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                        <Play class="w-4 h-4" />
                        <span>Aktifkan Rencana</span>
                    </button>

                    <button 
                        v-if="['draft', 'active'].includes(plan.status)"
                        @click="handleCancel"
                        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                    >
                        <Ban class="w-4 h-4" />
                        <span>Batalkan</span>
                    </button>
                </div>
            </div>

            <!-- Sourcing Method Context Banner -->
            <div 
                v-if="plan.procurement_method === 'direct_purchase'"
                class="bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white border border-emerald-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
                <div class="flex items-start gap-4">
                    <div class="p-3 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                        <ShoppingCart class="w-6 h-6" />
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-900 text-sm">Metode Pengadaan: Direct Purchase (Pembelian Langsung)</h4>
                        <p class="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                            Rencana ini dialokasikan untuk pembelian langsung tanpa lelang tender formal (Marketplace Tokopedia/Shopee, retail resmi, atau vendor tunggal).
                            <span v-if="plan.status === 'active'" class="block mt-1 font-semibold text-emerald-800">
                                Status rencana aktif! Transaksi pembelian dapat langsung dieksekusi di modul Direct Purchase.
                            </span>
                        </p>
                    </div>
                </div>

                <RouterLink 
                    v-if="plan.status === 'active'"
                    :to="{ name: 'user.purchasing.direct.create', query: { plan_id: plan.id } }" 
                    class="shrink-0"
                >
                    <BaseButton variant="primary">
                        <span>Buat Direct Purchase</span>
                        <ArrowRight class="w-4 h-4 ml-1" />
                    </BaseButton>
                </RouterLink>
            </div>

            <div 
                v-else-if="plan.procurement_method === 'rfq'"
                class="bg-gradient-to-r from-blue-50 via-blue-50/40 to-white border border-blue-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
                <div class="flex items-start gap-4">
                    <div class="p-3 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                        <Scale class="w-6 h-6" />
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-900 text-sm">Metode Pengadaan: Tender RFQ (Request for Quotation)</h4>
                        <p class="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                            Rencana ini disiapkan untuk pengadaan kompetitif multi-vendor melalui dokumen Request for Quotation resmi.
                            <span v-if="plan.status === 'active'" class="block mt-1 font-semibold text-blue-800">
                                Status rencana aktif! Rincian item siap dijadikan paket tender penawaran harga rekanan.
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Two-Column Information Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- PR Source Card -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div class="flex items-center gap-2">
                            <FileText class="w-4 h-4 text-blue-600" />
                            <h3 class="text-sm font-bold text-slate-900">Sumber Purchase Requisition</h3>
                        </div>
                        <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 class="w-3.5 h-3.5" /> Approved
                        </span>
                    </div>

                    <!-- Requester Card (Diajukan Oleh) -->
                    <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                        <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs ring-2 ring-blue-50 shrink-0">
                            <User class="w-4.5 h-4.5 text-blue-600" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diajukan Oleh (Pemohon)</div>
                            <div class="text-sm font-bold text-slate-900 truncate">
                                {{ plan.purchase_requisition?.requester?.name || plan.purchase_requisition?.requester?.employee?.name || 'Pemohon Tidak Tercatat' }}
                            </div>
                            <div v-if="plan.purchase_requisition?.requester?.email || plan.purchase_requisition?.requester?.employee?.email" class="text-xs text-slate-500 truncate font-mono">
                                {{ plan.purchase_requisition?.requester?.email || plan.purchase_requisition?.requester?.employee?.email }}
                            </div>
                        </div>
                    </div>

                    <div class="space-y-2.5 text-xs">
                        <div class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Nomor PR:</span>
                            <span class="font-bold text-slate-900 font-mono">{{ plan.purchase_requisition?.pr_number || '-' }}</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Perusahaan:</span>
                            <span class="font-semibold text-slate-800">{{ plan.purchase_requisition?.company?.name || '-' }}</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Divisi:</span>
                            <span class="font-semibold text-slate-800">{{ plan.purchase_requisition?.division?.name || '-' }}</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Tanggal Pengajuan:</span>
                            <span class="font-semibold text-slate-800">{{ formatDate(plan.purchase_requisition?.request_date) }}</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Tanggal Target Kebutuhan:</span>
                            <span class="font-semibold text-slate-800">{{ formatDate(plan.purchase_requisition?.required_date) }}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 px-3 bg-blue-50/70 border border-blue-200/70 rounded-xl">
                            <span class="text-blue-700 font-bold uppercase tracking-wider text-[11px]">Total Nilai Estimasi PR:</span>
                            <span class="font-bold text-blue-900 font-mono text-sm">
                                {{ formatCurrency(plan.purchase_requisition?.total_estimated_amount) }}
                            </span>
                        </div>
                        <div class="pt-1" v-if="plan.purchase_requisition?.purpose">
                            <span class="text-slate-500 block mb-1">Keperluan Pengajuan:</span>
                            <p class="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                                {{ plan.purchase_requisition?.purpose }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Lifecycle & Strategy Card -->
                <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                    <div class="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <Clock class="w-4 h-4 text-blue-600" />
                        <h3 class="text-sm font-bold text-slate-900">Jejak Waktu & Catatan Rencana</h3>
                    </div>

                    <div class="space-y-3 text-xs">
                        <div class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Waktu Dibuat:</span>
                            <span class="font-semibold text-slate-800">{{ formatDate(plan.created_at) }}</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Diaktivasi Pada:</span>
                            <span class="font-semibold text-slate-800">{{ formatDate(plan.activated_at) }}</span>
                        </div>
                        <div v-if="plan.activated_by_user" class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Diaktivasi Oleh:</span>
                            <span class="font-semibold text-slate-800">{{ plan.activated_by_user?.name || '-' }}</span>
                        </div>
                        <div v-if="plan.completed_at" class="flex justify-between items-center py-1 border-b border-slate-50">
                            <span class="text-slate-500">Selesai Pada:</span>
                            <span class="font-semibold text-emerald-700">{{ formatDate(plan.completed_at) }}</span>
                        </div>
                        <div class="pt-1">
                            <span class="text-slate-500 block mb-1">Catatan Rencana Pengadaan:</span>
                            <p class="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                                {{ plan.notes || 'Tidak ada catatan khusus.' }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PR Approval Workflow & Audit Trail Section -->
            <DocumentWorkflowTracker
                documentType="purchase_requisition"
                :documentId="plan.purchase_requisition_id || plan.purchase_requisition?.id"
                title="Progres Alur Persetujuan PR Terkait (Workflow)"
                auditTrailTitle="Jejak Audit Persetujuan PR (Audit Trail)"
            />

            <!-- Items Allocation Table -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div class="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <Package class="w-4 h-4 text-blue-600" />
                        <h3 class="text-sm font-bold text-slate-900">Rincian Item yang Dialokasikan</h3>
                    </div>
                    <span class="text-xs font-semibold text-slate-500 font-mono">
                        {{ plan.items?.length || 0 }} Item Dialokasikan
                    </span>
                </div>

                <BaseTable :columns="tableColumns">
                    <tr 
                        v-for="(item, idx) in plan.items" 
                        :key="item.id"
                        class="hover:bg-slate-50/70 transition-colors"
                    >
                        <!-- No -->
                        <td class="px-6 py-4 text-sm text-slate-500 text-center font-medium font-mono">
                            {{ idx + 1 }}
                        </td>

                        <!-- Item details -->
                        <td class="px-6 py-4">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-bold text-slate-900 text-sm">
                                        {{ item.purchase_requisition_item?.item_name || item.purchase_requisition_item?.item?.name || 'Item Tanpa Nama' }}
                                    </span>
                                    <span 
                                        v-if="item.purchase_requisition_item?.is_custom_item"
                                        class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                    >
                                        Non-Katalog
                                    </span>
                                    <span 
                                        v-else-if="item.purchase_requisition_item?.item_code"
                                        class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600"
                                    >
                                        {{ item.purchase_requisition_item?.item_code }}
                                    </span>
                                </div>

                                <!-- Reference link -->
                                <a 
                                    v-if="item.purchase_requisition_item?.reference_url"
                                    :href="item.purchase_requisition_item?.reference_url"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                                >
                                    <ExternalLink class="w-3 h-3" />
                                    <span class="truncate max-w-xs">{{ item.purchase_requisition_item?.reference_url }}</span>
                                </a>
                            </div>
                        </td>

                        <!-- Unit -->
                        <td class="px-6 py-4 text-center text-xs font-semibold text-slate-700">
                            {{ item.purchase_requisition_item?.unit?.code || item.purchase_requisition_item?.unit_code || 'Unit' }}
                        </td>

                        <!-- PR Estimated Price -->
                        <td class="px-6 py-4 text-right">
                            <span class="text-xs font-bold font-mono text-slate-900 block">
                                {{ formatCurrency(item.purchase_requisition_item?.estimated_price) }}
                            </span>
                            <span class="text-[10px] text-slate-400 block">Estimasi PR</span>
                        </td>

                        <!-- Planned Quantity -->
                        <td class="px-6 py-4 text-right">
                            <span class="text-sm font-bold text-slate-900 font-mono">
                                {{ Number(item.planned_quantity).toLocaleString('id-ID') }}
                            </span>
                        </td>

                        <!-- Line Subtotal -->
                        <td class="px-6 py-4 text-right">
                            <span class="text-xs font-bold font-mono text-blue-700">
                                {{ formatCurrency(item.planned_estimated_subtotal ?? (Number(item.planned_quantity) * Number(item.purchase_requisition_item?.estimated_price || 0))) }}
                            </span>
                        </td>

                        <!-- Notes -->
                        <td class="px-6 py-4 text-xs text-slate-500 italic">
                            {{ item.notes || '-' }}
                        </td>
                    </tr>
                </BaseTable>

                <!-- Allocation Stats Bar -->
                <div v-if="plan.items && plan.items.length > 0" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/90 p-4 border-t border-slate-200/80">
                    <div class="flex items-center gap-4 flex-wrap">
                        <span>Item Dialokasikan: <strong class="text-slate-900 font-bold font-mono">{{ plan.items.length }} item</strong></span>
                        <span>Total Kuantitas Terencana: <strong class="text-blue-700 font-bold font-mono">{{ totalPlannedQty.toLocaleString('id-ID') }} unit</strong></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 font-medium">Total Estimasi Nilai Rencana:</span>
                        <span class="text-sm font-bold text-blue-700 font-mono bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-xl">
                            {{ formatCurrency(totalPlannedAmount) }}
                        </span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
