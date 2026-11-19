<script setup>
import { computed, ref, watch } from 'vue'
import {
    ArrowRight,
    ChevronDown,
    FileClock,
    RefreshCw,
    ShieldAlert,
} from '@lucide/vue'
import {
    PURCHASING_ACTIVITY_ENDPOINTS,
    formatAuditValue,
    getAuditEventBadge,
    getDocumentActivityHistory,
} from '../../services/auditLogServices.js'

const props = defineProps({
    documentType: {
        type: String,
        required: true,
        validator: (value) => Object.keys(PURCHASING_ACTIVITY_ENDPOINTS).includes(value),
    },
    documentId: {
        type: [Number, String],
        default: null,
    },
    active: {
        type: Boolean,
        default: true,
    },
    title: {
        type: String,
        default: 'Riwayat Perubahan Data',
    },
    subtitle: {
        type: String,
        default: 'Jejak perubahan field dokumen dan item secara kronologis.',
    },
    perPage: {
        type: Number,
        default: 15,
    },
})

const items = ref([])
const isLoading = ref(false)
const loadError = ref('')
const eventFilter = ref('')
const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const hasLoadedOnce = ref(false)
const expandedIds = ref({})

const eventOptions = [
    { value: '', label: 'Semua Event' },
    { value: 'created', label: 'Dibuat' },
    { value: 'updated', label: 'Diubah' },
    { value: 'deleted', label: 'Dihapus' },
]

const formatDateTime = (iso) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const isExpanded = (log) => {
    if (log.id in expandedIds.value) {
        return Boolean(expandedIds.value[log.id])
    }
    return Boolean(log.changes?.length === 1)
}

const toggleExpand = (id) => {
    expandedIds.value = {
        ...expandedIds.value,
        [id]: !expandedIds.value[id],
    }
}

const fetchHistory = async (page = 1, append = false) => {
    if (!props.documentId) return
    isLoading.value = true
    loadError.value = ''

    try {
        const res = await getDocumentActivityHistory(props.documentType, props.documentId, {
            page,
            per_page: props.perPage,
            event: eventFilter.value,
        })

        const fetched = res?.data || []
        items.value = append ? [...items.value, ...fetched] : fetched
        currentPage.value = res?.meta?.current_page ?? page
        lastPage.value = res?.meta?.last_page ?? 1
        total.value = res?.meta?.total ?? items.value.length
        hasLoadedOnce.value = true
    } catch (error) {
        loadError.value = error?.response?.data?.message || 'Gagal memuat riwayat perubahan dokumen.'
        if (!append) {
            items.value = []
        }
    } finally {
        isLoading.value = false
    }
}

const canLoadMore = computed(() => !isLoading.value && currentPage.value < lastPage.value)

watch(
    () => [props.documentType, props.documentId],
    () => {
        hasLoadedOnce.value = false
        items.value = []
        expandedIds.value = {}
        currentPage.value = 1
        if (props.active && props.documentId) {
            fetchHistory(1, false)
        }
    },
    { immediate: true }
)

watch(
    () => props.active,
    (isActive) => {
        if (isActive && props.documentId && !hasLoadedOnce.value && !isLoading.value) {
            fetchHistory(1, false)
        }
    }
)

watch(eventFilter, () => {
    if (props.documentId && props.active) {
        fetchHistory(1, false)
    }
})

defineExpose({
    refresh: () => fetchHistory(1, false),
})
</script>

<template>
    <div class="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4fc] text-[#014BAA]">
                    <FileClock class="size-4" aria-hidden="true" />
                </span>
                <div class="min-w-0">
                    <h4 class="text-sm font-semibold text-slate-900">{{ title }}</h4>
                    <p class="text-xs text-slate-500 truncate">{{ subtitle }}</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <select
                    v-model="eventFilter"
                    aria-label="Filter jenis perubahan"
                    class="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-[#014BAA] focus:outline-none focus:ring-2 focus:ring-[#014BAA]/20"
                >
                    <option v-for="opt in eventOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                    </option>
                </select>
                <button
                    type="button"
                    class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    :disabled="isLoading || !documentId"
                    @click="fetchHistory(1, false)"
                >
                    <RefreshCw class="size-3.5" :class="isLoading ? 'animate-spin' : ''" />
                    Segarkan
                </button>
            </div>
        </div>

        <div class="p-4">
            <div v-if="isLoading && !items.length" class="space-y-3">
                <div v-for="n in 3" :key="`doc-act-skel-${n}`" class="flex gap-3">
                    <div class="erp-skeleton size-2.5 rounded-full mt-1.5 shrink-0" />
                    <div class="flex-1 space-y-2">
                        <div class="erp-skeleton h-4 w-56 rounded" />
                        <div class="erp-skeleton h-3 w-40 rounded" />
                    </div>
                </div>
            </div>

            <div v-else-if="loadError" role="alert" class="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800">
                <ShieldAlert class="size-4 shrink-0 mt-0.5 text-rose-600" />
                <div class="flex-1 min-w-0">
                    <p class="font-semibold">{{ loadError }}</p>
                </div>
            </div>

            <div v-else-if="!items.length" class="py-8 text-center text-xs text-slate-500">
                Belum ada riwayat perubahan data yang tercatat untuk dokumen ini.
            </div>

            <ol v-else class="relative space-y-4 border-l-2 border-slate-100 pl-4 ml-1.5">
                <li v-for="row in items" :key="row.id" class="relative">
                    <span
                        :class="[
                            'absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-white',
                            getAuditEventBadge(row.event, row.event_label).dotClass,
                        ]"
                    />

                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium text-slate-900 leading-snug">
                                {{ row.description || '-' }}
                            </p>
                            <p class="mt-0.5 text-xs text-slate-500">
                                <span class="font-medium text-slate-700">{{ row.causer?.name || 'Sistem' }}</span>
                                <span class="mx-1.5">·</span>
                                <span class="tabular-nums">{{ formatDateTime(row.created_at) }}</span>
                            </p>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <span
                                :class="[
                                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                    getAuditEventBadge(row.event, row.event_label).badgeClass,
                                ]"
                            >
                                {{ getAuditEventBadge(row.event, row.event_label).label }}
                            </span>

                            <button
                                v-if="row.changes?.length"
                                type="button"
                                class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                                :aria-expanded="isExpanded(row)"
                                @click="toggleExpand(row.id)"
                            >
                                <span>{{ row.changes.length }} perubahan</span>
                                <ChevronDown
                                    class="size-3 transition-transform duration-150"
                                    :class="isExpanded(row) ? 'rotate-180' : ''"
                                />
                            </button>
                        </div>
                    </div>

                    <div
                        v-if="row.changes?.length && isExpanded(row)"
                        class="mt-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 divide-y divide-slate-200/60"
                    >
                        <div
                            v-for="diff in row.changes"
                            :key="`${row.id}-${diff.field}`"
                            class="grid grid-cols-1 sm:grid-cols-[minmax(130px,160px)_minmax(0,1fr)_18px_minmax(0,1fr)] gap-1.5 sm:gap-2 px-3 py-2 text-xs items-center"
                        >
                            <span class="font-medium text-slate-700 truncate" :title="diff.label">
                                {{ diff.label }}
                            </span>
                            <span class="rounded bg-rose-50 px-2 py-1 text-rose-900 border border-rose-100 break-words whitespace-pre-wrap">
                                {{ formatAuditValue(diff.old, diff.field) }}
                            </span>
                            <ArrowRight class="hidden sm:block size-3.5 text-slate-400 mx-auto" />
                            <span class="rounded bg-emerald-50 px-2 py-1 text-emerald-900 border border-emerald-100 break-words whitespace-pre-wrap">
                                {{ formatAuditValue(diff.new, diff.field) }}
                            </span>
                        </div>
                    </div>
                </li>
            </ol>

            <div v-if="canLoadMore" class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Menampilkan {{ items.length }} dari {{ total }} aktivitas</span>
                <button
                    type="button"
                    class="font-semibold text-[#014BAA] hover:underline cursor-pointer"
                    @click="fetchHistory(currentPage + 1, true)"
                >
                    Muat lebih banyak
                </button>
            </div>
        </div>
    </div>
</template>
