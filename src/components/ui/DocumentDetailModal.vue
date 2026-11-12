<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, useId } from 'vue'
import { X } from '@lucide/vue'

defineProps({ title: { type: String, required: true } })
const emit = defineEmits(['close'])
const titleId = useId()
const dialog = ref(null)
let previousFocus, previousOverflow, appRoot, previousInert
const requestClose = () => {
    if (!dialog.value?.querySelector('[data-detail-busy]') && !document.querySelector('[role="alertdialog"]')) emit('close')
}
const onKeydown = event => {
    if (document.querySelector('[role="alertdialog"]')) return
    if (event.key === 'Escape') {
        event.preventDefault()
        const cancel = dialog.value?.querySelector('[data-detail-cancel]')
        if (cancel) cancel.click()
        else requestClose()
    }
    if (event.key !== 'Tab') return
    const focusable = [...dialog.value.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')].filter(el => el.getClientRects().length)
    const first = focusable[0], last = focusable.at(-1)
    if (!dialog.value.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) { event.preventDefault(); first?.focus() }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
}
onMounted(async () => {
    previousFocus = document.activeElement
    appRoot = document.getElementById('app')
    previousInert = appRoot?.inert
    if (appRoot) appRoot.inert = true
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    dialog.value?.querySelector('button')?.focus()
})
onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = previousOverflow
    if (appRoot) appRoot.inert = previousInert
    if (previousFocus?.isConnected) previousFocus.focus()
    else appRoot?.querySelector('input:not(:disabled), button:not(:disabled), a[href]')?.focus()
})
</script>

<template>
    <Teleport to="body">
        <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-2 sm:p-5" @click.self="requestClose">
            <section ref="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId" class="document-dialog">
                <header class="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3 sm:px-7">
                    <h2 :id="titleId" class="text-sm font-medium text-slate-700">{{ title }}</h2>
                    <button type="button" aria-label="Tutup detail" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="requestClose"><X class="size-5" /></button>
                </header>
                <div class="min-h-0 overflow-y-auto p-5 sm:p-7"><slot /></div>
                <footer class="flex justify-end border-t border-slate-100 px-5 py-3 sm:px-7">
                    <button type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="requestClose">Tutup</button>
                </footer>
            </section>
        </div>
    </Teleport>
</template>

<style scoped>
.document-dialog { display: flex; flex-direction: column; width: min(1080px, 100%); max-height: calc(100dvh - 40px); border: 1px solid #e2e8f0; border-radius: 20px; background: white; box-shadow: 0 24px 80px #0f172a33; overflow: hidden; }
button { cursor: pointer; }
.document-dialog :deep(:focus-visible) { outline: 2px solid #014baa; outline-offset: 3px; }
@media (max-width: 640px) { .document-dialog { max-height: calc(100dvh - 16px); border-radius: 16px; } }
</style>
