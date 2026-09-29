<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { 
    getProcurementQueue, 
    createProcurementPlan, 
    activateProcurementPlan 
} from '../../services/procurementPlanServices.js'
import { showPurchaseRequisition } from '../../services/purchaseRequisitionServices.js'
import { getApprovalTrackerByDocument } from '../../services/approvalServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseInput from '../../components/ui/BaseInput.vue'
import BaseSelect from '../../components/ui/BaseSelect.vue'
import SearchableSelect from '../../components/ui/SearchableSelect.vue'
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
    Calendar,
    Building2,
    Save,
    Send,
    AlertCircle,
    Info,
    ExternalLink,
    Package,
    Check,
    HelpCircle,
    Store,
    Users,
    User,
    GitBranch,
    History,
    ChevronDown,
    ChevronUp,
    DollarSign
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// State
const isLoadingQueue = ref(false)
const isSubmitting = ref(false)
const queueList = ref([])
const selectedPrDetail = ref(null)
const isLoadingPrDetail = ref(false)
const prTrackerData = ref(null)
const isLoadingTracker = ref(false)
const showPrAuditTrail = ref(false)

// Form State
const selectedPrId = ref(null)
const procurementMethod = ref('direct_purchase') // 'direct_purchase' | 'rfq'
const planNotes = ref('')
const planItems = ref([]) // array of { pr_item_id, item_name, is_custom_item, reference_url, unit, requested_qty, remaining_qty, planned_qty, estimated_price, notes, is_selected }

// Grouped PR options for selector
const prOptions = computed(() => {
    const map = new Map()
    queueList.value.forEach(item => {
        if (!map.has(item.pr_id)) {
            map.set(item.pr_id, {
                value: item.pr_id,
                label: `${item.pr_number || 'PR #' + item.pr_id} • ${item.company?.name || ''} (${item.division?.name || ''})`,
                subtitle: `Tujuan: ${item.purpose || '-'} | Diajukan: ${item.requester?.name || '-'}`,
                pr_number: item.pr_number,
                company: item.company,
                division: item.division,
                requester: item.requester,
                purpose: item.purpose,
                request_date: item.request_date,
                required_date: item.required_date,
                itemCount: 0
            })
        }
        map.get(item.pr_id).itemCount += 1
    })
    return Array.from(map.values())
})

// Current Selected PR Metadata
const selectedPrMeta = computed(() => {
    if (!selectedPrId.value) return null
    return prOptions.value.find(opt => opt.value === Number(selectedPrId.value)) || null
})

// Comprehensive Active PR Information (Combines queue meta and full PR detail)
const activePrInfo = computed(() => {
    if (!selectedPrId.value) return null
    const meta = selectedPrMeta.value || {}
    const detail = selectedPrDetail.value || {}

    const requester = detail.requester || meta.requester || null
    const requesterName = requester?.name || requester?.employee?.name || null
    const requesterEmail = requester?.email || requester?.employee?.email || null

    const itemsEstimatedSum = (detail.items || planItems.value || []).reduce((sum, item) => {
        const qty = Number(item.requested_quantity || item.requested_qty || item.quantity || 0)
        const price = Number(item.estimated_price || 0)
        return sum + (qty * price)
    }, 0)

    return {
        pr_id: selectedPrId.value,
        pr_number: detail.pr_number || meta.pr_number || `PR #${selectedPrId.value}`,
        company: detail.company?.name || meta.company?.name || '-',
        division: detail.division?.name || meta.division?.name || '-',
        requesterName,
        requesterEmail,
        request_date: detail.request_date || meta.request_date || null,
        required_date: detail.required_date || meta.required_date || null,
        purpose: detail.purpose || meta.purpose || null,
        notes: detail.notes || null,
        itemCount: meta.itemCount || (detail.items?.length || planItems.value.length || 0),
        totalEstimatedAmount: Number(detail.total_estimated_amount || 0) || itemsEstimatedSum,
        status: detail.status || 'approved'
    }
})

// Workflow Computations
const prWorkflowLevels = computed(() => {
    return prTrackerData.value?.levels || selectedPrDetail.value?.approval_request?.levels || []
})

const prWorkflowCurrentStep = computed(() => {
    return prTrackerData.value?.request?.current_step_order || selectedPrDetail.value?.approval_request?.current_step_order || 1
})

const prWorkflowStatus = computed(() => {
    return prTrackerData.value?.request?.status || selectedPrDetail.value?.approval_request?.status || selectedPrDetail.value?.status || 'approved'
})

const prWorkflowActions = computed(() => {
    return prTrackerData.value?.actions || selectedPrDetail.value?.approval_request?.actions || []
})

// Allocation Summary
const totalAllocatedItems = computed(() => {
    return planItems.value.filter(i => i.is_selected && Number(i.planned_qty) > 0).length
})

const totalAllocatedQty = computed(() => {
    return planItems.value
        .filter(i => i.is_selected)
        .reduce((acc, curr) => acc + (Number(curr.planned_qty) || 0), 0)
})

const totalEstimatedPlanAmount = computed(() => {
    return planItems.value
        .filter(i => i.is_selected)
        .reduce((sum, item) => sum + (Number(item.planned_qty || 0) * Number(item.estimated_price || 0)), 0)
})

// Load Queue & Initialize
const loadQueueData = async () => {
    try {
        isLoadingQueue.value = true
        // Fetch up to 100 items from queue to populate selector
        const res = await getProcurementQueue({}, 1, 100)
        queueList.value = res.data || []

        // If pr_id query param exists, auto-select
        const queryPrId = route.query.pr_id
        if (queryPrId) {
            selectedPrId.value = Number(queryPrId)
        } else if (prOptions.value.length > 0) {
            selectedPrId.value = prOptions.value[0].value
        }
    } catch (error) {
        showError('Gagal Mengambil Data PR!', 'Terjadi kesalahan saat memuat data Purchase Requisition approved.', error)
    } finally {
        isLoadingQueue.value = false
    }
}

// Watch PR selection to populate items, fetch full PR details, item prices, and workflow tracker
watch(selectedPrId, async (newPrId) => {
    if (!newPrId) {
        planItems.value = []
        selectedPrDetail.value = null
        prTrackerData.value = null
        return
    }

    const itemsForPr = queueList.value.filter(i => i.pr_id === Number(newPrId))
    planItems.value = itemsForPr.map(i => ({
        pr_item_id: i.purchase_requisition_item_id,
        item_id: i.item_id,
        item_name: i.item_name || i.item?.name || 'Item Tanpa Nama',
        item_code: i.item?.code || null,
        is_custom_item: i.is_custom_item,
        reference_url: i.reference_url,
        unit: i.unit?.code || i.unit?.name || 'Unit',
        requested_qty: Number(i.requested_quantity),
        allocated_qty: Number(i.allocated_quantity || 0),
        remaining_qty: Number(i.remaining_quantity),
        planned_qty: Number(i.remaining_quantity),
        estimated_price: Number(i.estimated_price || 0),
        notes: '',
        is_selected: true,
        error: ''
    }))

    // Auto-suggest procurement method:
    // If any item is custom/non-catalog, default to direct_purchase
    const hasCustomItem = itemsForPr.some(i => i.is_custom_item)
    if (hasCustomItem) {
        procurementMethod.value = 'direct_purchase'
    }

    // Fetch full PR detail for complete requester, purpose, and item prices
    try {
        isLoadingPrDetail.value = true
        const res = await showPurchaseRequisition(newPrId)
        selectedPrDetail.value = res.data || res

        // Enrich item estimated prices from full PR detail if available
        if (selectedPrDetail.value?.items && Array.isArray(selectedPrDetail.value.items)) {
            planItems.value.forEach(item => {
                const matched = selectedPrDetail.value.items.find(pi => pi.id === item.pr_item_id)
                if (matched && matched.estimated_price !== undefined && matched.estimated_price !== null) {
                    item.estimated_price = Number(matched.estimated_price)
                }
            })
        }
    } catch (err) {
        console.warn('Could not fetch full PR detail, fallback to queue data', err)
    } finally {
        isLoadingPrDetail.value = false
    }

    // Fetch approval workflow tracker & audit history for this PR
    try {
        isLoadingTracker.value = true
        const trackerRes = await getApprovalTrackerByDocument('purchase_requisition', newPrId)
        prTrackerData.value = trackerRes.data || trackerRes
    } catch (err) {
        console.warn('Could not fetch approval tracker for PR', err)
    } finally {
        isLoadingTracker.value = false
    }
}, { immediate: true })

// Helper to allocate all items full quota
const allocateAllFull = () => {
    planItems.value.forEach(item => {
        item.is_selected = true
        item.planned_qty = item.remaining_qty
        item.error = ''
    })
}

// Validate single item row
const validateItemQty = (item) => {
    if (!item.is_selected) {
        item.error = ''
        return true
    }
    const val = Number(item.planned_qty)
    if (isNaN(val) || val <= 0) {
        item.error = 'Kuantitas harus lebih dari 0'
        return false
    }
    if (val > item.remaining_qty) {
        item.error = `Maksimal kuota sisa: ${item.remaining_qty}`
        return false
    }
    item.error = ''
    return true
}

// Format date helper
const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

// Submit Plan (Draft or Immediate Activation)
const handleSubmit = async (shouldActivate = false) => {
    if (!selectedPrId.value) {
        showError('Validasi Gagal', 'Silakan pilih Purchase Requisition terlebih dahulu.')
        return
    }

    if (!procurementMethod.value) {
        showError('Validasi Gagal', 'Silakan pilih metode pengadaan (Direct Purchase atau Tender RFQ).')
        return
    }

    const selectedItems = planItems.value.filter(i => i.is_selected)
    if (selectedItems.length === 0) {
        showError('Validasi Gagal', 'Pilih minimal satu item untuk dialokasikan ke rencana pengadaan ini.')
        return
    }

    let hasError = false
    selectedItems.forEach(item => {
        if (!validateItemQty(item)) {
            hasError = true
        }
    })

    if (hasError) {
        showError('Validasi Gagal', 'Terdapat kuantitas alokasi yang tidak valid atau melebihi sisa kuota.')
        return
    }

    const methodName = procurementMethod.value === 'direct_purchase' ? 'Direct Purchase (Pembelian Langsung)' : 'Tender RFQ (Multi-Vendor)'
    const confirmTitle = shouldActivate ? 'Simpan & Aktifkan Rencana?' : 'Simpan sebagai Draft?'
    const confirmText = shouldActivate 
        ? `Rencana pengadaan dengan metode "${methodName}" akan langsung diaktifkan dan status PR akan berubah menjadi In Procurement.` 
        : `Rencana pengadaan akan disimpan sebagai Draft dan dapat diedit kembali sebelum diaktifkan.`
    const confirmBtnText = shouldActivate ? 'Ya, Simpan & Aktifkan' : 'Ya, Simpan Draft'

    const confirmed = await showConfirm(confirmTitle, confirmText, confirmBtnText, 'Batal', '#2563eb')
    if (!confirmed) return

    try {
        isSubmitting.value = true
        showLoading(shouldActivate ? 'Menyimpan & mengaktifkan rencana...' : 'Menyimpan draft rencana...')

        const payload = {
            purchase_requisition_id: selectedPrId.value,
            procurement_method: procurementMethod.value,
            notes: planNotes.value || null,
            items: selectedItems.map(i => ({
                purchase_requisition_item_id: i.pr_item_id,
                planned_quantity: Number(i.planned_qty),
                notes: i.notes || null
            }))
        }

        const createRes = await createProcurementPlan(payload)
        const planId = createRes.data?.id

        if (shouldActivate && planId) {
            await activateProcurementPlan(planId)
            showSuccess('Berhasil!', `Rencana pengadaan ${createRes.data?.pp_number || ''} berhasil dibuat dan diaktifkan.`)
        } else {
            showSuccess('Berhasil!', `Rencana pengadaan ${createRes.data?.pp_number || ''} berhasil disimpan sebagai Draft.`)
        }

        router.push({ name: 'user.purchasing.plans' })
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan rencana pengadaan.'
        showError('Gagal!', errorMsg, error)
    } finally {
        isSubmitting.value = false
    }
}

onMounted(() => {
    loadQueueData()
})
</script>

<template>
    <div class="space-y-6 w-full pb-16">
        <!-- Page Header -->
        <PageHeader 
            title="Buat Rencana Pengadaan (Procurement Plan)" 
            description="Tentukan metode pengadaan (Direct Purchase vs Tender RFQ), alokasikan kuantitas item dari Purchase Requisition yang disetujui, dan aktifkan alur transaksi."
            :breadcrumbs="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Rencana Pengadaan', to: { name: 'user.purchasing.plans' } },
                { label: 'Buat Rencana' }
            ]"
        >
            <template #actions>
                <RouterLink :to="{ name: 'user.purchasing.plans' }">
                    <BaseButton variant="secondary">
                        <ArrowLeft class="w-4 h-4 mr-1.5" />
                        <span>Kembali ke Daftar</span>
                    </BaseButton>
                </RouterLink>
            </template>
        </PageHeader>

        <!-- Form Container -->
        <form @submit.prevent class="space-y-8">
            <!-- SECTION 1: Sumber Purchase Requisition -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm">
                            1
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-slate-900">Pilih Purchase Requisition (PR) Disetujui</h3>
                            <p class="text-xs text-slate-500">Pilih dokumen PR approved yang itemnya ingin dialokasikan ke dalam paket rencana pengadaan ini.</p>
                        </div>
                    </div>
                    <RouterLink 
                        :to="{ name: 'user.purchasing.plans', query: { tab: 'pending' } }"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                    >
                        <Layers class="w-3.5 h-3.5" />
                        Pilih dari Daftar PR
                    </RouterLink>
                </div>

                <!-- PR Selector Bar (Full Width) -->
                <div class="bg-slate-50/70 p-4.5 rounded-xl border border-slate-200/80 space-y-2">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <label class="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Nomor Purchase Requisition (Approved) <span class="text-rose-500">*</span>
                        </label>
                        <span v-if="activePrInfo" class="text-[11px] text-slate-500 font-medium">
                            Ganti dokumen PR untuk mengubah paket rencana pengadaan
                        </span>
                    </div>
                    <SearchableSelect 
                        v-model="selectedPrId"
                        :options="prOptions"
                        placeholder="-- Cari atau Pilih Dokumen PR (Approved) --"
                        searchPlaceholder="Ketik nomor PR, nama divisi, atau perusahaan..."
                        :disabled="isLoadingQueue"
                        :loading="isLoadingQueue"
                        required
                    />
                    <p v-if="prOptions.length === 0 && !isLoadingQueue" class="text-xs text-amber-600 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                        Tidak ada Purchase Requisition (PR) approved yang perlu dialokasikan.
                    </p>
                </div>

                <!-- When PR is Selected: Balanced 2-Column Bento Grid (Detail & Workflow side-by-side) -->
                <div v-if="activePrInfo" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
                    <!-- Left Column: Detail Dokumen PR (lg:col-span-6) -->
                    <div class="lg:col-span-6 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
                        <div class="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                            <div class="flex items-center gap-2">
                                <FileText class="w-4 h-4 text-blue-600" />
                                <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Detail Dokumen PR</span>
                            </div>
                            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 class="w-3.5 h-3.5" /> Approved
                            </span>
                        </div>

                        <!-- Requester Card (Diajukan Oleh) -->
                        <div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                            <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs ring-2 ring-blue-50 shrink-0">
                                <User class="w-4.5 h-4.5 text-blue-600" />
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diajukan Oleh (Pemohon)</div>
                                <div class="text-sm font-bold text-slate-900 truncate">
                                    {{ activePrInfo.requesterName || 'Pemohon Tidak Tercatat' }}
                                </div>
                                <div v-if="activePrInfo.requesterEmail" class="text-xs text-slate-500 truncate font-mono">
                                    {{ activePrInfo.requesterEmail }}
                                </div>
                            </div>
                        </div>

                        <!-- PR Metadata Grid -->
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                                <span class="text-slate-400 block text-[11px] font-medium mb-0.5">Perusahaan:</span>
                                <span class="font-semibold text-slate-800 block truncate" :title="activePrInfo.company">{{ activePrInfo.company }}</span>
                            </div>
                            <div class="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                                <span class="text-slate-400 block text-[11px] font-medium mb-0.5">Divisi Pemohon:</span>
                                <span class="font-semibold text-slate-800 block truncate" :title="activePrInfo.division">{{ activePrInfo.division }}</span>
                            </div>
                            <div class="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                                <span class="text-slate-400 block text-[11px] font-medium mb-0.5">Tgl Pengajuan PR:</span>
                                <span class="font-semibold text-slate-800 block">{{ formatDate(activePrInfo.request_date) }}</span>
                            </div>
                            <div class="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
                                <span class="text-slate-400 block text-[11px] font-medium mb-0.5">Target Kebutuhan:</span>
                                <span class="font-semibold text-slate-800 block">{{ formatDate(activePrInfo.required_date) }}</span>
                            </div>
                            <div class="col-span-2 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200/70 flex items-center justify-between">
                                <span class="text-blue-700 text-[11px] font-bold uppercase tracking-wider">Total Nilai Estimasi PR:</span>
                                <span class="font-bold text-blue-900 font-mono text-sm">
                                    {{ formatCurrency(activePrInfo.totalEstimatedAmount) }}
                                </span>
                            </div>
                        </div>

                        <!-- Keperluan / Tujuan PR (If available) -->
                        <div v-if="activePrInfo.purpose" class="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3 text-xs space-y-1">
                            <span class="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Tujuan / Keperluan Pengadaan:</span>
                            <p class="text-slate-700 font-medium leading-relaxed">{{ activePrInfo.purpose }}</p>
                        </div>

                        <!-- Item Count Indicator -->
                        <div class="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60">
                            <span class="text-slate-500 font-medium">Item Tersedia untuk Dialokasikan:</span>
                            <span class="font-bold text-blue-700 font-mono bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                {{ activePrInfo.itemCount }} item
                            </span>
                        </div>
                    </div>

                    <!-- Right Column: Alur Persetujuan & Status Workflow PR (lg:col-span-6) -->
                    <div class="lg:col-span-6">
                        <DocumentWorkflowTracker
                            documentType="purchase_requisition"
                            :documentId="selectedPrId"
                            title="Alur Persetujuan & Status Workflow PR"
                            auditTrailTitle="Jejak Audit Persetujuan PR (Audit Trail)"
                        />
                    </div>
                </div>

                <!-- Empty State when no PR is selected -->
                <div v-else-if="!isLoadingQueue" class="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <FileText class="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p class="text-xs font-semibold text-slate-600">Pilih Dokumen Purchase Requisition</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">Pilih salah satu dokumen PR approved pada opsi di atas untuk melihat rincian dokumen dan alur persetujuan.</p>
                </div>
            </div>

            <!-- SECTION 2: Penentuan Metode Pengadaan (Direct Purchase vs Tender RFQ) -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm">
                        2
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-900">Penentuan Metode Pengadaan (Sourcing Strategy)</h3>
                        <p class="text-xs text-slate-500">Tentukan apakah pengadaan dieksekusi secara Pembelian Langsung atau Tender RFQ Multi-Vendor.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <!-- Option A: Direct Purchase Card -->
                    <div 
                        @click="procurementMethod = 'direct_purchase'"
                        class="cursor-pointer relative p-5 rounded-2xl border-2 transition-all flex flex-col justify-between"
                        :class="procurementMethod === 'direct_purchase' 
                            ? 'border-emerald-600 bg-emerald-50/40 shadow-xs shadow-emerald-100' 
                            : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50'"
                    >
                        <!-- Selected Radio Indicator -->
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3.5">
                                <div 
                                    class="w-12 h-12 rounded-xl flex items-center justify-center"
                                    :class="procurementMethod === 'direct_purchase' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'"
                                >
                                    <ShoppingCart class="w-6 h-6" />
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h4 class="font-bold text-base text-slate-900">Direct Purchase</h4>
                                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                            Pembelian Langsung
                                        </span>
                                    </div>
                                    <p class="text-xs text-emerald-700 font-semibold mt-0.5">Marketplace, Official Store, & Retail</p>
                                </div>
                            </div>

                            <div 
                                class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                                :class="procurementMethod === 'direct_purchase' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'"
                            >
                                <Check v-if="procurementMethod === 'direct_purchase'" class="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                        </div>

                        <!-- Card Body & Rules -->
                        <div class="mt-4 space-y-3 pt-3 border-t border-emerald-100/60">
                            <p class="text-xs text-slate-600 leading-relaxed">
                                Pengadaan langsung ke supplier retail, official store, toko fisik, atau marketplace online (seperti Tokopedia, Shopee, Bukalapak) tanpa lelang multi-vendor.
                            </p>
                            <div class="space-y-1.5 text-xs text-slate-700 bg-white/90 p-3 rounded-xl border border-emerald-100">
                                <div class="flex items-center gap-2 font-medium text-emerald-800">
                                    <Store class="w-3.5 h-3.5 shrink-0" />
                                    <span>Karakteristik & Kecocokan:</span>
                                </div>
                                <ul class="list-disc list-inside text-slate-600 space-y-0.5 text-[11px] pl-1">
                                    <li>Sangat ideal untuk item non-katalog / custom link PR</li>
                                    <li>Kebutuhan cepat / mendesak (urgent operational needs)</li>
                                    <li>Langsung berlanjut ke tahap pelampiran bukti transaksi & penerimaan</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Option B: Tender RFQ Card -->
                    <div 
                        @click="procurementMethod = 'rfq'"
                        class="cursor-pointer relative p-5 rounded-2xl border-2 transition-all flex flex-col justify-between"
                        :class="procurementMethod === 'rfq' 
                            ? 'border-blue-600 bg-blue-50/40 shadow-xs shadow-blue-100' 
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'"
                    >
                        <!-- Selected Radio Indicator -->
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-center gap-3.5">
                                <div 
                                    class="w-12 h-12 rounded-xl flex items-center justify-center"
                                    :class="procurementMethod === 'rfq' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 border border-blue-200/60'"
                                >
                                    <Scale class="w-6 h-6" />
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h4 class="font-bold text-base text-slate-900">Tender RFQ</h4>
                                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                                            Request for Quotation
                                        </span>
                                    </div>
                                    <p class="text-xs text-blue-700 font-semibold mt-0.5">Penawaran Kompetitif Multi-Vendor</p>
                                </div>
                            </div>

                            <div 
                                class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                                :class="procurementMethod === 'rfq' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'"
                            >
                                <Check v-if="procurementMethod === 'rfq'" class="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                        </div>

                        <!-- Card Body & Rules -->
                        <div class="mt-4 space-y-3 pt-3 border-t border-blue-100/60">
                            <p class="text-xs text-slate-600 leading-relaxed">
                                Pengadaan terstruktur dengan menerbitkan dokumen RFQ ke beberapa vendor rekanan terdaftar untuk mendapatkan perbandingan harga, spesifikasi, dan term pembayaran terbaik.
                            </p>
                            <div class="space-y-1.5 text-xs text-slate-700 bg-white/90 p-3 rounded-xl border border-blue-100">
                                <div class="flex items-center gap-2 font-medium text-blue-800">
                                    <Users class="w-3.5 h-3.5 shrink-0" />
                                    <span>Karakteristik & Kecocokan:</span>
                                </div>
                                <ul class="list-disc list-inside text-slate-600 space-y-0.5 text-[11px] pl-1">
                                    <li>Cocok untuk item katalog dengan volume atau nilai pengadaan tinggi</li>
                                    <li>Mendapatkan harga kompetitif melalui tender lelang resmi</li>
                                    <li>Dilanjutkan ke modul RFQ Vendor Quotation & Matrix Perbandingan</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECTION 3: Alokasi Item Pengadaan -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm">
                            3
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-slate-900">Alokasi Kuantitas Item</h3>
                            <p class="text-xs text-slate-500">Pilih item yang akan dimasukkan ke rencana ini dan masukkan jumlah alokasinya.</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            @click="allocateAllFull"
                            class="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <CheckCircle2 class="w-3.5 h-3.5" />
                            <span>Pilih Semua & Alokasikan Penuh</span>
                        </button>
                    </div>
                </div>

                <!-- Empty items alert -->
                <div v-if="planItems.length === 0" class="py-12 text-center text-slate-500">
                    <Package class="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p class="text-sm font-semibold text-slate-700">Belum Ada Item Terpilih</p>
                    <p class="text-xs text-slate-500 mt-1">Silakan pilih Purchase Requisition pada langkah 1 untuk menampilkan daftar item.</p>
                </div>

                <!-- Items Table -->
                <div v-else class="overflow-x-auto border border-slate-200/80 rounded-xl">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <th class="px-4 py-3 text-center w-12">Pilih</th>
                                <th class="px-4 py-3 min-w-[220px]">Item & Referensi</th>
                                <th class="px-4 py-3 text-right w-20">Diminta</th>
                                <th class="px-4 py-3 text-right w-24">Sisa Kuota</th>
                                <th class="px-4 py-3 text-right w-36">Harga Satuan (PR)</th>
                                <th class="px-4 py-3 min-w-[150px] w-44">Kuantitas Terencana</th>
                                <th class="px-4 py-3 text-right w-36">Subtotal Estimasi</th>
                                <th class="px-4 py-3 min-w-[180px]">Catatan Pengadaan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr 
                                v-for="(item, idx) in planItems" 
                                :key="item.pr_item_id"
                                class="transition-colors"
                                :class="item.is_selected ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/40 text-slate-400'"
                            >
                                <!-- Checkbox -->
                                <td class="px-4 py-4 text-center">
                                    <input 
                                        type="checkbox" 
                                        v-model="item.is_selected"
                                        class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </td>

                                <!-- Item Details -->
                                <td class="px-4 py-4">
                                    <div class="space-y-1">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-bold text-sm" :class="item.is_selected ? 'text-slate-900' : 'text-slate-400'">
                                                {{ item.item_name }}
                                            </span>
                                            <span 
                                                v-if="item.is_custom_item" 
                                                class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                            >
                                                Non-Katalog
                                            </span>
                                            <span 
                                                v-else-if="item.item_code" 
                                                class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600"
                                            >
                                                {{ item.item_code }}
                                            </span>
                                        </div>

                                        <!-- Reference URL -->
                                        <a 
                                            v-if="item.reference_url" 
                                            :href="item.reference_url" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                                        >
                                            <ExternalLink class="w-3 h-3 shrink-0" />
                                            <span class="truncate max-w-[220px]">{{ item.reference_url }}</span>
                                        </a>
                                    </div>
                                </td>

                                <!-- Requested Qty -->
                                <td class="px-4 py-4 text-right text-xs font-semibold text-slate-600 font-mono">
                                    {{ item.requested_qty }} {{ item.unit }}
                                </td>

                                <!-- Remaining Qty -->
                                <td class="px-4 py-4 text-right">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                                        {{ item.remaining_qty }} {{ item.unit }}
                                    </span>
                                </td>

                                <!-- Item Estimated Price from PR -->
                                <td class="px-4 py-4 text-right">
                                    <span class="text-xs font-bold font-mono block" :class="item.is_selected ? 'text-slate-900' : 'text-slate-400'">
                                        {{ formatCurrency(item.estimated_price) }}
                                    </span>
                                    <span class="text-[10px] text-slate-400 block">Estimasi PR</span>
                                </td>

                                <!-- Planned Qty Input -->
                                <td class="px-4 py-4">
                                    <div class="space-y-1">
                                        <div class="relative flex items-center">
                                            <input 
                                                type="number" 
                                                step="any"
                                                v-model="item.planned_qty"
                                                :disabled="!item.is_selected"
                                                @input="validateItemQty(item)"
                                                class="w-full text-sm font-bold font-mono px-3 py-1.5 rounded-xl border transition-all focus:outline-none focus:ring-2"
                                                :class="[
                                                    item.error 
                                                        ? 'border-rose-400 focus:ring-rose-200 text-rose-700' 
                                                        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 text-slate-900',
                                                    !item.is_selected ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'
                                                ]"
                                            />
                                            <span class="absolute right-3 text-xs font-semibold text-slate-400">
                                                {{ item.unit }}
                                            </span>
                                        </div>
                                        <p v-if="item.error" class="text-[11px] text-rose-600 font-medium">
                                            {{ item.error }}
                                        </p>
                                    </div>
                                </td>

                                <!-- Line Estimated Subtotal -->
                                <td class="px-4 py-4 text-right">
                                    <span class="text-xs font-bold font-mono" :class="item.is_selected ? 'text-blue-700 font-semibold' : 'text-slate-400'">
                                        {{ formatCurrency(Number(item.planned_qty || 0) * Number(item.estimated_price || 0)) }}
                                    </span>
                                </td>

                                <!-- Item Notes -->
                                <td class="px-4 py-4">
                                    <input 
                                        type="text" 
                                        v-model="item.notes"
                                        :disabled="!item.is_selected"
                                        placeholder="Catatan khusus item ini..."
                                        class="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                                        :class="!item.is_selected ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Allocation Stats Bar -->
                <div v-if="planItems.length > 0" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80">
                    <div class="flex items-center gap-4 flex-wrap">
                        <span>Item Terpilih: <strong class="text-slate-900 font-bold font-mono">{{ totalAllocatedItems }} dari {{ planItems.length }}</strong></span>
                        <span>Total Kuantitas: <strong class="text-blue-700 font-bold font-mono">{{ totalAllocatedQty.toLocaleString('id-ID') }} unit</strong></span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 font-medium">Total Estimasi Rencana:</span>
                        <span class="text-sm font-bold text-blue-700 font-mono bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-xl">
                            {{ formatCurrency(totalEstimatedPlanAmount) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- SECTION 4: Catatan Rencana Pengadaan -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm">
                        4
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-900">Catatan Rencana Pengadaan</h3>
                        <p class="text-xs text-slate-500">Berikan catatan atau instruksi strategis bagi tim eksekusi pengadaan.</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-2">Catatan / Rationale Sourcing (Opsional)</label>
                    <textarea 
                        v-model="planNotes"
                        rows="3"
                        placeholder="Contoh: Pembelian langsung via Tokopedia Official Store untuk kebutuhan urgent operasional IT, estimasi sampai 2 hari kerja..."
                        class="w-full text-sm p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-y"
                    ></textarea>
                </div>
            </div>

            <!-- Actions Footer -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <RouterLink :to="{ name: 'user.purchasing.plans' }">
                    <BaseButton variant="secondary">
                        <span>Batal</span>
                    </BaseButton>
                </RouterLink>

                <div class="flex items-center gap-3">
                    <button 
                        type="button" 
                        @click="handleSubmit(false)"
                        :disabled="isSubmitting || planItems.length === 0"
                        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-xs transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Save class="w-4 h-4 text-slate-500" />
                        <span>Simpan sebagai Draft</span>
                    </button>

                    <button 
                        type="button" 
                        @click="handleSubmit(true)"
                        :disabled="isSubmitting || planItems.length === 0"
                        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Send class="w-4 h-4" />
                        <span>Simpan & Aktifkan Rencana</span>
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>
