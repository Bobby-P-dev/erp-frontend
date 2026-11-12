<script setup>
import { ref, computed, watch, nextTick, useId, onMounted, onBeforeUnmount } from 'vue'
import { 
    CheckCircle2, 
    RotateCcw, 
    XCircle, 
    AlertTriangle,
    Loader2,
    X,
    FileSignature,
} from '@lucide/vue'
import { useAuthStore } from '../../stores/auth.js'
import SignaturePadModal from '../profile/SignaturePadModal.vue'

const authStore = useAuthStore()
const isSignatureModalOpen = ref(false)

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false,
    },
    actionType: {
        type: String,
        required: true,
        validator: (v) => ['approve', 'revision', 'reject'].includes(v),
    },
    documentNumber: {
        type: String,
        default: '',
    },
    documentTitle: {
        type: String,
        default: '',
    },
    currentStepName: {
        type: String,
        default: '',
    },
})

const emit = defineEmits(['close', 'confirm'])

const dialogId = useId()
const dialogElement = ref(null)
let previousFocus = null
const notes = ref('')
const validationError = ref('')
const isSubmitting = ref(false)

const userHasSignature = computed(() => {
    return Boolean(authStore.user?.has_signature)
})

const isConfirmDisabled = computed(() => {
    if (isSubmitting.value) return true
    if (props.actionType === 'approve' && !userHasSignature.value) return true
    return false
})

const actionConfig = computed(() => {
    switch (props.actionType) {
        case 'approve':
            return {
                title: 'Setujui dokumen?',
                description: 'Persetujuan Anda akan melanjutkan proses dokumen.',
                notesLabel: 'Catatan persetujuan',
                placeholder: 'Tambahkan catatan bila diperlukan…',
                confirmButtonText: 'Setujui dokumen',
                btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                icon: CheckCircle2,
                confirmIcon: CheckCircle2,
                iconClass: 'text-emerald-600',
                isNotesRequired: false,
            }
        case 'revision':
            return {
                title: 'Minta revisi',
                description: 'Dokumen akan dikembalikan kepada pemohon untuk diperbaiki.',
                notesLabel: 'Apa yang perlu diperbaiki?',
                placeholder: 'Tuliskan bagian yang perlu diperbaiki dan arahan Anda…',
                confirmButtonText: 'Kirim permintaan revisi',
                btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
                icon: RotateCcw,
                confirmIcon: RotateCcw,
                iconClass: 'text-amber-600',
                isNotesRequired: true,
            }
        case 'reject':
            return {
                title: 'Tolak dokumen?',
                description: 'Pengajuan akan ditolak. Jelaskan alasannya agar pemohon memahami keputusan Anda.',
                notesLabel: 'Alasan penolakan',
                placeholder: 'Jelaskan alasan penolakan, minimal 5 karakter…',
                confirmButtonText: 'Tolak dokumen',
                btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
                icon: XCircle,
                confirmIcon: XCircle,
                iconClass: 'text-rose-600',
                isNotesRequired: true,
            }
        default:
            return {}
    }
})

watch(() => props.isOpen, async (newVal) => {
    if (newVal) {
        previousFocus = document.activeElement
        notes.value = ''
        validationError.value = ''
        isSubmitting.value = false
        await nextTick()
        dialogElement.value?.focus()
    } else {
        isSignatureModalOpen.value = false
        previousFocus?.focus?.()
    }
})

const handleDialogKeydown = (event) => {
    if (isSignatureModalOpen.value) return
    if (event.key !== 'Tab') return
    const controls = [...dialogElement.value.querySelectorAll('button:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
    const first = controls[0], last = controls.at(-1)
    if (!first) { event.preventDefault(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogElement.value)) {
        event.preventDefault(); last.focus()
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogElement.value)) {
        event.preventDefault(); first.focus()
    }
}

const handleEscape = (event) => {
    if (!props.isOpen || isSignatureModalOpen.value || event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    if (!isSubmitting.value) emit('close')
}
onMounted(() => document.addEventListener('keydown', handleEscape, true))
onBeforeUnmount(() => document.removeEventListener('keydown', handleEscape, true))

const handleConfirm = async () => {
    if (isSubmitting.value) return

    const trimmed = notes.value.trim()

    // Validasi Client-side
    if (actionConfig.value.isNotesRequired && !trimmed) {
        validationError.value = props.actionType === 'revision'
            ? 'Catatan instruksi revisi wajib diisi agar pemohon mengetahui hal yang harus diperbaiki.'
            : 'Alasan penolakan dokumen wajib diisi.'
        return
    }

    if (props.actionType === 'reject' && trimmed.length < 5) {
        validationError.value = 'Alasan penolakan minimal 5 karakter untuk standar kepatuhan audit.'
        return
    }

    if (props.actionType === 'approve' && !userHasSignature.value) {
        validationError.value = 'Anda wajib memiliki spesimen tanda tangan digital sebelum menyetujui dokumen ini.'
        return
    }

    validationError.value = ''
    isSubmitting.value = true

    emit('confirm', {
        action: props.actionType,
        notes: trimmed || null,
        done: () => {
            isSubmitting.value = false
            emit('close')
        },
        fail: (errMsg) => {
            isSubmitting.value = false
            validationError.value = errMsg || 'Gagal memproses persetujuan.'
        },
    })
}
</script>

<template>
    <Teleport to="body">
        <div v-if="isOpen" class="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40" @click="!isSubmitting && emit('close')">
            <section ref="dialogElement" role="dialog" aria-modal="true" :aria-labelledby="`${dialogId}-title`" :aria-describedby="`${dialogId}-description`" :aria-busy="isSubmitting" tabindex="-1"
                class="decision-dialog relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 outline-none overflow-y-auto overscroll-contain"
                @click.stop @keydown="handleDialogKeydown">
                <div class="p-6 sm:p-7">
                    <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2.5">
                                <component :is="actionConfig.icon" class="size-5 shrink-0" :class="actionConfig.iconClass" aria-hidden="true" />
                                <h3 :id="`${dialogId}-title`" class="text-xl font-semibold text-slate-900 tracking-tight">{{ actionConfig.title }}</h3>
                            </div>
                            <p :id="`${dialogId}-description`" class="mt-3 text-sm text-slate-500 leading-relaxed">{{ actionConfig.description }}</p>
                        </div>
                        <button type="button" :disabled="isSubmitting" @click="emit('close')" class="decision-close -mr-1 -mt-1 rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40" aria-label="Tutup konfirmasi"><X class="size-4" /></button>
                    </div>

                    <div class="my-6 border-y border-slate-100 py-4 min-w-0">
                        <p class="text-sm font-medium text-slate-800 break-words">{{ documentNumber || 'Dokumen' }}</p>
                        <p v-if="documentTitle" class="mt-1 text-sm text-slate-500 break-words">{{ documentTitle }}</p>
                        <p v-if="currentStepName" class="mt-2 text-xs text-slate-400 break-words">{{ currentStepName }}</p>
                    </div>

                    <div v-if="actionType === 'approve' && !userHasSignature" class="mb-5 rounded-lg bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
                        <p>Lengkapi tanda tangan di profil untuk menyetujui dokumen.</p>
                        <button type="button" @click="isSignatureModalOpen = true" class="mt-2 inline-flex items-center gap-1.5 font-medium underline underline-offset-4"><FileSignature class="size-4" />Atur tanda tangan</button>
                    </div>

                    <div class="space-y-2">
                        <div class="flex items-center justify-between gap-3">
                            <label :for="`${dialogId}-notes`" class="text-sm font-medium text-slate-700">{{ actionConfig.notesLabel }}</label>
                            <span :id="`${dialogId}-requirement`" class="text-xs text-slate-400">{{ actionConfig.isNotesRequired ? 'Wajib diisi' : 'Opsional' }}</span>
                        </div>
                        <textarea :id="`${dialogId}-notes`" v-model="notes" rows="4" :disabled="isSubmitting" :required="actionConfig.isNotesRequired" :placeholder="actionConfig.placeholder" :aria-invalid="Boolean(validationError)" :aria-describedby="`${dialogId}-requirement${validationError ? ` ${dialogId}-error` : ''}`"
                            class="decision-notes w-full resize-y px-3.5 py-3 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 disabled:opacity-60"
                            :class="validationError ? 'border-rose-300' : 'border-slate-200'" />
                        <p v-if="validationError" :id="`${dialogId}-error`" role="alert" class="text-xs text-rose-700 flex items-start gap-1.5"><AlertTriangle class="size-3.5 shrink-0 mt-0.5" /><span>{{ validationError }}</span></p>
                    </div>
                </div>

                <div class="decision-actions flex items-center justify-end gap-2.5 px-6 sm:px-7 pb-6 sm:pb-7">
                    <button type="button" :disabled="isSubmitting" @click="emit('close')" class="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">Batal</button>
                    <button type="button" :disabled="isConfirmDisabled" @click="handleConfirm" class="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :class="actionConfig.btnClass">
                        <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
                        <span>{{ isSubmitting ? 'Memproses…' : actionConfig.confirmButtonText }}</span>
                    </button>
                </div>
            </section>
        </div>
        <SignaturePadModal v-if="isOpen && isSignatureModalOpen" :is-open="isSignatureModalOpen" @close="isSignatureModalOpen = false" @saved="isSignatureModalOpen = false" />
    </Teleport>
</template>

<style scoped>
.decision-dialog { max-height: calc(100dvh - 32px); }
.decision-notes { min-height: 112px; max-height: 240px; }
.decision-dialog button { cursor: pointer; min-height: 40px; }
.decision-dialog button:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.decision-dialog button:disabled { cursor: not-allowed; }
@media (max-width: 480px) {
    .decision-actions { display: grid; grid-template-columns: auto minmax(0, 1fr); }
    .decision-actions button { padding-left: 12px; padding-right: 12px; }
}
</style>
