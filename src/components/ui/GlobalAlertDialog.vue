<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import {
    AlertTriangle,
    Trash2,
    HelpCircle,
    Loader2,
    MessageSquareQuote,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Info
} from '@lucide/vue'
import { dialogState, closeGlobalDialog } from '@/composables/useFeedback'

const inputRef = ref(null)
const localInput = ref('')
const localError = ref('')
const dialogIcon = computed(() => ({
    success: CheckCircle2,
    error: XCircle,
    danger: Trash2,
    prompt: dialogState.value.isDestructive ? AlertTriangle : MessageSquareQuote,
    info: Info,
}[dialogState.value.type] || HelpCircle))

watch(
    () => dialogState.value.isOpen,
    async (isOpen) => {
        if (isOpen) {
            localInput.value = dialogState.value.inputValue || ''
            localError.value = ''
            if (dialogState.value.type === 'prompt') {
                await nextTick()
                inputRef.value?.focus()
            }
        }
    }
)

const handleCancel = () => {
    if (dialogState.value.resolve) {
        if (dialogState.value.type === 'prompt') {
            dialogState.value.resolve({ isConfirmed: false, value: null })
        } else {
            dialogState.value.resolve(false)
        }
    }
    closeGlobalDialog()
}

const handleConfirm = () => {
    if (dialogState.value.type === 'prompt') {
        const val = localInput.value.trim()
        if (dialogState.value.validator) {
            const err = dialogState.value.validator(val)
            if (err) {
                localError.value = typeof err === 'string' ? err : 'Input tidak valid!'
                inputRef.value?.focus()
                return
            }
        } else if (!val) {
            localError.value = 'Kolom ini wajib diisi!'
            inputRef.value?.focus()
            return
        }

        if (dialogState.value.resolve) {
            dialogState.value.resolve({ isConfirmed: true, value: val })
        }
        dialogState.value.isOpen = false
        return
    }

    if (dialogState.value.resolve) {
        dialogState.value.resolve(true)
    }
    dialogState.value.isOpen = false
}

const handleKeydown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleConfirm()
    }
}
</script>

<template>
    <AlertDialog :open="dialogState.isOpen">
        <AlertDialogContent
            class="feedback-dialog"
            :data-feedback-type="dialogState.type"
            @escape-key-down="dialogState.type !== 'loading' && handleCancel()"
            @pointer-down-outside="dialogState.type !== 'loading' && handleCancel()"
        >
            <!-- Loading State -->
            <div v-if="dialogState.type === 'loading'" class="py-6 sm:py-8 flex flex-col items-center text-center space-y-4">
                <div class="feedback-icon" aria-hidden="true">
                    <Loader2 class="size-5 animate-spin motion-reduce:animate-none" />
                </div>
                <div class="space-y-1.5 max-w-sm">
                    <AlertDialogTitle class="feedback-title">
                        {{ dialogState.title || 'Memproses Data...' }}
                    </AlertDialogTitle>
                    <AlertDialogDescription class="feedback-description" role="status" aria-live="polite">
                        {{ dialogState.text || 'Mohon tunggu sebentar, sistem sedang menyelesaikan tindakan ini.' }}
                    </AlertDialogDescription>
                </div>
            </div>

            <!-- Standard Dialog / Confirm / Prompt / Danger -->
            <template v-else>
                <div class="feedback-heading">
                    <!-- Contextual Soft-Circle Icon Badge -->
                    <div class="feedback-icon" aria-hidden="true">
                        <component :is="dialogIcon" class="size-5" />
                    </div>

                    <!-- Textual Content -->
                    <div class="flex-1 min-w-0 pt-0.5 space-y-1.5">
                        <AlertDialogHeader class="feedback-header text-left space-y-1.5">
                            <AlertDialogTitle class="feedback-title">
                                {{ dialogState.title }}
                            </AlertDialogTitle>
                            <AlertDialogDescription class="feedback-description">
                                {{ dialogState.text }}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>
                </div>

                <!-- Prompt Input (Textarea) -->
                <div v-if="dialogState.type === 'prompt'" class="mt-5 space-y-2">
                    <label for="feedback-reason" class="block text-sm font-medium text-slate-700">
                        Alasan / Keterangan:
                    </label>
                    <textarea
                        ref="inputRef"
                        id="feedback-reason"
                        :aria-invalid="!!localError"
                        :aria-describedby="localError ? 'feedback-error' : undefined"
                        v-model="localInput"
                        rows="4"
                        :placeholder="dialogState.placeholder || 'Tuliskan keterangan di sini...'"
                        class="w-full rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFF] px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all resize-none leading-relaxed"
                        @keydown="handleKeydown"
                    ></textarea>
                    <div v-if="localError" id="feedback-error" role="alert" class="flex items-center gap-1.5 text-xs text-[#DC2626] font-medium">
                        <AlertCircle class="size-4 shrink-0" />
                        <span>{{ localError }}</span>
                    </div>
                    <p class="text-xs text-[#64748B] text-right">
                        Tekan <kbd class="px-1.5 py-0.5 bg-[#F8FAFF] rounded text-[#0F172A] border border-[#E2E8F0] font-mono text-[11px]">Ctrl+Enter</kbd> untuk konfirmasi
                    </p>
                </div>

                <!-- Footer Buttons -->
                <AlertDialogFooter class="feedback-actions">
                    <button
                        v-if="dialogState.showCancel"
                        type="button"
                        class="feedback-button feedback-cancel"
                        @click="handleCancel"
                    >
                        {{ dialogState.cancelText || 'Batal' }}
                    </button>
                    <button
                        type="button"
                        :class="[
                            'feedback-button feedback-confirm',
                            dialogState.type === 'danger' || dialogState.type === 'error' || (dialogState.type === 'prompt' && dialogState.isDestructive)
                                ? 'feedback-destructive'
                                : ''
                        ]"
                        @click="handleConfirm"
                    >
                        {{ dialogState.confirmText || 'Ya, Lanjutkan' }}
                    </button>
                </AlertDialogFooter>
            </template>
        </AlertDialogContent>
    </AlertDialog>
</template>

<style scoped>
:global(.feedback-dialog[data-slot='alert-dialog-content']) {
    width: calc(100% - 2rem);
    max-width: 500px;
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    padding: 28px;
    gap: 0;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    box-shadow: 0 24px 80px -24px rgb(15 23 42 / 32%);
}
.feedback-heading { display: flex; align-items: flex-start; gap: 14px; }
:global(.feedback-dialog .feedback-header) { align-items: start; justify-items: start; text-align: left; }
.feedback-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 12px;
    background: #eff6ff;
    color: #2563eb;
}
[data-feedback-type='success'] .feedback-icon { background: #ecfdf5; color: #059669; }
[data-feedback-type='error'] .feedback-icon,
[data-feedback-type='danger'] .feedback-icon { background: #fff1f2; color: #e11d48; }
[data-feedback-type='prompt'] .feedback-icon { background: #fffbeb; color: #b45309; }
:global(.feedback-dialog .feedback-title) { font-size: 18px; font-weight: 600; line-height: 1.5; letter-spacing: -0.025em; color: #0f172a; overflow-wrap: anywhere; text-align: left; }
:global(.feedback-dialog .feedback-description) { font-size: 14px; line-height: 1.75; font-weight: 400; color: #64748b; overflow-wrap: anywhere; white-space: pre-line; text-align: left; }
:global(.feedback-dialog .feedback-actions) {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 10px;
    margin: 24px 0 0;
    padding: 20px 0 0;
    border-top: 1px solid #f1f5f9;
    border-radius: 0;
    background: transparent;
}
.feedback-button { min-height: 42px; padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; line-height: 1.5; cursor: pointer; transition: background-color 150ms; overflow-wrap: anywhere; }
.feedback-button:focus-visible { outline: 2px solid #3b82f6; outline-offset: 3px; }
.feedback-cancel { border: 1px solid #e2e8f0; background: white; color: #475569; }
.feedback-cancel:hover { background: #f8fafc; }
.feedback-confirm { border: 1px solid transparent; background: #0f172a; color: white; }
.feedback-confirm:hover { background: #1e293b; }
.feedback-destructive { background: #dc2626; }
.feedback-destructive:hover { background: #b91c1c; }
@media (max-width: 480px) {
    :global(.feedback-dialog[data-slot='alert-dialog-content']) { padding: 22px; }
    .feedback-heading { flex-direction: column; gap: 14px; }
    :global(.feedback-dialog .feedback-actions) { flex-direction: column-reverse; }
    .feedback-button { width: 100%; min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) {
    :global(.feedback-dialog[data-slot='alert-dialog-content']), .feedback-button { animation: none; transition: none; }
}
</style>
