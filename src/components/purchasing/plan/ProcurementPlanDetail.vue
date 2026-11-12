<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { showProcurementPlan, activateProcurementPlan, cancelProcurementPlan } from '../../../services/procurementPlanServices.js'
import { showLoading, showSuccess, showError, showConfirm, showPrompt } from '../../../utils/swal.js'
import { formatCurrency } from '../../../utils/stringUtils.js'
import BaseTable from '../../ui/BaseTable.vue'
import StatusBadge from '../../ui/StatusBadge.vue'
import ReviewDisclosure from '../../ui/ReviewDisclosure.vue'
import DocumentWorkflowTracker from '../../approval/DocumentWorkflowTracker.vue'
import { ArrowRight, Play, Ban, ExternalLink, RefreshCw } from '@lucide/vue'

const props = defineProps({ planId: { type: [Number, String], required: true } })
const emit = defineEmits(['changed'])
const plan = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const isActing = ref(false)
const approvalOpened = ref(false)
let requestVersion = 0
const fetchPlan = async () => {
    const version = ++requestVersion
    isLoading.value = true
    loadError.value = ''
    try {
        const response = await showProcurementPlan(props.planId)
        if (version === requestVersion) {
            plan.value = response.data || null
            if (!plan.value) loadError.value = 'Rencana pengadaan tidak ditemukan.'
        }
    } catch (error) {
        if (version === requestVersion) loadError.value = error.response?.data?.message || 'Detail rencana belum dapat dimuat. Silakan coba lagi.'
    } finally {
        if (version === requestVersion) isLoading.value = false
    }
}
watch(() => props.planId, () => {
    plan.value = null
    approvalOpened.value = false
    fetchPlan()
}, { immediate: true })

const isRfq = computed(() => plan.value?.procurement_method === 'rfq')
const methodLabel = computed(() => isRfq.value ? 'Tender RFQ' : plan.value?.procurement_method === 'direct_purchase' ? 'Pembelian langsung' : '—')
const sourcePrs = computed(() => {
    if (plan.value?.source_prs?.length) return plan.value.source_prs
    const unique = new Map()
    for (const item of plan.value?.items || []) {
        const pr = item.purchase_requisition_item?.purchase_requisition
        if (pr && !unique.has(pr.id)) unique.set(pr.id, pr)
    }
    if (!unique.size && plan.value?.purchase_requisition) {
        const pr = plan.value.purchase_requisition
        unique.set(pr.id, pr)
    }
    return [...unique.values()]
})
const prId = computed(() => plan.value?.purchase_requisition_id || plan.value?.purchase_requisition?.id)
const currency = computed(() => plan.value?.purchase_requisition?.currency || 'IDR')
const lineAmount = item => Number(item.planned_estimated_subtotal ?? (Number(item.planned_quantity || 0) * Number(item.purchase_requisition_item?.estimated_price || 0)))
const totalAmount = computed(() => (plan.value?.items || []).reduce((sum, item) => sum + lineAmount(item), 0))
const columns = [
    { key: 'item', label: 'Barang / jasa', width: '46%' },
    { key: 'qty', label: 'Alokasi', align: 'right', width: '16%' },
    { key: 'price', label: 'Harga estimasi', align: 'right', width: '19%' },
    { key: 'subtotal', label: 'Subtotal', align: 'right', width: '19%' }
]
const formatDate = (value, withTime = false) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(date)
}
const itemName = item => item.purchase_requisition_item?.item_name || item.purchase_requisition_item?.item?.name || 'Barang tanpa nama'
const itemUnit = item => item.purchase_requisition_item?.unit?.code || item.purchase_requisition_item?.unit_code || 'Unit'

const handleActivate = async () => {
    if (isActing.value || !plan.value || plan.value.status !== 'draft') return
    const confirmed = await showConfirm('Aktifkan Rencana Pengadaan?', `Rencana ${plan.value.pp_number} akan diaktifkan dan alokasi item akan dikunci. Status PR terkait akan berubah menjadi In Procurement.`, 'Ya, Aktifkan', 'Batal', '#014baa')
    if (!confirmed) return
    isActing.value = true
    try {
        showLoading('Mengaktifkan rencana...')
        await activateProcurementPlan(plan.value.id)
        showSuccess('Berhasil!', `Rencana pengadaan ${plan.value.pp_number} berhasil diaktifkan.`)
        emit('changed')
        await fetchPlan()
    } catch (error) {
        showError('Gagal!', error.response?.data?.message || 'Gagal mengaktifkan rencana pengadaan.', error)
    } finally { isActing.value = false }
}
const handleCancel = async () => {
    if (isActing.value || !plan.value || !['draft', 'active'].includes(plan.value.status)) return
    const { value: reason, isConfirmed } = await showPrompt({
        title: 'Batalkan Rencana Pengadaan?', text: `Masukkan alasan pembatalan untuk rencana ${plan.value.pp_number}:`,
        placeholder: 'Tuliskan alasan pembatalan rencana ini...', confirmText: 'Ya, Batalkan Rencana', cancelText: 'Tutup', isDestructive: true,
        validator: value => !value?.trim() ? 'Alasan pembatalan wajib diisi!' : undefined
    })
    if (!isConfirmed) return
    isActing.value = true
    try {
        showLoading('Membatalkan rencana...')
        await cancelProcurementPlan(plan.value.id, reason.trim())
        showSuccess('Berhasil!', `Rencana pengadaan ${plan.value.pp_number} telah dibatalkan.`)
        emit('changed')
        await fetchPlan()
    } catch (error) {
        showError('Gagal!', error.response?.data?.message || 'Gagal membatalkan rencana pengadaan.', error)
    } finally { isActing.value = false }
}
</script>

<template>
    <div class="plan-detail min-w-0 space-y-6">
        <div v-if="isLoading" class="py-16 text-center text-sm text-slate-500" role="status"><RefreshCw class="mx-auto mb-3 size-6 animate-spin text-[#014BAA]" />Memuat detail rencana…</div>
        <div v-else-if="loadError" class="rounded-xl border border-slate-200 p-8 text-center" role="alert">
            <p class="text-sm text-slate-600">{{ loadError }}</p>
            <button type="button" class="secondary mt-4" @click="fetchPlan">Coba lagi</button>
        </div>
        <template v-else-if="plan">
            <header class="space-y-4">
                <div class="flex flex-wrap items-center gap-3">
                    <h1 class="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{{ plan.pp_number }}</h1>
                    <StatusBadge :status="plan.status" :dot="false" />
                </div>
                <p class="text-sm leading-relaxed text-slate-500">{{ methodLabel }}<span class="mx-2 text-slate-300">/</span>{{ sourcePrs.length }} PR sumber<span class="mx-2 text-slate-300">/</span>{{ plan.items?.length || 0 }} barang / jasa</p>
                <p class="text-xs leading-relaxed text-slate-400">Dibuat {{ formatDate(plan.created_at, true) }} oleh {{ plan.created_by_user?.name || '—' }}</p>
            </header>

            <div class="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-800">{{ plan.status === 'draft' ? 'Siap untuk diaktifkan' : plan.status === 'active' ? 'Lanjutkan proses pengadaan' : plan.status === 'completed' ? 'Pengadaan selesai' : plan.status === 'cancelled' ? 'Rencana telah dibatalkan' : 'Status rencana' }}</p>
                    <p class="mt-1 text-xs leading-relaxed text-slate-500">{{ plan.status === 'draft' ? 'Periksa alokasi barang sebelum mengunci rencana.' : plan.status === 'active' ? (isRfq ? 'Gunakan alokasi ini untuk meminta penawaran supplier.' : 'Gunakan alokasi ini untuk pembelian langsung.') : 'Rincian alokasi dan riwayat tetap tersedia di bawah.' }}</p>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
                    <button v-if="['draft', 'active'].includes(plan.status)" type="button" :disabled="isActing" class="danger" @click="handleCancel"><Ban class="size-4" />Batalkan rencana</button>
                    <button v-if="plan.status === 'draft'" type="button" :disabled="isActing" class="primary" @click="handleActivate"><Play class="size-4" />Aktifkan rencana</button>
                    <RouterLink v-if="plan.status === 'active' && ['rfq', 'direct_purchase'].includes(plan.procurement_method)" :to="{ name: isRfq ? 'user.purchasing.rfq.create' : 'user.purchasing.direct.create', query: { plan_id: plan.id } }" class="primary">{{ isRfq ? 'Buat Tender RFQ' : 'Buat Direct Purchase' }}<ArrowRight class="size-4" /></RouterLink>
                </div>
            </div>

            <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Alokasi barang dan jasa">
                <div class="flex items-center justify-between gap-3 px-5 py-5"><h2 class="text-sm font-medium text-slate-900">Alokasi barang & jasa</h2><span class="text-xs text-slate-400">{{ plan.items?.length || 0 }} item</span></div>
                <p class="px-5 pb-3 text-xs text-slate-400 sm:hidden">Geser tabel untuk melihat harga dan subtotal.</p>
                <BaseTable :columns="columns" min-width="650px" layout="fixed" label="Alokasi rencana pengadaan">
                    <tr v-for="item in plan.items" :key="item.id">
                        <td>
                            <p class="font-medium text-slate-800 break-words">{{ itemName(item) }}</p>
                            <p v-if="item.purchase_requisition_item?.detail_name" class="mt-1 text-xs text-slate-500 break-words">{{ item.purchase_requisition_item.detail_name }}</p>
                            <p class="mt-1 text-xs text-slate-400">{{ item.purchase_requisition_item?.is_custom_item ? 'Non-katalog' : item.purchase_requisition_item?.item_code }}<span v-if="sourcePrs.length > 1"> · {{ item.purchase_requisition_item?.purchase_requisition?.pr_number || 'PR #' + item.purchase_requisition_item?.purchase_requisition_id }}</span></p>
                            <details v-if="item.notes || item.purchase_requisition_item?.reference_url" class="mt-2 text-xs text-slate-500">
                                <summary class="cursor-pointer text-[#014BAA]">Catatan & referensi</summary>
                                <p v-if="item.notes" class="mt-2 whitespace-pre-wrap break-words">{{ item.notes }}</p>
                                <a v-if="item.purchase_requisition_item?.reference_url" :href="item.purchase_requisition_item.reference_url" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-[#014BAA]">Lihat referensi<ExternalLink class="size-3" /></a>
                            </details>
                        </td>
                        <td class="text-right tabular-nums"><p class="font-medium">{{ Number(item.planned_quantity || 0).toLocaleString('id-ID') }}</p><p class="mt-1 text-xs text-slate-400">{{ itemUnit(item) }}</p></td>
                        <td class="text-right tabular-nums">{{ formatCurrency(item.purchase_requisition_item?.estimated_price, currency) }}</td>
                        <td class="text-right font-medium tabular-nums">{{ formatCurrency(lineAmount(item), currency) }}</td>
                    </tr>
                    <tr v-if="!plan.items?.length"><td colspan="4" class="text-center text-slate-500">Belum ada barang yang dialokasikan.</td></tr>
                </BaseTable>
                <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-5">
                    <p class="text-xs text-slate-500">Total estimasi rencana <span class="text-slate-400">({{ currency }})</span></p>
                    <div class="text-right"><p class="text-lg font-semibold tabular-nums text-slate-900">{{ formatCurrency(totalAmount, currency) }}</p><p v-if="currency !== 'IDR'" class="mt-1 text-xs text-slate-400">≈ {{ formatCurrency(totalAmount * (Number(plan.purchase_requisition?.exchange_rate) || 1), 'IDR') }}</p></div>
                </div>
            </section>

            <ReviewDisclosure title="Sumber purchase requisition" :description="`${sourcePrs.length} dokumen · pemohon, kebutuhan, dan tujuan pengajuan`">
                <div class="divide-y divide-slate-100">
                    <article v-for="pr in sourcePrs" :key="pr.id" class="space-y-4 py-4 first:pt-0 last:pb-0">
                        <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="text-sm font-medium text-slate-900">{{ pr.pr_number }}</h3><StatusBadge v-if="pr.status" :status="pr.status" :dot="false" /></div>
                        <dl class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            <div><dt>Pemohon</dt><dd>{{ pr.requester_name || pr.requester?.name || pr.requester?.employee?.name || '—' }}</dd></div>
                            <div><dt>Perusahaan / divisi</dt><dd>{{ pr.company_name || pr.company?.name || '—' }} / {{ pr.division_name || pr.division?.name || '—' }}</dd></div>
                            <div><dt>Target kebutuhan</dt><dd>{{ formatDate(pr.required_date) }}</dd></div>
                            <div><dt>Tanggal pengajuan</dt><dd>{{ formatDate(pr.request_date) }}</dd></div>
                            <div v-if="pr.total_estimated_amount != null"><dt>Estimasi seluruh PR</dt><dd>{{ formatCurrency(pr.total_estimated_amount, pr.currency || currency) }}</dd></div>
                            <div v-if="pr.items_count"><dt>Barang dialokasikan</dt><dd>{{ pr.items_count }} item</dd></div>
                        </dl>
                        <p v-if="pr.purpose" class="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{{ pr.purpose }}</p>
                    </article>
                    <p v-if="!sourcePrs.length" class="text-sm text-slate-500">Informasi PR sumber belum tersedia.</p>
                </div>
            </ReviewDisclosure>
            <ReviewDisclosure v-if="prId" title="Persetujuan PR terkait" :description="sourcePrs.length > 1 ? 'Riwayat persetujuan PR utama; bukan keseluruhan PR konsolidasi' : 'Lihat alur dan riwayat keputusan persetujuan'" @toggle="approvalOpened ||= $event.target.open">
                <DocumentWorkflowTracker v-if="approvalOpened" document-type="purchase_requisition" :document-id="prId" title="Alur persetujuan PR" audit-trail-title="Riwayat keputusan" />
            </ReviewDisclosure>
            <ReviewDisclosure title="Catatan & riwayat rencana" description="Catatan pengadaan dan waktu perubahan status">
                <p class="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{{ plan.notes || 'Tidak ada catatan khusus.' }}</p>
                <dl class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div><dt>Dibuat</dt><dd>{{ formatDate(plan.created_at, true) }} · {{ plan.created_by_user?.name || '—' }}</dd></div>
                    <div><dt>Diaktifkan</dt><dd>{{ formatDate(plan.activated_at, true) }}<span v-if="plan.activated_by_user?.name"> · {{ plan.activated_by_user.name }}</span></dd></div>
                    <div v-if="plan.completed_at"><dt>Selesai</dt><dd>{{ formatDate(plan.completed_at, true) }}</dd></div>
                </dl>
            </ReviewDisclosure>
        </template>
    </div>
</template>

<style scoped>
.primary, .secondary, .danger { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.primary { background: #014baa; color: white; }
.primary:hover { background: #003d8c; }
.secondary { background: white; border: 1px solid #e2e8f0; color: #475569; }
.danger { background: white; border: 1px solid #fecdd3; color: #be123c; }
.danger:hover { background: #fff1f2; }
button:disabled { opacity: .5; cursor: wait; }
dt { color: #94a3b8; font-size: 12px; margin-bottom: 5px; }
dd { color: #334155; overflow-wrap: anywhere; }
button:focus-visible, a:focus-visible, summary:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
</style>
