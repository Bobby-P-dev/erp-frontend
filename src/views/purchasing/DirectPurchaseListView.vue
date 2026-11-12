<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import {
    getDirectPurchases,
    submitDirectPurchaseForPayment,
    cancelDirectPurchase
} from '../../services/directPurchaseServices.js'
import { getProcurementPlans } from '../../services/procurementPlanServices.js'
import { showLoading, showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'

import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import TableDocumentCell from '../../components/ui/TableDocumentCell.vue'
import ProcurementPlanDetailModal from '../../components/purchasing/plan/ProcurementPlanDetailModal.vue'
import DirectPurchaseDetailModal from '../../components/purchasing/direct/detail/DirectPurchaseDetailModal.vue'
import ConsolidatedPrModal from '../../components/purchasing/plan/list/ConsolidatedPrModal.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

import {
    RefreshCw,
    Eye,
    Ban,
    Store,
    Building2,
    Layers,
    CreditCard,
    Pencil,
    ArrowRight
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// Primary Tab Navigation ('queue' for Rencana Siap Eksekusi, 'history' for Riwayat Transaksi)
const activeMainTab = ref(route.query.tab === 'history' ? 'history' : 'queue')
const selectedPlanId = ref(null)
const selectedPurchaseId = ref(null)
const sourcePlan = ref(null)
const isSourceOpen = ref(false)
const sourceCount = plan => plan?.source_prs_count ?? (plan?.source_prs?.length || plan?.pr_numbers?.length || (plan?.purchase_requisition ? 1 : 0))
const openPlan = plan => { isSourceOpen.value = false; selectedPlanId.value = plan.id }
const openSources = plan => { sourcePlan.value = plan; isSourceOpen.value = true }

// ==========================================
// STATE TAB 1: RENCANA SIAP EKSEKUSI (QUEUE)
// ==========================================
const queuePlans = ref([])
const isLoadingQueue = ref(false)
const queueSearch = ref('')
const onlyWithQuota = ref(true)
const queuePagination = ref({ current_page: 1, last_page: 1, total: 0, per_page: 50 })
let queueRequest = 0

const queueColumns = [
    { key: 'plan', label: 'Rencana pengadaan', width: '22%' },
    { key: 'source', label: 'PR sumber', width: '21%' },
    { key: 'company', label: 'Perusahaan / divisi', width: '23%' },
    { key: 'quota', label: 'Sisa kebutuhan', width: '15%' },
    { key: 'actions', label: 'Aksi', width: '19%', align: 'right' }
]

const fetchQueuePlans = async (page = queuePagination.value.current_page) => {
    const request = ++queueRequest
    try {
        isLoadingQueue.value = true
        const response = await getProcurementPlans({
            status: 'active',
            procurement_method: 'direct_purchase'
        }, page, 50)
        if (request !== queueRequest) return
        queuePlans.value = response.data || []
        queuePagination.value = response.meta || { current_page: 1, last_page: 1, total: queuePlans.value.length, per_page: 50 }
    } catch (error) {
        if (request === queueRequest) showError('Gagal Memuat Antrean!', 'Terjadi kesalahan saat memuat daftar rencana pengadaan siap eksekusi.', error)
    } finally {
        if (request === queueRequest) isLoadingQueue.value = false
    }
}

const hasRemainingQuota = (plan) => {
    return plan.has_remaining_quota !== false
}

const getRemainingQuotaCount = (plan) => {
    if (plan.unallocated_items_count !== undefined && plan.unallocated_items_count !== null) {
        return plan.unallocated_items_count
    }
    return null
}
const companyName = plan => plan.company?.name || plan.purchase_requisition?.company?.name || plan.source_prs?.[0]?.company_name || '—'
const divisionName = plan => [...new Set((plan.source_prs || []).map(pr => pr.division_name).filter(Boolean))].join(', ') || plan.purchase_requisition?.division?.name || '—'
const sourceNumber = plan => plan.purchase_requisition?.pr_number || plan.source_prs?.[0]?.pr_number || plan.pr_numbers?.[0] || '—'

const filteredQueuePlans = computed(() => {
    let list = queuePlans.value || []
    
    if (onlyWithQuota.value) {
        list = list.filter(p => hasRemainingQuota(p))
    }
    
    if (queueSearch.value.trim()) {
        const q = queueSearch.value.toLowerCase().trim()
        list = list.filter(p => {
            const ppNum = (p.pp_number || '').toLowerCase()
            const prNum = (p.purchase_requisition?.pr_number || '').toLowerCase()
            const comp = (p.company?.name || p.purchase_requisition?.company?.name || '').toLowerCase()
            const div = (p.purchase_requisition?.division?.name || '').toLowerCase()
            const req = (p.purchase_requisition?.requester?.name || '').toLowerCase()
            const sources = (p.source_prs || []).flatMap(pr => [pr.pr_number, pr.company_name, pr.division_name, pr.requester_name]).filter(Boolean).join(' ').toLowerCase()
            return ppNum.includes(q) || prNum.includes(q) || comp.includes(q) || div.includes(q) || req.includes(q) || sources.includes(q) || (p.pr_numbers || []).join(' ').toLowerCase().includes(q)
        })
    }
    
    return list
})

const handleExecutePurchase = (plan) => {
    router.push({
        name: 'user.purchasing.direct.create',
        query: { plan_id: plan.id }
    })
}

// ==========================================
// STATE TAB 2: RIWAYAT TRANSAKSI DIRECT PURCHASE
// ==========================================
const directPurchases = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const channelFilter = ref('')
let searchTimeout = null
let historyRequest = 0

const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10
})

const tableColumns = [
    { key: 'purchase', label: 'Pembelian', width: '19%' },
    { key: 'plan', label: 'Rencana / PR sumber', width: '16%' },
    { key: 'merchant', label: 'Rekanan / saluran', width: '17%' },
    { key: 'amount', label: 'Total biaya', width: '16%', align: 'right' },
    { key: 'status', label: 'Status', width: '16%' },
    { key: 'actions', label: 'Aksi', width: '16%', align: 'right' }
]

// Fetch Executed Direct Purchases
const fetchDirectPurchases = async (search = '', page = 1) => {
    const request = ++historyRequest
    try {
        isLoading.value = true
        const filters = {
            per_page: pagination.value.per_page
        }
        if (statusFilter.value) filters.status = statusFilter.value
        if (channelFilter.value) filters.purchase_channel = channelFilter.value

        const response = await getDirectPurchases(search, page, filters)
        if (request !== historyRequest) return
        
        directPurchases.value = response.data || []
        
        if (response.meta) {
            pagination.value = {
                current_page: response.meta.current_page || 1,
                last_page: response.meta.last_page || 1,
                from: response.meta.from || 0,
                to: response.meta.to || 0,
                total: response.meta.total || 0,
                per_page: response.meta.per_page || 10
            }
        }
    } catch (error) {
        if (request === historyRequest) showError('Gagal Mengambil Data!', 'Terjadi kesalahan saat memuat daftar Direct Purchase.', error)
    } finally {
        if (request === historyRequest) isLoading.value = false
    }
}

// Watchers
watch(searchQuery, (newVal) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchDirectPurchases(newVal, 1)
    }, 400)
})

watch([statusFilter, channelFilter], () => {
    clearTimeout(searchTimeout)
    fetchDirectPurchases(searchQuery.value, 1)
})

watch(activeMainTab, (newTab) => {
    router.replace({ query: { ...route.query, tab: newTab } })
})
watch(() => route.query.tab, tab => { activeMainTab.value = tab === 'history' ? 'history' : 'queue' })
onBeforeUnmount(() => { clearTimeout(searchTimeout); historyRequest++; queueRequest++ })

const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.value.last_page) {
        fetchDirectPurchases(searchQuery.value, newPage)
    }
}

const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

const getChannelInfo = (dp) => {
    switch (dp.purchase_channel) {
        case 'marketplace':
            return {
                label: dp.marketplace_name || 'Marketplace',
                merchant: dp.merchant_name || 'Toko Online',
                badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/90',
                icon: Store
            }
        case 'direct_supplier':
            return {
                label: 'Supplier Resmi',
                merchant: dp.supplier?.name || 'Rekanan Terdaftar',
                badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
                icon: Building2
            }
        case 'retail_store':
            return {
                label: 'Toko Retail',
                merchant: dp.merchant_name || 'Toko Fisik',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
                icon: Store
            }
        default:
            return {
                label: dp.purchase_channel || 'Lainnya',
                merchant: dp.merchant_name || '-',
                badgeClass: 'bg-slate-50 text-slate-700 border-slate-200/90',
                icon: Store
            }
    }
}

// Action Handlers
const handleSubmitForPayment = async (dp) => {
    const confirmed = await showConfirm(
        'Ajukan Pembayaran?',
        `Direct Purchase ${dp.dp_number} senilai ${formatCurrency(dp.grand_total, dp.currency)} akan diajukan ke bagian keuangan untuk proses pembayaran.`,
        'Ya, Ajukan Pembayaran',
        'Batal',
        '#2563eb'
    )
    if (!confirmed) return

    try {
        showLoading('Mengajukan pembayaran...')
        await submitDirectPurchaseForPayment(dp.id)
        showSuccess('Berhasil!', `Direct Purchase ${dp.dp_number} berhasil diajukan untuk pembayaran.`)
        fetchDirectPurchases(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal mengajukan pembayaran.'
        showError('Gagal!', errorMsg, error)
    }
}

const handleCancel = async (dp) => {
    const { value: reason, isConfirmed } = await showPrompt({
        title: 'Batalkan Pembelian Langsung?',
        text: `Masukkan alasan pembatalan untuk ${dp.dp_number}:`,
        placeholder: 'Tuliskan alasan pembatalan pembelian ini...',
        confirmText: 'Ya, Batalkan Pembelian',
        cancelText: 'Tutup',
        isDestructive: true,
        validator: (value) => {
            if (!value?.trim()) {
                return 'Alasan pembatalan wajib diisi!'
            }
        }
    })

    if (!isConfirmed) return

    try {
        showLoading('Membatalkan pembelian...')
        await cancelDirectPurchase(dp.id, reason)
        showSuccess('Berhasil!', `Direct Purchase ${dp.dp_number} telah dibatalkan.`)
        fetchDirectPurchases(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal membatalkan transaksi.'
        showError('Gagal!', errorMsg, error)
    }
}

onMounted(() => {
    fetchQueuePlans()
    fetchDirectPurchases()
})
</script>

<template>
    <div class="direct-purchases min-w-0 space-y-6">
        <BaseBreadcrumb :items="[{ label: 'Purchasing', to: { name: 'user.purchasing' } }, { label: 'Pembelian langsung' }]" />
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
                <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Pembelian langsung</h1>
                <p class="mt-2 text-sm leading-relaxed text-slate-500">Realisasikan kebutuhan dari rencana pengadaan dan pantau transaksi pembeliannya.</p>
            </div>
            <RouterLink :to="{ name: 'user.purchasing.plans' }" class="secondary self-start shrink-0"><Layers class="size-4" />Rencana pengadaan</RouterLink>
        </div>

        <div class="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200" aria-label="Tampilan pembelian langsung">
            <button v-for="tab in [{ id: 'queue', label: 'Siap dibeli' }, { id: 'history', label: 'Riwayat pembelian' }]" :key="tab.id" type="button" :aria-pressed="activeMainTab === tab.id" @click="activeMainTab = tab.id" class="-mb-px border-b-2 pb-3 text-sm font-medium" :class="activeMainTab === tab.id ? 'border-[#014BAA] text-[#014BAA]' : 'border-transparent text-slate-500 hover:text-slate-900'">{{ tab.label }}</button>
        </div>

        <section v-if="activeMainTab === 'queue'" class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs" aria-label="Rencana siap dibeli">
            <div class="border-b border-slate-100 p-4 sm:p-5">
                <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div class="w-full lg:max-w-md"><SearchInput v-model="queueSearch" label="Cari rencana siap dibeli" placeholder="Cari rencana, PR, perusahaan, atau divisi…" compact clearable /></div>
                    <div class="flex flex-wrap items-center gap-3">
                        <label class="flex items-center gap-2 text-xs text-slate-600"><input v-model="onlyWithQuota" type="checkbox" class="size-4 rounded border-slate-300 accent-[#014BAA]" />Hanya yang masih bisa dibeli</label>
                        <button type="button" class="refresh" aria-label="Segarkan rencana siap dibeli" :disabled="isLoadingQueue" @click="fetchQueuePlans()"><RefreshCw class="size-4" :class="{ 'animate-spin': isLoadingQueue }" /></button>
                    </div>
                </div>
                <div class="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
                    <p>Pilih rencana untuk membuat transaksi pembelian.</p>
                    <span>{{ isLoadingQueue ? 'Memuat…' : `${filteredQueuePlans.length} rencana ditampilkan` }}</span>
                </div>
                <p v-if="queuePagination.last_page > 1" class="mt-2 text-xs text-slate-500">Pencarian dan filter ketersediaan berlaku pada halaman ini. Gunakan pagination untuk melihat rencana lainnya.</p>
            </div>
            <p class="px-5 pt-3 text-xs text-slate-400 lg:hidden">Geser tabel untuk melihat seluruh kolom.</p>
            <BaseTable :columns="queueColumns" min-width="1020px" layout="fixed" label="Antrean pembelian langsung" :busy="isLoadingQueue">
                <tr v-if="isLoadingQueue"><td :colspan="queueColumns.length" class="py-14 text-center text-slate-500">Memuat rencana siap dibeli…</td></tr>
                <tr v-else-if="!filteredQueuePlans.length"><td :colspan="queueColumns.length" class="py-14 text-center">
                    <p class="font-medium text-slate-800">{{ queueSearch || queuePlans.length ? 'Tidak ada rencana yang cocok' : 'Belum ada rencana siap dibeli' }}</p>
                    <p class="mt-2 text-xs text-slate-500">{{ queueSearch || queuePlans.length ? 'Ubah pencarian atau nonaktifkan filter ketersediaan.' : 'Siapkan rencana pembelian langsung dari PR yang telah disetujui.' }}</p>
                    <button v-if="queueSearch || queuePlans.length" type="button" class="secondary mt-4" @click="queueSearch = ''; onlyWithQuota = false">Reset filter</button>
                    <RouterLink v-else :to="{ name: 'user.purchasing.plans' }" class="secondary mt-4">Lihat rencana pengadaan</RouterLink>
                </td></tr>
                <tr v-else v-for="plan in filteredQueuePlans" :key="plan.id">
                    <td><TableDocumentCell :number="plan.pp_number || 'PP #' + plan.id" :kind="formatDate(plan.created_at)" @open="openPlan(plan)" /></td>
                    <td>
                        <button v-if="sourceCount(plan) > 1" type="button" class="text-left text-sm font-medium text-[#014BAA] hover:underline" @click="openSources(plan)">{{ sourceCount(plan) }} PR terkonsolidasi</button>
                        <p v-else class="break-words text-sm text-slate-700">{{ sourceNumber(plan) }}</p>
                        <p class="mt-1 truncate text-xs text-slate-400" :title="plan.purchase_requisition?.purpose || plan.source_prs?.[0]?.purpose">{{ plan.purchase_requisition?.purpose || plan.source_prs?.[0]?.purpose || '—' }}</p>
                    </td>
                    <td><p class="break-words text-sm text-slate-700">{{ companyName(plan) }}</p><p class="mt-1 break-words text-xs text-slate-400">{{ divisionName(plan) }}</p></td>
                    <td><p class="text-sm font-medium" :class="hasRemainingQuota(plan) ? 'text-slate-800' : 'text-slate-400'">{{ !hasRemainingQuota(plan) ? 'Sudah dialokasikan' : getRemainingQuotaCount(plan) == null ? 'Belum tersedia' : `${getRemainingQuotaCount(plan)} item tersisa` }}</p><p class="mt-1 text-xs text-slate-400">{{ plan.items_count ?? plan.items?.length ?? '—' }} item dalam rencana</p></td>
                    <td class="text-right"><button v-if="hasRemainingQuota(plan)" type="button" class="primary" :aria-label="`Beli dari ${plan.pp_number || plan.id}`" @click="handleExecutePurchase(plan)">Buat pembelian<ArrowRight class="size-3.5" /></button><span v-else class="text-xs text-slate-400">Tidak ada sisa kebutuhan</span></td>
                </tr>
            </BaseTable>
            <Pagination :pagination="queuePagination" @page-change="fetchQueuePlans($event)" />
        </section>

        <section v-else class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs" aria-label="Riwayat pembelian">
            <div class="border-b border-slate-100 p-4 sm:p-5">
                <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div class="w-full lg:max-w-md"><SearchInput v-model="searchQuery" label="Cari riwayat pembelian" placeholder="Cari nomor pembelian, toko, atau catatan…" compact clearable /></div>
                    <div class="flex flex-wrap items-center gap-2">
                        <select v-model="channelFilter" aria-label="Saluran pembelian" class="filter-select"><option value="">Semua saluran</option><option value="marketplace">Marketplace</option><option value="direct_supplier">Supplier resmi</option><option value="retail_store">Toko retail</option></select>
                        <select v-model="statusFilter" aria-label="Status pembelian" class="filter-select"><option value="">Semua status</option><option value="draft">Draft</option><option value="ready_for_payment">Siap dibayar</option><option value="paid">Telah dibayar</option><option value="partially_received">Diterima sebagian</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select>
                        <button type="button" class="refresh" aria-label="Segarkan riwayat pembelian" :disabled="isLoading" @click="fetchDirectPurchases(searchQuery, pagination.current_page)"><RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" /></button>
                    </div>
                </div>
                <p class="mt-4 text-right text-xs text-slate-400">{{ isLoading ? 'Memuat…' : `${pagination.total} hasil` }}</p>
            </div>
            <p class="px-5 pt-3 text-xs text-slate-400 lg:hidden">Geser tabel untuk melihat seluruh kolom.</p>
            <BaseTable :columns="tableColumns" min-width="1180px" layout="fixed" label="Transaksi pembelian langsung" :busy="isLoading">
                <tr v-if="isLoading"><td :colspan="tableColumns.length" class="py-14 text-center text-slate-500">Memuat riwayat pembelian…</td></tr>
                <tr v-else-if="!directPurchases.length"><td :colspan="tableColumns.length" class="py-14 text-center">
                    <p class="font-medium text-slate-800">{{ searchQuery || statusFilter || channelFilter ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi pembelian' }}</p>
                    <p class="mt-2 text-xs text-slate-500">{{ searchQuery || statusFilter || channelFilter ? 'Coba ubah kata kunci, saluran, atau status pembelian.' : 'Pilih rencana pada tab Siap dibeli untuk membuat pembelian.' }}</p>
                    <button type="button" class="secondary mt-4" @click="activeMainTab = 'queue'">Lihat rencana siap dibeli</button>
                </td></tr>
                <tr v-else v-for="dp in directPurchases" :key="dp.id">
                    <td><TableDocumentCell :number="dp.dp_number || 'DP #' + dp.id" :kind="formatDate(dp.created_at)" @open="selectedPurchaseId = dp.id" /><p class="mt-1 text-xs text-slate-400">{{ dp.items_count ?? dp.items?.length ?? '—' }} item</p></td>
                    <td><p class="break-words text-sm text-slate-700">{{ dp.procurement_plan?.pp_number || (dp.procurement_plan_id ? 'PP #' + dp.procurement_plan_id : '—') }}</p><p class="mt-1 break-words text-xs text-slate-400">{{ dp.procurement_plan?.purchase_requisition?.pr_number || dp.procurement_plan?.pr_numbers?.join(', ') || '—' }}</p></td>
                    <td><p class="break-words text-sm text-slate-700">{{ getChannelInfo(dp).merchant }}</p><p class="mt-1 text-xs text-slate-400">{{ getChannelInfo(dp).label }}</p></td>
                    <td class="text-right tabular-nums"><p class="text-sm font-medium text-slate-800">{{ formatCurrency(dp.grand_total, dp.currency) }}</p><p v-if="dp.currency && dp.currency !== 'IDR'" class="mt-1 text-xs text-slate-400">≈ {{ formatCurrency((Number(dp.grand_total) || 0) * (Number(dp.exchange_rate) || 1), 'IDR') }}</p></td>
                    <td><StatusBadge :status="dp.status" :dot="false" size="sm" /></td>
                    <td>
                        <div class="flex justify-end gap-1">
                            <button type="button" @click="selectedPurchaseId = dp.id" class="icon-action" :aria-label="`Lihat pembelian ${dp.dp_number || dp.id}`" title="Lihat detail"><Eye class="size-4" /></button>
                            <RouterLink v-if="dp.status === 'draft'" :to="{ name: 'user.purchasing.direct.edit', params: { id: dp.id } }" class="icon-action" :aria-label="`Edit pembelian ${dp.dp_number || dp.id}`" title="Edit draft"><Pencil class="size-4" /></RouterLink>
                            <button v-if="dp.status === 'draft'" type="button" class="icon-action text-[#014BAA]" :aria-label="`Ajukan pembayaran ${dp.dp_number || dp.id}`" title="Ajukan pembayaran" @click="handleSubmitForPayment(dp)"><CreditCard class="size-4" /></button>
                            <button v-if="['draft', 'ready_for_payment'].includes(dp.status)" type="button" class="icon-action text-rose-600" :aria-label="`Batalkan pembelian ${dp.dp_number || dp.id}`" title="Batalkan pembelian" @click="handleCancel(dp)"><Ban class="size-4" /></button>
                        </div>
                    </td>
                </tr>
            </BaseTable>
            <Pagination :pagination="pagination" @page-change="handlePageChange" />
        </section>

        <DirectPurchaseDetailModal v-if="selectedPurchaseId" :key="selectedPurchaseId" :purchase-id="selectedPurchaseId" @close="selectedPurchaseId = null" @changed="fetchQueuePlans(); fetchDirectPurchases(searchQuery, pagination.current_page)" />
        <ConsolidatedPrModal v-model="isSourceOpen" :plan="sourcePlan" :pr-count="sourceCount(sourcePlan)" @open-detail="openPlan" />
        <ProcurementPlanDetailModal v-if="selectedPlanId" :key="selectedPlanId" :plan-id="selectedPlanId" @close="selectedPlanId = null" @changed="fetchQueuePlans(); fetchDirectPurchases(searchQuery, pagination.current_page)" />
    </div>
</template>

<style scoped>
.direct-purchases .primary, .direct-purchases .secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; padding: 10px 12px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.primary { background: #014baa; color: white; }
.primary:hover { background: #003d8c; }
.secondary { border: 1px solid #e2e8f0; color: #475569; background: white; }
.secondary:hover { background: #f8fafc; }
.refresh, .icon-action { display: inline-flex; align-items: center; justify-content: center; padding: 8px; border-radius: 8px; color: #64748b; }
.refresh { border: 1px solid #e2e8f0; }
.icon-action.text-rose-600 { color: #e11d48; }
.icon-action.text-\[\#014BAA\] { color: #014baa; }
.refresh:hover, .icon-action:hover { background: #f1f5f9; }
.filter-select { border: 1px solid #e2e8f0; border-radius: 8px; background: white; padding: 9px 12px; font-size: 12px; color: #475569; max-width: 100%; }
button, select { cursor: pointer; }
button:disabled { cursor: wait; opacity: .5; }
button:focus-visible, a:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
</style>
