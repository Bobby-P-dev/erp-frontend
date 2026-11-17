<script setup>
import { computed, nextTick, ref } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent, PopoverClose } from 'reka-ui'
import { Search, ChevronDown, ChevronLeft, ChevronRight, Check, LoaderCircle, X } from '@lucide/vue'

const props = defineProps({
    id: { type: String, required: true },
    triggerLabel: { type: String, required: true },
    searchLabel: { type: String, required: true },
    placeholder: { type: String, default: 'Ketik nama atau kode' },
    valueLabel: { type: String, default: '' },
    rows: { type: Array, default: () => [] },
    selectedIds: { type: Array, default: () => [] },
    multiple: Boolean,
    loading: Boolean,
    invalid: Boolean,
    error: { type: String, default: '' },
    emptyText: { type: String, default: 'Tidak ada hasil. Coba kata pencarian lain.' },
    page: { type: Number, default: 1 },
    lastPage: { type: Number, default: 1 },
    pageLabel: { type: String, default: 'Halaman hasil pencarian' },
})
const open = defineModel('open', { default: false })
const query = defineModel('query', { default: '' })
const emit = defineEmits(['select', 'page', 'retry'])
const searchInput = ref(null)
const options = ref(null)
const selected = row => props.selectedIds.map(Number).includes(Number(row.id))
const buttons = () => [...(options.value?.querySelectorAll('button[data-picker-option]:not(:disabled)') || [])]
const optionLabel = row => props.multiple ? `${selected(row) ? 'Sudah dipilih' : 'Pilih'} ${row.name}` : row.name
const hasResults = computed(() => !props.loading && !props.error && props.rows.length)

function focusSearch(event) {
    event.preventDefault()
    nextTick(() => searchInput.value?.focus())
}
function move(event, direction) {
    const rows = buttons()
    if (!rows.length) return
    event.preventDefault()
    const index = rows.indexOf(document.activeElement)
    rows[index < 0 ? (direction > 0 ? 0 : rows.length - 1) : (index + direction + rows.length) % rows.length]?.focus()
}
function choose(row) {
    emit('select', row)
    if (props.multiple) nextTick(() => searchInput.value?.focus())
    else open.value = false
}
function changePage(page) {
    emit('page', page)
    nextTick(() => searchInput.value?.focus())
}
</script>

<template>
    <PopoverRoot v-model:open="open">
        <PopoverTrigger :id="id" type="button" role="combobox" aria-haspopup="dialog" :aria-label="triggerLabel" :aria-invalid="invalid || undefined"
            class="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-left text-sm shadow-sm transition-colors hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            :class="invalid ? 'border-rose-400' : open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><slot name="icon"><Search class="size-4" /></slot></span>
            <span class="min-w-0 flex-1 truncate" :class="valueLabel ? 'font-medium text-slate-900' : 'text-slate-500'">{{ valueLabel || triggerLabel }}</span>
            <ChevronDown class="size-4 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none" :class="{ 'rotate-180 text-blue-600': open }" />
        </PopoverTrigger>
        <PopoverPortal>
            <PopoverContent align="start" :side-offset="8" :collision-padding="16" :aria-label="searchLabel" @open-auto-focus="focusSearch"
                class="z-[150] w-[var(--reka-popover-trigger-width)] min-w-0 max-w-[calc(100vw-2rem)] max-h-[var(--reka-popover-content-available-height)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl outline-none"
                @keydown.down="move($event, 1)" @keydown.up="move($event, -1)">
                <div class="space-y-3 border-b border-slate-100 p-3">
                    <slot name="filters" />
                    <div class="relative">
                        <Search class="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
                        <input ref="searchInput" v-model="query" :aria-label="searchLabel" :placeholder="placeholder" maxlength="100" autocomplete="off" type="search"
                            class="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm" />
                        <button v-if="query" type="button" :aria-label="`Hapus pencarian ${searchLabel.toLowerCase()}`" class="absolute right-1 top-1 rounded-md p-2 text-slate-500 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600" @click="query = ''; searchInput?.focus()"><X class="size-4" /></button>
                    </div>
                </div>
                <div v-if="loading" role="status" class="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500"><LoaderCircle class="size-4 animate-spin motion-reduce:animate-none" />Mencari…</div>
                <div v-else-if="error" role="alert" class="m-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p>{{ error }}</p><button type="button" class="mt-3 min-h-10 rounded-lg border border-amber-300 bg-white px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-amber-700" @click="$emit('retry')">Coba lagi</button></div>
                <div v-else-if="!rows.length" role="status" class="space-y-3 p-5 text-sm leading-relaxed text-slate-500"><p>{{ emptyText }}</p><slot name="empty" /></div>
                <ul v-if="hasResults" ref="options" class="max-h-64 space-y-1 overflow-y-auto p-2" :aria-label="`Hasil ${searchLabel.toLowerCase()}`">
                    <li v-for="row in rows" :key="row.id">
                        <button type="button" data-picker-option :aria-label="optionLabel(row)" :disabled="multiple && selected(row)" @click="choose(row)"
                            class="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600 disabled:cursor-default"
                            :class="selected(row) ? 'bg-blue-50/70' : ''">
                            <span class="min-w-0 flex-1"><slot name="option" :row="row" :selected="selected(row)"><span class="text-sm font-medium text-slate-900">{{ row.name }}</span></slot></span>
                            <Check v-if="selected(row)" class="size-4 shrink-0 text-blue-700" /><span v-else class="text-xs font-medium text-blue-700">Pilih</span>
                        </button>
                    </li>
                </ul>
                <nav v-if="lastPage > 1 && !loading && !error" :aria-label="pageLabel" class="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
                    <button type="button" aria-label="Sebelumnya" class="inline-flex min-h-10 items-center rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40" :disabled="page <= 1" @click="changePage(page - 1)"><ChevronLeft class="size-4" /><span class="hidden sm:inline">Sebelumnya</span></button>
                    <span class="whitespace-nowrap text-xs text-slate-500">{{ page }} / {{ lastPage }}</span>
                    <button type="button" aria-label="Berikutnya" class="inline-flex min-h-10 items-center rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40" :disabled="page >= lastPage" @click="changePage(page + 1)"><span class="hidden sm:inline">Berikutnya</span><ChevronRight class="size-4" /></button>
                </nav>
                <div v-if="multiple" class="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2.5"><span role="status" class="text-xs font-medium text-slate-600">{{ selectedIds.length }} supplier dipilih</span><PopoverClose class="min-h-10 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Selesai</PopoverClose></div>
            </PopoverContent>
        </PopoverPortal>
    </PopoverRoot>
</template>
