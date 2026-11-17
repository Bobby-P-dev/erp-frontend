<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Download, FileText, X } from '@lucide/vue'

const props = defineProps({ url: { type: String, required: true }, fileName: { type: String, required: true } })
const emit = defineEmits(['close'])
const dialog = ref(null)
const ready = ref(false)
const previousFocus = document.activeElement
onMounted(() => dialog.value.showModal())
onBeforeUnmount(() => previousFocus?.focus?.())
const download = () => {
    if (!ready.value) return
    const link = document.createElement('a')
    link.href = props.url
    link.download = props.fileName
    link.click()
}
</script>

<template>
    <dialog ref="dialog" aria-labelledby="pdf-preview-title" class="pdf-preview rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl" @cancel.prevent="emit('close')" @keydown.esc.stop @click="event => event.target === dialog && emit('close')">
        <div class="flex h-full flex-col">
            <header class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div class="flex min-w-0 items-center gap-3"><FileText class="size-5 shrink-0 text-blue-700" /><div class="min-w-0"><h2 id="pdf-preview-title" class="font-semibold text-slate-900">Preview PDF</h2><p class="truncate text-xs text-slate-500">{{ fileName }}</p></div></div>
                <button type="button" autofocus aria-label="Tutup preview PDF" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="emit('close')"><X class="size-5" /></button>
            </header>
            <iframe :src="url" title="Preview dokumen PDF" class="min-h-0 flex-1 border-0 bg-slate-100" @load="ready = true" />
            <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                <p class="text-xs text-slate-500">Periksa dokumen sebelum mengunduh.</p>
                <div class="flex gap-2"><button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="emit('close')">Tutup</button><button type="button" :disabled="!ready" class="inline-flex items-center gap-2 rounded-lg bg-[#014BAA] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50" @click="download"><Download class="size-4" />Unduh PDF</button></div>
            </footer>
        </div>
    </dialog>
</template>

<style scoped>
.pdf-preview { width: min(1100px, calc(100vw - 24px)); height: min(900px, calc(100dvh - 24px)); max-width: none; max-height: none; margin: auto; }
.pdf-preview::backdrop { background: rgb(15 23 42 / 55%); }
.pdf-preview button:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
</style>
