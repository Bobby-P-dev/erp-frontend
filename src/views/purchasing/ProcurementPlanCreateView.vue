<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import {
    getProcurementQueue,
    createProcurementPlan,
    activateProcurementPlan
} from '../../services/procurementPlanServices.js'
import { showPurchaseRequisition } from '../../services/purchaseRequisitionServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'

import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import SearchableSelect from '../../components/ui/SearchableSelect.vue'
import ReviewDisclosure from '../../components/ui/ReviewDisclosure.vue'
import DocumentWorkflowTracker from '../../components/approval/DocumentWorkflowTracker.vue'
import PlanAllocationItems from '../../components/purchasing/plan/PlanAllocationItems.vue'
import { ArrowLeft, ShoppingCart, Scale } from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// State
const isLoadingQueue = ref(false)
const isSubmitting = ref(false)
const queueList = ref([])
const selectedPrDetail = ref(null)
const isLoadingPrDetail = ref(false)
const showWorkflow = ref(false)
const allocationSection = ref(null)
const allocationError = ref('')

const isBulkMode = ref(false)
const bulkCompany = ref(null)

// Form State
const selectedPrId = ref(null)
const procurementMethod = ref('direct_purchase') // 'direct_purchase' | 'rfq'
const planNotes = ref('')
const planItems = ref([]) // array of { pr_item_id, item_name, is_custom_item, reference_url, unit, requested_qty, remaining_qty, planned_qty, estimated_price, notes, is_selected }

const uniquePrNumbers = computed(() => {
    const set = new Set()
    planItems.value.forEach(i => {
        if (i.pr_number) set.add(i.pr_number)
    })
    return Array.from(set)
})

const cancelBulkMode = () => {
    sessionStorage.removeItem('bulk_procurement_items')
    sessionStorage.removeItem('bulk_procurement_company')
    isBulkMode.value = false
    bulkCompany.value = null
    planItems.value = []
    router.replace({ name: 'user.purchasing.plans.create' })
    loadQueueData()
}

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
        currency: detail.currency || meta.currency || 'IDR',
        exchange_rate: Number(detail.exchange_rate || meta.exchange_rate || 1),
        status: detail.status || 'approved'
    }
})

// Allocation Summary
const totalAllocatedItems = computed(() => {
    return planItems.value.filter(i => i.is_selected && Number(i.planned_qty) > 0).length
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

// Ignore a previous PR response when the user switches the source during loading.
watch(selectedPrId, async (newPrId, _oldPrId, onCleanup) => {
    let stale = false
    onCleanup(() => { stale = true })
    selectedPrDetail.value = null
    showWorkflow.value = false
    allocationError.value = ''
    if (!newPrId) {
        planItems.value = []
        selectedPrDetail.value = null
        return
    }

    const itemsForPr = queueList.value.filter(i => i.pr_id === Number(newPrId))
    planItems.value = itemsForPr.map(i => ({
        pr_item_id: i.purchase_requisition_item_id,
        item_id: i.item_id,
        item_name: i.item_name || i.item?.name || 'Item Tanpa Nama',
        detail_name: i.detail_name || '',
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
        if (stale) return
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
        if (!stale) isLoadingPrDetail.value = false
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
    if (isSubmitting.value || isLoadingQueue.value || isLoadingPrDetail.value) return
    allocationError.value = ''
    if (!isBulkMode.value && !selectedPrId.value) {
        showError('Validasi Gagal', 'Silakan pilih Purchase Requisition terlebih dahulu.')
        return
    }

    if (!procurementMethod.value) {
        showError('Validasi Gagal', 'Silakan pilih metode pengadaan (Direct Purchase atau Tender RFQ).')
        return
    }

    const selectedItems = planItems.value.filter(i => i.is_selected)
    if (selectedItems.length === 0) {
        allocationError.value = 'Pilih minimal satu barang untuk rencana ini.'
        await nextTick()
        allocationSection.value?.querySelector('input[type=checkbox]')?.focus()
        return
    }

    let hasError = false
    selectedItems.forEach(item => {
        if (!validateItemQty(item)) {
            hasError = true
        }
    })

    if (hasError) {
        allocationError.value = 'Periksa jumlah alokasi yang ditandai di bawah.'
        await nextTick()
        allocationSection.value?.querySelector('[aria-invalid="true"]')?.focus()
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

        const payload = isBulkMode.value
            ? {
                is_consolidated: true,
                company_id: bulkCompany.value?.id || null,
                procurement_method: procurementMethod.value,
                notes: planNotes.value || null,
                items: selectedItems.map(i => ({
                    purchase_requisition_item_id: i.pr_item_id,
                    planned_quantity: Number(i.planned_qty),
                    notes: i.notes || null
                }))
            }
            : {
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

        if (isBulkMode.value) {
            sessionStorage.removeItem('bulk_procurement_items')
            sessionStorage.removeItem('bulk_procurement_company')
        }

        if (shouldActivate && planId) {
            await activateProcurementPlan(planId)
            showSuccess('Berhasil!', `Rencana pengadaan ${createRes.data?.pp_number || ''} berhasil dibuat dan diaktifkan.`)
            if (procurementMethod.value === 'rfq' && route.query.fast_rfq === '1') {
                router.push({ name: 'user.purchasing.rfq.create', query: { plan_id: planId } })
                return
            }
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
    if (route.query.method === 'rfq' || route.query.method === 'direct_purchase') {
        procurementMethod.value = String(route.query.method)
    }

    if (route.query.bulk === '1') {
        const rawItems = sessionStorage.getItem('bulk_procurement_items')
        const rawCompany = sessionStorage.getItem('bulk_procurement_company')
        if (rawItems) {
            try {
                const items = JSON.parse(rawItems)
                if (Array.isArray(items) && items.length > 0) {
                    isBulkMode.value = true
                    bulkCompany.value = rawCompany ? JSON.parse(rawCompany) : null
                    planItems.value = items.map(i => ({
                        pr_item_id: i.purchase_requisition_item_id || i.id,
                        pr_id: i.pr_id,
                        pr_number: i.pr_number,
                        company_name: i.company?.name,
                        division_name: i.division?.name,
                        item_id: i.item_id,
                        item_name: i.item_name || i.item?.name || 'Item Tanpa Nama',
                        detail_name: i.detail_name || '',
                        item_code: i.item_code || i.item?.code || null,
                        is_custom_item: i.is_custom_item,
                        reference_url: i.reference_url,
                        unit: i.unit?.code || i.unit_code || i.unit?.name || 'Unit',
                        requested_qty: Number(i.requested_quantity || 0),
                        allocated_qty: Number(i.allocated_quantity || 0),
                        remaining_qty: Number(i.remaining_quantity),
                        planned_qty: Number(i.remaining_quantity),
                        estimated_price: Number(i.estimated_price || 0),
                        notes: '',
                        is_selected: true,
                        error: ''
                    }))
                    return
                }
            } catch (e) {
                console.error('Failed to parse bulk procurement items:', e)
            }
        }
    }

    loadQueueData()
})
</script>

<template>
    <div class="plan-create space-y-6">
        <BaseBreadcrumb :items="[{ label: 'Purchasing', to: { name: 'user.purchasing' } }, { label: 'Rencana Pengadaan', to: { name: 'user.purchasing.plans' } }, { label: 'Buat rencana' }]" />
        <div class="flex flex-wrap justify-between items-start gap-4">
            <div>
                <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Buat rencana pengadaan</h1>
                <p class="mt-2 text-sm text-slate-500">Tentukan cara pengadaan dan jumlah barang yang akan diproses.</p>
            </div>
            <RouterLink :to="{ name: 'user.purchasing.plans' }" class="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#014baa]"><ArrowLeft class="size-4" />Kembali ke daftar</RouterLink>
        </div>

        <form @submit.prevent="handleSubmit(false)" novalidate class="space-y-6" :aria-busy="isSubmitting">
            <fieldset :disabled="isSubmitting" class="min-w-0 space-y-6">
                <legend class="sr-only">Informasi rencana pengadaan</legend>
                <section class="form-section" aria-labelledby="source-title">
                    <h2 id="source-title" class="section-title"><span class="section-number">1</span>Sumber kebutuhan</h2>
                    <div v-if="isBulkMode" class="mt-5 space-y-3">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                            <div><p class="text-sm font-medium text-slate-800">Konsolidasi {{ uniquePrNumbers.length }} PR · {{ planItems.length }} barang</p><p class="mt-1 text-sm text-slate-500">{{ bulkCompany?.name || 'Perusahaan belum tersedia' }}</p></div>
                            <button type="button" @click="cancelBulkMode" class="text-xs text-[#014baa] hover:underline">Ganti sumber PR</button>
                        </div>
                        <ReviewDisclosure title="PR yang digabungkan"><ul class="space-y-2 text-sm text-slate-600"><li v-for="number in uniquePrNumbers" :key="number">{{ number }}</li></ul></ReviewDisclosure>
                    </div>
                    <template v-else>
                        <div class="mt-5">
                            <SearchableSelect v-model="selectedPrId" :options="prOptions" label="Purchase Requisition yang disetujui" placeholder="Pilih dokumen PR" search-placeholder="Cari nomor PR, divisi, atau perusahaan…" :disabled="isLoadingQueue || isSubmitting" :loading="isLoadingQueue" required />
                            <p v-if="!isLoadingQueue && !prOptions.length" class="mt-3 text-sm text-amber-700">Belum ada PR dengan sisa kebutuhan. <RouterLink :to="{ name: 'user.purchasing.plans', query: { tab: 'pending' } }" class="underline">Kembali ke antrean PR</RouterLink></p>
                        </div>
                        <p v-if="isLoadingPrDetail" role="status" class="mt-4 text-sm text-slate-500">Memuat rincian PR…</p>
                        <div v-else-if="activePrInfo" class="mt-5 space-y-4">
                            <p v-if="activePrInfo.purpose" class="text-sm text-slate-700 break-words">{{ activePrInfo.purpose }}</p>
                            <dl class="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                <div><dt class="text-xs text-slate-400">Perusahaan & divisi</dt><dd class="mt-1 text-slate-700 break-words">{{ activePrInfo.company }}<span class="block mt-1 text-xs text-slate-500">{{ activePrInfo.division }}</span></dd></div>
                                <div><dt class="text-xs text-slate-400">Target kebutuhan</dt><dd class="mt-1 text-slate-700">{{ formatDate(activePrInfo.required_date) }}</dd></div>
                            </dl>
                            <ReviewDisclosure title="Detail PR & persetujuan" description="Pemohon, tanggal pengajuan, catatan dan riwayat persetujuan" @toggle="showWorkflow = $event.target.open">
                                <dl class="grid sm:grid-cols-2 gap-4 text-sm text-slate-600 mb-5">
                                    <div><dt class="text-xs text-slate-400">Pemohon</dt><dd class="mt-1 break-words">{{ activePrInfo.requesterName || '—' }}</dd><dd v-if="activePrInfo.requesterEmail" class="mt-1 break-all text-xs">{{ activePrInfo.requesterEmail }}</dd></div>
                                    <div><dt class="text-xs text-slate-400">Tanggal pengajuan</dt><dd class="mt-1">{{ formatDate(activePrInfo.request_date) }}</dd></div>
                                    <div><dt class="text-xs text-slate-400">Estimasi PR</dt><dd class="mt-1">{{ formatCurrency(activePrInfo.totalEstimatedAmount, activePrInfo.currency) }}</dd></div>
                                    <div v-if="activePrInfo.notes"><dt class="text-xs text-slate-400">Catatan PR</dt><dd class="mt-1 whitespace-pre-wrap break-words">{{ activePrInfo.notes }}</dd></div>
                                </dl>
                                <DocumentWorkflowTracker v-if="showWorkflow" :key="selectedPrId" document-type="purchase_requisition" :document-id="selectedPrId" title="Alur persetujuan PR" audit-trail-title="Riwayat persetujuan PR" />
                            </ReviewDisclosure>
                        </div>
                    </template>
                </section>

                <section class="form-section" aria-labelledby="method-title">
                    <h2 id="method-title" class="section-title"><span class="section-number">2</span>Metode pengadaan</h2>
                    <fieldset class="mt-5 grid sm:grid-cols-2 gap-3">
                        <legend class="sr-only">Pilih metode pengadaan</legend>
                        <label class="method-option" :class="{ selected: procurementMethod === 'direct_purchase' }">
                            <input v-model="procurementMethod" type="radio" name="procurement-method" value="direct_purchase" aria-label="Pembelian langsung" class="mt-1 size-4 shrink-0 accent-[#014baa]" />
                            <span class="min-w-0"><span class="flex items-center gap-2 text-sm font-medium text-slate-800"><ShoppingCart class="size-4 text-slate-400" />Pembelian langsung</span><span class="block mt-2 text-xs text-slate-500 leading-relaxed">Beli langsung ke supplier, toko, atau marketplace.</span></span>
                        </label>
                        <label class="method-option" :class="{ selected: procurementMethod === 'rfq' }">
                            <input v-model="procurementMethod" type="radio" name="procurement-method" value="rfq" aria-label="Tender RFQ" class="mt-1 size-4 shrink-0 accent-[#014baa]" />
                            <span class="min-w-0"><span class="flex items-center gap-2 text-sm font-medium text-slate-800"><Scale class="size-4 text-slate-400" />Tender RFQ</span><span class="block mt-2 text-xs text-slate-500 leading-relaxed">Minta dan bandingkan penawaran dari beberapa supplier.</span></span>
                        </label>
                    </fieldset>
                </section>

                <section ref="allocationSection" class="form-section allocation-section" aria-labelledby="allocation-title">
                    <div class="px-5 sm:px-6 pt-5 sm:pt-6 flex flex-wrap items-center justify-between gap-3">
                        <h2 id="allocation-title" class="section-title"><span class="section-number">3</span>Alokasi barang</h2>
                        <button type="button" @click="allocateAllFull" :disabled="!planItems.length || isLoadingQueue || isLoadingPrDetail" class="text-xs font-medium text-[#014baa] hover:underline disabled:opacity-40">Pilih semua & isi sisa kebutuhan</button>
                    </div>
                    <p class="px-5 sm:px-6 mt-3 mb-5 text-sm text-slate-500">Jumlah dapat dibagi ke beberapa rencana. Alokasikan sesuai kebutuhan saat ini.</p>
                    <p v-if="allocationError" role="alert" class="px-5 sm:px-6 pb-4 text-sm text-rose-600">{{ allocationError }}</p>
                    <p v-if="isLoadingQueue || isLoadingPrDetail" role="status" class="px-6 py-8 text-sm text-slate-500">Menyiapkan barang dari PR…</p>
                    <PlanAllocationItems v-else :items="planItems" :currency="activePrInfo?.currency || 'IDR'" @validate="validateItemQty" />
                </section>

                <ReviewDisclosure title="Catatan rencana (opsional)" :description="planNotes ? 'Catatan sudah ditambahkan' : 'Instruksi tambahan untuk tim pengadaan'">
                    <label for="plan-notes" class="block text-sm text-slate-600 mb-2">Catatan untuk tim pengadaan</label>
                    <textarea id="plan-notes" v-model="planNotes" rows="3" placeholder="Contoh: prioritaskan pengiriman sebelum tanggal kebutuhan." class="plan-input" />
                </ReviewDisclosure>
            </fieldset>

            <aside class="form-section space-y-5" aria-labelledby="summary-title">
                <h2 id="summary-title" class="text-base font-semibold text-slate-900">Ringkasan rencana</h2>
                <dl class="grid gap-5 sm:grid-cols-3 text-sm">
                    <div><dt class="text-xs text-slate-400">Metode</dt><dd class="mt-1 text-slate-700">{{ procurementMethod === 'rfq' ? 'Tender RFQ' : 'Pembelian langsung' }}</dd></div>
                    <div><dt class="text-xs text-slate-400">Barang dialokasikan</dt><dd class="mt-1 text-slate-700">{{ totalAllocatedItems }} dari {{ planItems.length }} barang</dd></div>
                    <div><dt class="text-xs text-slate-500">Total estimasi rencana</dt><dd class="mt-2 text-xl font-semibold tracking-tight text-slate-900 break-words tabular-nums">{{ formatCurrency(totalEstimatedPlanAmount, activePrInfo?.currency || 'IDR') }}</dd><dd v-if="activePrInfo?.currency && activePrInfo.currency !== 'IDR'" class="mt-1 text-xs text-slate-400">≈ {{ formatCurrency(totalEstimatedPlanAmount * activePrInfo.exchange_rate, 'IDR') }}</dd></div>
                </dl>
                <p class="text-xs text-slate-500 leading-relaxed">Draft dapat diedit sebelum diaktifkan. Aktivasi mengunci alokasi barang untuk proses pengadaan berikutnya.</p>
                <div class="flex flex-col sm:flex-row-reverse gap-3 border-t border-slate-100 pt-5">
                    <button type="button" @click="handleSubmit(true)" :disabled="isSubmitting || isLoadingQueue || isLoadingPrDetail || !planItems.length" class="plan-action border border-transparent bg-[#014baa] text-white hover:bg-blue-800">{{ isSubmitting ? 'Memproses…' : 'Simpan & aktifkan' }}</button>
                    <button type="submit" :disabled="isSubmitting || isLoadingQueue || isLoadingPrDetail || !planItems.length" class="plan-action border border-blue-200 bg-white text-[#014baa] hover:bg-blue-50">Simpan draft</button>
                    <RouterLink :to="{ name: 'user.purchasing.plans' }" class="plan-action inline-flex items-center justify-center border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200">Batal</RouterLink>
                </div>
            </aside>
        </form>
    </div>
</template>

<style scoped>
.plan-create { min-width: 0; }
.form-section { min-width: 0; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: white; }
.section-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: #0f172a; }
.section-number { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #f1f5f9; color: #64748b; font-size: 12px; font-weight: 500; flex-shrink: 0; }
.method-option { display: flex; align-items: flex-start; gap: 10px; padding: 18px 16px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; }
.method-option.selected { border-color: #014baa; background: #f5f9ff; }
.method-option:focus-within { outline: 2px solid #014baa; outline-offset: 2px; }
.form-section.allocation-section { padding: 0; overflow: hidden; }
.plan-input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; resize: vertical; }
.plan-action { width: 100%; padding: 11px 16px; border-radius: 10px; font-size: 14px; font-weight: 500; }
@media (min-width: 640px) { .plan-action { width: auto; } }
.plan-create :deep(button) { cursor: pointer; }
.plan-create :deep(button:disabled) { opacity: .5; cursor: not-allowed; }
.plan-create :deep(button:focus-visible), .plan-create :deep(a:focus-visible), .plan-input:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
@media (max-width: 639px) { .form-section { padding: 20px 16px; } }
</style>
