<script setup>
import { computed, nextTick, ref, useId, watch } from 'vue'
import { Check, ChevronDown, GitBranch, Layers, Loader2, RefreshCw, Search, Send, X } from '@lucide/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import BaseModal from '../ui/BaseModal.vue'
import ApprovalStepper from '../approval/ApprovalStepper.vue'
import { getApprovalConfigurations } from '../../services/approval/approvalConfigServices.js'
import { submitPurchaseRequisition } from '../../services/purchaseRequisitionServices.js'

const props = defineProps({ modelValue: Boolean, item: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'submitted'])

const triggerId = useId()
const listboxId = useId()
const configurations = ref([])
const selectedId = ref('')
const dropdownOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref(null)
const listboxRef = ref(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
let loadVersion = 0

const selected = computed(() =>
    configurations.value.find(config => String(config.id) === String(selectedId.value)) || null
)

const filteredConfigurations = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return configurations.value
    return configurations.value.filter(config =>
        [config.name, config.code, config.description, config.company?.name, config.company?.code]
            .filter(Boolean)
            .some(text => String(text).toLowerCase().includes(query))
    )
})

const levels = computed(() =>
    [...(selected.value?.levels || [])].sort((a, b) => a.step_order - b.step_order)
)

const previewLevels = computed(() =>
    levels.value.map((level, index) => ({
        ...level,
        status_label: level.status_label || (index === 0 ? 'Tahap Pertama' : 'Tahap Berikutnya'),
    }))
)

const optionSummary = (config) => {
    const count = config.levels?.length || config.levels_count || 0
    const scope = config.company?.code || config.company?.name || 'Lintas Perusahaan'
    return `${count} tahap · ${scope}`
}

const focusSearch = async (event) => {
    event?.preventDefault?.()
    await nextTick()
    searchInputRef.value?.focus()
}

const optionButtons = () => [...(listboxRef.value?.querySelectorAll('button[role="option"]:not(:disabled)') || [])]

const moveOptionFocus = (event, direction) => {
    const buttons = optionButtons()
    if (!buttons.length) return
    event.preventDefault()
    const index = buttons.indexOf(document.activeElement)
    const nextIndex = index < 0
        ? (direction > 0 ? 0 : buttons.length - 1)
        : (index + direction + buttons.length) % buttons.length
    buttons[nextIndex]?.focus()
}

const handleSearchEnter = (event) => {
    if (event.isComposing) return
    if (filteredConfigurations.value.length === 1) {
        event.preventDefault()
        selectWorkflow(filteredConfigurations.value[0])
    }
}

const selectWorkflow = (config) => {
    if (!config || submitting.value) return
    selectedId.value = config.id
    dropdownOpen.value = false
    searchQuery.value = ''
}

const load = async () => {
    const version = ++loadVersion
    configurations.value = []
    selectedId.value = ''
    dropdownOpen.value = false
    searchQuery.value = ''
    error.value = ''
    loading.value = true
    try {
        // Read all pages; never offer mock workflows for a real submission.
        const list = []
        let page = 1
        let lastPage = 1
        do {
            const response = await getApprovalConfigurations({
                document_type: 'purchase_requisition', is_active: true, per_page: 100, page,
            }, undefined, undefined, { allowMock: false })
            list.push(...(response.data || []))
            lastPage = Number(response.meta?.last_page || 1)
            page++
        } while (page <= lastPage && version === loadVersion)
        if (version !== loadVersion) return
        configurations.value = list.filter(config => config.is_active && config.levels?.length &&
            (!config.company_id || String(config.company_id) === String(props.item?.company_id || props.item?.company?.id)))
    } catch (err) {
        if (version === loadVersion) error.value = err.response?.data?.message || 'Gagal memuat workflow. Silakan coba lagi.'
    } finally {
        if (version === loadVersion) loading.value = false
    }
}

watch(() => [props.modelValue, props.item?.id], ([open]) => {
    if (open) load()
    else {
        loadVersion++
        dropdownOpen.value = false
        searchQuery.value = ''
    }
})

watch(dropdownOpen, (open) => {
    if (!open) searchQuery.value = ''
})

const close = () => {
    if (submitting.value) return
    dropdownOpen.value = false
    emit('update:modelValue', false)
}

const submit = async () => {
    if (loading.value || submitting.value || !selected.value || !props.item?.id) return
    submitting.value = true
    error.value = ''
    try {
        await submitPurchaseRequisition(props.item.id, { approval_configuration_id: selected.value.id })
        emit('submitted', props.item)
        emit('update:modelValue', false)
    } catch (err) {
        error.value = err.response?.data?.message || 'PR belum berhasil diajukan. Periksa workflow lalu coba lagi.'
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <BaseModal :model-value="modelValue" title="Ajukan PR untuk persetujuan" :subtitle="item?.pr_number"
        :icon="GitBranch" size="2xl" body-class="p-4 sm:p-6" :close-on-backdrop="!submitting"
        :close-on-escape="!submitting && !dropdownOpen" @update:model-value="close">
        <div class="space-y-4">
            <div v-if="loading" role="status"
                class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-600">
                <Loader2 class="size-4 shrink-0 animate-spin text-[#014BAA] motion-reduce:animate-none" />
                <span>Memuat daftar workflow persetujuan…</span>
            </div>

            <template v-else>
                <div v-if="configurations.length" class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <label :for="triggerId" class="text-sm font-semibold text-slate-800">
                            Workflow persetujuan <span class="text-rose-600">*</span>
                        </label>
                        <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {{ configurations.length }} workflow tersedia
                        </span>
                    </div>

                    <PopoverRoot v-model:open="dropdownOpen">
                        <PopoverTrigger :id="triggerId" type="button" role="combobox" aria-haspopup="listbox"
                            :aria-expanded="dropdownOpen" :aria-controls="listboxId" :disabled="submitting"
                            class="group flex w-full min-w-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014BAA] disabled:cursor-not-allowed disabled:opacity-60"
                            :class="[
                                dropdownOpen
                                    ? 'border-[#014BAA] bg-white ring-2 ring-blue-500/15'
                                    : selected
                                        ? 'border-blue-300 bg-blue-50/40 hover:border-blue-400'
                                        : 'border-slate-300 bg-white hover:border-blue-300',
                            ]">
                            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
                                :class="selected ? 'bg-blue-100 text-[#014BAA]' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-[#014BAA]'">
                                <GitBranch class="size-4" />
                            </span>

                            <span class="min-w-0 flex-1">
                                <template v-if="selected">
                                    <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span class="truncate text-sm font-semibold text-slate-900">{{ selected.name }}</span>
                                        <span v-if="selected.code"
                                            class="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                                            {{ selected.code }}
                                        </span>
                                    </span>
                                    <span class="mt-0.5 block truncate text-xs text-slate-500">
                                        {{ optionSummary(selected) }}
                                    </span>
                                </template>
                                <template v-else>
                                    <span class="block truncate text-sm font-medium text-slate-700">
                                        Pilih workflow persetujuan…
                                    </span>
                                    <span class="mt-0.5 block truncate text-xs text-slate-500">
                                        Cari berdasarkan nama, kode, atau cakupan perusahaan
                                    </span>
                                </template>
                            </span>

                            <ChevronDown
                                class="size-4 shrink-0 text-slate-400 transition-transform duration-150 motion-reduce:transition-none"
                                :class="{ 'rotate-180 text-[#014BAA]': dropdownOpen }" />
                        </PopoverTrigger>

                        <PopoverPortal>
                            <PopoverContent align="start" :side-offset="8" :collision-padding="12"
                                @open-auto-focus="focusSearch"
                                @keydown.escape.stop="dropdownOpen = false"
                                @keydown.down="moveOptionFocus($event, 1)"
                                @keydown.up="moveOptionFocus($event, -1)"
                                class="z-[150] flex w-[var(--reka-popover-trigger-width)] max-w-[calc(100vw-2rem)] max-h-[min(22rem,var(--reka-popover-content-available-height))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5 outline-none">
                                <div class="border-b border-slate-100 bg-slate-50/90 p-2.5">
                                    <div class="relative">
                                        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                        <input ref="searchInputRef" v-model="searchQuery" type="search"
                                            aria-label="Cari workflow persetujuan"
                                            placeholder="Cari nama atau kode workflow…"
                                            autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
                                            @keydown.enter="handleSearchEnter"
                                            class="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-500/15 focus:outline-none" />
                                        <button v-if="searchQuery" type="button" aria-label="Hapus kata pencarian"
                                            @click="searchQuery = ''; searchInputRef?.focus()"
                                            class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                            <X class="size-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div ref="listboxRef" :id="listboxId" role="listbox" aria-label="Daftar workflow persetujuan"
                                    class="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-1.5">
                                    <p v-if="!filteredConfigurations.length" role="status"
                                        class="px-3 py-6 text-center text-sm text-slate-500">
                                        Tidak ada workflow yang cocok dengan "<span class="font-medium text-slate-700">{{ searchQuery }}</span>".
                                    </p>

                                    <button v-for="config in filteredConfigurations" :key="config.id" type="button"
                                        role="option" :aria-selected="String(config.id) === String(selectedId)"
                                        @click="selectWorkflow(config)"
                                        class="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:bg-blue-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#014BAA]"
                                        :class="String(config.id) === String(selectedId)
                                            ? 'bg-blue-50/90 text-slate-900 ring-1 ring-blue-200'
                                            : 'text-slate-700 hover:bg-slate-50'">
                                        <span class="min-w-0 flex-1">
                                            <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span class="text-sm font-semibold"
                                                    :class="String(config.id) === String(selectedId) ? 'text-[#014BAA]' : 'text-slate-900'">
                                                    {{ config.name }}
                                                </span>
                                                <span v-if="config.code"
                                                    class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                                                    {{ config.code }}
                                                </span>
                                            </span>
                                            <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                                                <span class="inline-flex items-center gap-1 font-medium text-slate-600">
                                                    <Layers class="size-3.5 text-slate-400" />
                                                    {{ config.levels?.length || 0 }} tahap
                                                </span>
                                                <span aria-hidden="true">&middot;</span>
                                                <span>{{ config.company?.code || config.company?.name || 'Lintas Perusahaan' }}</span>
                                            </span>
                                            <span v-if="config.description" class="mt-1 block line-clamp-1 text-xs text-slate-500">
                                                {{ config.description }}
                                            </span>
                                        </span>

                                        <span v-if="String(config.id) === String(selectedId)"
                                            class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#014BAA] text-white">
                                            <Check class="size-3.5" />
                                        </span>
                                    </button>
                                </div>
                            </PopoverContent>
                        </PopoverPortal>
                    </PopoverRoot>
                </div>

                <p v-else-if="!error" role="status" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Belum ada workflow PR aktif untuk perusahaan ini. Hubungi administrator untuk mengaturnya.
                </p>

                <div v-if="selected" class="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/70">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-4 py-3">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <p class="text-sm font-bold text-slate-900">Urutan persetujuan</p>
                                <span v-if="selected.code"
                                    class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                                    {{ selected.code }}
                                </span>
                            </div>
                            <p v-if="selected.description" class="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                {{ selected.description }}
                            </p>
                        </div>
                        <span class="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#014BAA]">
                            {{ levels.length }} tahap
                        </span>
                    </div>
                    <div class="max-h-60 overflow-y-auto overscroll-contain p-4">
                        <ApprovalStepper :levels="previewLevels" :current-step-order="1" overall-status="pending" orientation="vertical" />
                    </div>
                </div>

                <div v-else-if="configurations.length"
                    class="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-xs sm:text-sm text-slate-500">
                    <Layers class="size-4 shrink-0 text-slate-400" />
                    <span>Pilih workflow dari dropdown di atas untuk melihat rincian tahapan dan SLA persetujuan.</span>
                </div>
            </template>

            <div v-if="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {{ error }}
            </div>

            <button v-if="!loading && !configurations.length" type="button"
                class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#014BAA] hover:underline"
                @click="load">
                <RefreshCw class="size-4" />
                Muat ulang workflow
            </button>
        </div>

        <template #footer>
            <div class="flex w-full flex-wrap justify-end gap-3">
                <button type="button"
                    class="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    :disabled="submitting" @click="close">
                    Batal
                </button>
                <button type="button"
                    class="flex items-center gap-2 rounded-xl bg-[#014BAA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="loading || submitting || !selected" @click="submit">
                    <Loader2 v-if="submitting" class="size-4 animate-spin motion-reduce:animate-none" />
                    <Send v-else class="size-4" />
                    {{ submitting ? 'Mengajukan…' : 'Ajukan PR' }}
                </button>
            </div>
        </template>
    </BaseModal>
</template>
