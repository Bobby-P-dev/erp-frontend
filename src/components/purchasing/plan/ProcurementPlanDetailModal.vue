<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { X, ExternalLink } from '@lucide/vue'
import ProcurementPlanDetail from './ProcurementPlanDetail.vue'

defineProps({ planId: { type: [Number, String], required: true } })
const emit = defineEmits(['close', 'changed'])
const dialog = ref(null)
let previousOverflow
let previousFocus
let appRoot
let previousInert
const onKeydown = event => {
    if (document.querySelector('[role="alertdialog"]')) return
    if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
    if (event.key !== 'Tab') return
    const focusable = [...dialog.value.querySelectorAll('button:not(:disabled), a[href], summary, [tabindex="0"]')].filter(el => el.getClientRects().length)
    const first = focusable[0], last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
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
})
</script>

<template>
    <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-2 sm:p-5" @click.self="emit('close')">
    <div ref="dialog" role="dialog" aria-modal="true" aria-labelledby="plan-detail-title" class="plan-dialog">
        <div class="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
            <h2 id="plan-detail-title" class="text-sm font-medium text-slate-800">Detail rencana pengadaan</h2>
            <button type="button" autofocus aria-label="Tutup detail rencana" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="emit('close')"><X class="size-5" /></button>
        </div>
        <div class="min-h-0 overflow-y-auto p-5 sm:p-7">
            <ProcurementPlanDetail :plan-id="planId" @changed="emit('changed')" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-7">
            <RouterLink :to="{ name: 'user.purchasing.plans.detail', params: { id: planId } }" class="inline-flex items-center gap-2 text-sm text-[#014BAA]"><ExternalLink class="size-4" />Buka halaman penuh</RouterLink>
            <button type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="emit('close')">Tutup</button>
        </div>
    </div>
    </div>
    </Teleport>
</template>

<style scoped>
.plan-dialog { display: flex; flex-direction: column; width: min(1080px, calc(100vw - 32px)); max-height: calc(100dvh - 40px); border: 1px solid #e2e8f0; border-radius: 20px; background: white; color: #0f172a; box-shadow: 0 24px 80px #0f172a33; overflow: hidden; }
button { cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
@media (max-width: 640px) { .plan-dialog { width: calc(100vw - 16px); max-height: calc(100dvh - 16px); border-radius: 16px; } }
</style>
