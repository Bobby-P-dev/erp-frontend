<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
    Eye,
    FileClock,
    RefreshCw,
    RotateCcw,
    ShieldAlert,
    Trash2,
} from '@lucide/vue'
import PageHeader from '../../../components/ui/PageHeader.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import AuditLogDetailModal from '../../../components/audit/AuditLogDetailModal.vue'
import {
    formatAuditValue,
    getActivityLogById,
    getActivityLogFilters,
    getActivityLogs,
    getAuditEventBadge,
} from '../../../services/auditLogServices.js'

const logs = ref([])
const isLoading = ref(false)
const loadError = ref('')
const isForbidden = ref(false)

const filterOptions = ref({
    log_names: [],
    subject_types: [],
    events: [],
    causers: [],
})

const searchQuery = ref('')
const selectedLogName = ref('')
const selectedSubjectType = ref('')
const selectedEvent = ref('')
const selectedCauserId = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 15,
})

const detailModalOpen = ref(false)
const detailLoading = ref(false)
const selectedLog = ref(null)

let searchDebounceTimer = null

const tableColumns = [
    { key: 'time', label: 'Waktu & Pelaku', width: '21%', minWidth: '210px' },
    { key: 'module', label: 'Modul & Objek', width: '22%', minWidth: '220px' },
    { key: 'description', label: 'Aktivitas', width: '25%', minWidth: '240px' },
    { key: 'event', label: 'Event', width: '13%', minWidth: '135px' },
    { key: 'changes', label: 'Perubahan', width: '12%', minWidth: '130px' },
    { key: 'actions', label: 'Aksi', width: '90px', align: 'right' },
]

const filteredSubjectOptions = computed(() => {
    const items = filterOptions.value.subject_types || []
    if (!selectedLogName.value) return items
    return items.filter((item) => item.log_name === selectedLogName.value)
})

const hasActiveFilters = computed(() => Boolean(
    searchQuery.value.trim()
    || selectedLogName.value
    || selectedSubjectType.value
    || selectedEvent.value
    || selectedCauserId.value
    || dateFrom.value
    || dateTo.value
))

const formatDateTime = (iso) => {
    if (!iso) return '-'
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return String(iso)
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const fetchFilters = async () => {
    try {
        const res = await getActivityLogFilters()
        if (res?.data) {
            filterOptions.value = {
                log_names: res.data.log_names || [],
                subject_types: res.data.subject_types || [],
                events: res.data.events || [],
                causers: res.data.causers || [],
            }
        }
    } catch {
        // Error state is handled cleanly by fetchLogs
    }
}

const fetchLogs = async (page = 1) => {
    isLoading.value = true
    loadError.value = ''
    isForbidden.value = false

    try {
        const res = await getActivityLogs({
            page,
            per_page: 15,
            search: searchQuery.value,
            log_name: selectedLogName.value,
            subject_type: selectedSubjectType.value,
            event: selectedEvent.value,
            causer_id: selectedCauserId.value,
            date_from: dateFrom.value,
            date_to: dateTo.value,
        })

        logs.value = res?.data || []
        if (res?.meta) {
            pagination.value = {
                current_page: res.meta.current_page ?? 1,
                last_page: res.meta.last_page ?? 1,
                from: res.meta.from ?? 0,
                to: res.meta.to ?? 0,
                total: res.meta.total ?? logs.value.length,
                per_page: res.meta.per_page ?? 15,
            }
        }
    } catch (error) {
        if (error?.response?.status === 403) {
            isForbidden.value = true
            loadError.value = 'Anda tidak memiliki izin audit-log.read untuk melihat catatan audit sistem.'
        } else {
            loadError.value = error?.response?.data?.message || 'Gagal memuat catatan Audit Trail.'
        }
        logs.value = []
    } finally {
        isLoading.value = false
    }
}

const resetFilters = () => {
    searchQuery.value = ''
    selectedLogName.value = ''
    selectedSubjectType.value = ''
    selectedEvent.value = ''
    selectedCauserId.value = ''
    dateFrom.value = ''
    dateTo.value = ''
    fetchLogs(1)
}

const openDetail = async (row) => {
    selectedLog.value = row
    detailModalOpen.value = true
    detailLoading.value = true
    try {
        const res = await getActivityLogById(row.id)
        if (res?.data) {
            selectedLog.value = res.data
        }
    } catch {
        // Fallback to row payload already available
    } finally {
        detailLoading.value = false
    }
}

watch(selectedLogName, () => {
    if (
        selectedSubjectType.value
        && !filteredSubjectOptions.value.some((s) => s.value === selectedSubjectType.value)
    ) {
        selectedSubjectType.value = ''
    }
    fetchLogs(1)
})

watch([selectedSubjectType, selectedEvent, selectedCauserId, dateFrom, dateTo], () => {
    fetchLogs(1)
})

watch(searchQuery, () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => {
        fetchLogs(1)
    }, 300)
})

onMounted(() => {
    fetchFilters()
    fetchLogs(1)
})
</script>

<template>
    <div class="w-full min-w-0 flex flex-col gap-6 pb-12">
        <PageHeader
            title="Audit Trail &amp; Activity Logs"
            description="Jejak aktivitas append-only untuk melacak pembuatan, perubahan field, pembatalan, dan penghapusan data ERP."
        >
            <template #icon>
                <FileClock class="size-6 text-[#014BAA]" />
            </template>
            <template #actions>
                <BaseButton
                    variant="secondary"
                    size="sm"
                    :disabled="isLoading"
                    @click="fetchLogs(pagination.current_page)"
                >
                    <RefreshCw class="size-4" :class="isLoading ? 'animate-spin' : ''" />
                    Muat Ulang
                </BaseButton>
            </template>
        </PageHeader>

        <!-- Filter & Pencarian -->
        <section class="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div class="p-4 sm:p-5 border-b border-slate-100 space-y-3">
                <div class="flex flex-col lg:flex-row gap-3">
                    <div class="flex-1 min-w-0">
                        <SearchInput
                            v-model="searchQuery"
                            compact
                            clearable
                            label="Cari catatan audit"
                            placeholder="Cari nomor dokumen (PR/PO/RFQ/DP), nama pelaku, atau isi perubahan…"
                        />
                    </div>
                    <div class="flex flex-wrap items-center gap-2.5">
                        <select
                            v-model="selectedLogName"
                            aria-label="Filter modul"
                            class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#014BAA] focus:outline-none focus:ring-2 focus:ring-[#014BAA]/20"
                        >
                            <option value="">Semua Modul</option>
                            <option v-for="opt in filterOptions.log_names" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>

                        <select
                            v-model="selectedSubjectType"
                            aria-label="Filter tipe objek"
                            class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#014BAA] focus:outline-none focus:ring-2 focus:ring-[#014BAA]/20"
                        >
                            <option value="">Semua Tipe Data</option>
                            <option v-for="opt in filteredSubjectOptions" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>

                        <select
                            v-model="selectedEvent"
                            aria-label="Filter jenis aksi"
                            class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#014BAA] focus:outline-none focus:ring-2 focus:ring-[#014BAA]/20"
                        >
                            <option value="">Semua Event</option>
                            <option v-for="opt in filterOptions.events" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2.5">
                    <select
                        v-model="selectedCauserId"
                        aria-label="Filter pelaku"
                        class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-[#014BAA] focus:outline-none focus:ring-2 focus:ring-[#014BAA]/20"
                    >
                        <option value="">Semua Pelaku</option>
                        <option v-for="c in filterOptions.causers" :key="c.id" :value="String(c.id)">
                            {{ c.name }}
                        </option>
                    </select>

                    <label class="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <span>Dari</span>
                        <input
                            v-model="dateFrom"
                            type="date"
                            aria-label="Tanggal mulai"
                            class="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-[#014BAA] focus:outline-none focus:ring-2 focus:ring-[#014BAA]/20"
                        />
                    </label>

                    <label class="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <span>Sampai</span>
                        <input
                            v-model="dateTo"
                            type="date"
                            aria-label="Tanggal akhir"
                            class="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-[#014BAA] focus:outline-none focus:ring-2 focus:ring-[#014BAA]/20"
                        />
                    </label>

                    <button
                        v-if="hasActiveFilters"
                        type="button"
                        class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                        @click="resetFilters"
                    >
                        <RotateCcw class="size-3.5" />
                        Reset Filter
                    </button>
                </div>
            </div>

            <!-- Tabel Audit -->
            <BaseTable :columns="tableColumns" min-width="960px" layout="fixed" label="Tabel Audit Trail ERP" :busy="isLoading">
                <template v-if="isLoading">
                    <tr v-for="n in 6" :key="`audit-skel-${n}`" class="border-b border-slate-100 last:border-b-0">
                        <td class="px-4 py-3.5">
                            <div class="erp-skeleton h-4 w-28 rounded" />
                            <div class="erp-skeleton mt-2 h-3 w-24 rounded" />
                        </td>
                        <td class="px-4 py-3.5">
                            <div class="erp-skeleton h-4 w-32 rounded" />
                            <div class="erp-skeleton mt-2 h-3 w-20 rounded" />
                        </td>
                        <td class="px-4 py-3.5">
                            <div class="erp-skeleton h-4 w-48 rounded" />
                        </td>
                        <td class="px-4 py-3.5">
                            <div class="erp-skeleton h-6 w-20 rounded-full" />
                        </td>
                        <td class="px-4 py-3.5">
                            <div class="erp-skeleton h-4 w-20 rounded" />
                        </td>
                        <td class="px-4 py-3.5">
                            <div class="erp-skeleton ml-auto h-7 w-7 rounded-lg" />
                        </td>
                    </tr>
                </template>

                <tr v-else-if="loadError">
                    <td colspan="6" class="px-6 py-14 text-center">
                        <div class="mx-auto max-w-md space-y-2" role="alert">
                            <div class="mx-auto flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                <ShieldAlert class="size-5" />
                            </div>
                            <p class="text-sm font-semibold text-slate-900">
                                {{ isForbidden ? 'Akses Audit Trail Terbatas' : 'Gagal Memuat Log' }}
                            </p>
                            <p class="text-xs text-slate-600 leading-relaxed">{{ loadError }}</p>
                            <BaseButton v-if="!isForbidden" variant="secondary" size="sm" class="mt-2" @click="fetchLogs(pagination.current_page)">
                                Coba Lagi
                            </BaseButton>
                        </div>
                    </td>
                </tr>

                <tr v-else-if="!logs.length">
                    <td colspan="6" class="px-6 py-14 text-center">
                        <FileClock class="mx-auto mb-2.5 size-9 text-slate-300" />
                        <p class="text-sm font-semibold text-slate-800">
                            {{ hasActiveFilters ? 'Tidak ada catatan audit yang cocok' : 'Belum ada catatan aktivitas' }}
                        </p>
                        <p class="mt-1 text-xs text-slate-500">
                            {{ hasActiveFilters ? 'Coba ubah filter modul, pelaku, atau rentang tanggal.' : 'Setiap pembuatan, pembaruan, dan penghapusan data akan muncul di sini.' }}
                        </p>
                    </td>
                </tr>

                <template v-else>
                    <tr
                        v-for="row in logs"
                        :key="row.id"
                        class="hover:bg-slate-50/70 transition-colors"
                    >
                        <td class="px-4 py-3.5 align-top">
                            <p class="text-sm font-semibold text-slate-900 truncate">
                                {{ row.causer?.name || 'Sistem' }}
                            </p>
                            <p class="mt-0.5 text-xs text-slate-500 tabular-nums">
                                {{ formatDateTime(row.created_at) }}
                            </p>
                        </td>

                        <td class="px-4 py-3.5 align-top">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="text-xs font-semibold text-slate-700">
                                    {{ row.subject_label }}
                                </span>
                                <span
                                    v-if="row.is_subject_deleted"
                                    class="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/80"
                                >
                                    <Trash2 class="size-2.5" />
                                    Dihapus
                                </span>
                            </div>
                            <p class="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <span>{{ row.module_label }}</span>
                                <span v-if="row.subject_code">·</span>
                                <code v-if="row.subject_code" class="font-mono font-semibold text-[#014BAA]">
                                    {{ row.subject_code }}
                                </code>
                            </p>
                        </td>

                        <td class="px-4 py-3.5 align-top">
                            <p class="text-sm text-slate-800 leading-snug">
                                {{ row.description || '-' }}
                            </p>
                            <p
                                v-if="row.changes?.length === 1"
                                class="mt-1 text-xs text-slate-500 truncate"
                            >
                                {{ row.changes[0].label }}: {{ formatAuditValue(row.changes[0].old, row.changes[0].field) }} → {{ formatAuditValue(row.changes[0].new, row.changes[0].field) }}
                            </p>
                        </td>

                        <td class="px-4 py-3.5 align-top">
                            <span
                                :class="[
                                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
                                    getAuditEventBadge(row.event, row.event_label).badgeClass,
                                ]"
                            >
                                <span :class="['size-1.5 rounded-full', getAuditEventBadge(row.event, row.event_label).dotClass]" />
                                {{ getAuditEventBadge(row.event, row.event_label).label }}
                            </span>
                        </td>

                        <td class="px-4 py-3.5 align-top text-xs text-slate-600 tabular-nums">
                            {{ row.changes?.length ? `${row.changes.length} field` : '-' }}
                        </td>

                        <td class="px-4 py-3.5 align-top text-right">
                            <button
                                type="button"
                                class="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-[#014BAA] transition-colors cursor-pointer"
                                :aria-label="`Lihat detail diff log #${row.id}`"
                                title="Lihat Detail Perubahan"
                                @click="openDetail(row)"
                            >
                                <Eye class="size-4" />
                            </button>
                        </td>
                    </tr>
                </template>
            </BaseTable>

            <Pagination
                v-if="!isLoading && !loadError && pagination.total > 0"
                :pagination="pagination"
                @change-page="fetchLogs"
            />
        </section>

        <AuditLogDetailModal
            v-model="detailModalOpen"
            :log="selectedLog"
            :loading="detailLoading"
        />
    </div>
</template>
