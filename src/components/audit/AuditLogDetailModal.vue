<script setup>
import { computed } from 'vue'
import { ArrowRight, Clock, FileClock, Layers, Trash2, User } from '@lucide/vue'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import { formatAuditValue, getAuditEventBadge } from '../../services/auditLogServices.js'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    log: {
        type: Object,
        default: null,
    },
    loading: {
        type: Boolean,
        default: false,
    },
})

const emit = defineEmits(['update:modelValue'])

const closeModal = () => {
    emit('update:modelValue', false)
}

const eventBadge = computed(() =>
    getAuditEventBadge(props.log?.event, props.log?.event_label)
)

const formattedTimestamp = computed(() => {
    if (!props.log?.created_at) return '-'
    const date = new Date(props.log.created_at)
    if (Number.isNaN(date.getTime())) return String(props.log.created_at)
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
})

const changes = computed(() => props.log?.changes || [])
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        title="Detail Jejak Audit"
        :subtitle="log?.description || 'Rincian perubahan data dan metadata aktivitas'"
        :icon="FileClock"
        size="3xl"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <div v-if="loading" class="space-y-4 py-2">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div v-for="n in 3" :key="n" class="erp-skeleton h-16 rounded-xl" />
            </div>
            <div class="erp-skeleton h-40 rounded-xl" />
        </div>

        <div v-else-if="log" class="space-y-5">
            <!-- Ringkasan Metadata -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <User class="size-3.5" />
                        Pelaku Perubahan
                    </div>
                    <p class="mt-1 text-sm font-semibold text-slate-900">
                        {{ log.causer?.name || 'Sistem / Otomatis' }}
                    </p>
                </div>

                <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Layers class="size-3.5" />
                        Modul &amp; Objek
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-1.5">
                        <span class="text-sm font-semibold text-slate-900">
                            {{ log.subject_label }}
                        </span>
                        <code
                            v-if="log.subject_code"
                            class="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-[#014BAA] ring-1 ring-inset ring-blue-200/80"
                        >
                            {{ log.subject_code }}
                        </code>
                        <span
                            v-else-if="log.subject_id"
                            class="text-xs font-mono text-slate-500"
                        >
                            #{{ log.subject_id }}
                        </span>
                    </div>
                </div>

                <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Clock class="size-3.5" />
                        Waktu &amp; Status Event
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-2">
                        <span
                            :class="[
                                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold',
                                eventBadge.badgeClass,
                            ]"
                        >
                            <span :class="['size-1.5 rounded-full', eventBadge.dotClass]" />
                            {{ eventBadge.label }}
                        </span>
                        <span class="text-xs text-slate-600 tabular-nums">
                            {{ formattedTimestamp }}
                        </span>
                    </div>
                </div>
            </div>

            <div
                v-if="log.is_subject_deleted"
                class="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"
            >
                <Trash2 class="size-4 shrink-0 text-rose-600" />
                <span>Objek data ini saat ini berstatus <strong>dihapus (soft-deleted)</strong> di database, namun histori audit tetap tersimpan utuh.</span>
            </div>

            <!-- Daftar Perbandingan Nilai (Clean Diff tanpa JSON & tanpa scroll horizontal) -->
            <div class="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div class="flex items-center justify-between bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Perubahan Terdeteksi (Sebelum → Sesudah)
                    </h4>
                    <span class="text-xs font-medium text-slate-500">
                        {{ changes.length }} {{ changes.length === 1 ? 'perubahan' : 'perubahan' }}
                    </span>
                </div>

                <div v-if="changes.length">
                    <div class="hidden md:grid md:grid-cols-[minmax(150px,185px)_minmax(0,1fr)_24px_minmax(0,1fr)] gap-3 bg-slate-50/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        <span>Field</span>
                        <span>Nilai Sebelumnya</span>
                        <span />
                        <span>Nilai Baru</span>
                    </div>

                    <div class="divide-y divide-slate-100">
                        <div
                            v-for="row in changes"
                            :key="row.field"
                            class="grid grid-cols-1 md:grid-cols-[minmax(150px,185px)_minmax(0,1fr)_24px_minmax(0,1fr)] gap-2.5 md:gap-3 px-4 py-3 text-xs items-start hover:bg-slate-50/50"
                        >
                            <div class="min-w-0">
                                <p class="font-semibold text-slate-800 break-words">{{ row.label }}</p>
                                <code class="text-[11px] font-mono text-slate-400 break-all">{{ row.field }}</code>
                            </div>

                            <div class="min-w-0">
                                <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">
                                    Sebelum
                                </p>
                                <div class="rounded-lg bg-rose-50/75 px-3 py-2 text-rose-900 border border-rose-100 break-words whitespace-pre-wrap leading-relaxed">
                                    {{ formatAuditValue(row.old, row.field) }}
                                </div>
                            </div>

                            <div class="hidden md:flex items-center justify-center pt-2 text-slate-400">
                                <ArrowRight class="size-3.5 shrink-0" />
                            </div>

                            <div class="min-w-0">
                                <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">
                                    Sesudah
                                </p>
                                <div class="rounded-lg bg-emerald-50/75 px-3 py-2 text-emerald-900 border border-emerald-100 break-words whitespace-pre-wrap leading-relaxed">
                                    {{ formatAuditValue(row.new, row.field) }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="px-4 py-8 text-center text-sm text-slate-500">
                    Tidak ada perubahan nilai field pada aktivitas ini.
                </div>
            </div>

            <p v-if="log.batch_uuid" class="text-[11px] font-mono text-slate-400 text-right">
                Batch UUID: {{ log.batch_uuid }}
            </p>
        </div>

        <template #footer>
            <BaseButton variant="secondary" size="sm" @click="closeModal">
                Tutup
            </BaseButton>
        </template>
    </BaseModal>
</template>
