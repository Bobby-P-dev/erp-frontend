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
    Ban,
    Trash2,
    HelpCircle,
    Loader2,
    MessageSquareQuote,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Info,
    FileCheck2,
    Send,
    ShieldCheck
} from '@lucide/vue'
import { dialogState, closeGlobalDialog } from '@/composables/useFeedback'

const DOC_CODE_REGEX = /\b((?:PR|PO|DP|PP|RFQ|GR|PAY|INV)-\d{4}-\d+)\b/g
const LEADING_DOC_REGEX = /^((?:PR|PO|DP|PP|RFQ|GR|PAY|INV)-\d{4}-\d+)\s*:\s*(.+)$/s

const inputRef = ref(null)
const localInput = ref('')
const localError = ref('')

const dialogIcon = computed(() => {
    const type = dialogState.value.type
    if (type === 'confirm') {
        const text = `${dialogState.value.title || ''} ${dialogState.value.text || ''}`
        if (/kirim|ajukan|publikasi|submit/i.test(text)) return Send
        if (/po|pr|rfq|draft|rencana|dokumen|pembelian|penerimaan/i.test(text)) return FileCheck2
        return ShieldCheck
    }

    if (type === 'danger') {
        const text = `${dialogState.value.title || ''} ${dialogState.value.text || ''}`
        return /batal|cancel|tolak|reject/i.test(text) && !/hapus|delete/i.test(text) ? Ban : Trash2
    }

    return {
        success: CheckCircle2,
        error: XCircle,
        prompt: dialogState.value.isDestructive ? AlertTriangle : MessageSquareQuote,
        info: Info,
    }[type] || HelpCircle
})

const descriptionParts = computed(() => {
    const raw = String(dialogState.value.text || '')
    if (!raw) return { docCode: null, segments: [] }

    let docCode = null
    let body = raw
    const leadingMatch = raw.match(LEADING_DOC_REGEX)
    if (leadingMatch) {
        docCode = leadingMatch[1]
        const rest = leadingMatch[2].trimStart()
        body = rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : ''
    }

    const segments = []
    let lastIndex = 0
    for (const match of body.matchAll(DOC_CODE_REGEX)) {
        if (match.index > lastIndex) {
            segments.push({ text: body.slice(lastIndex, match.index), isCode: false })
        }
        segments.push({ text: match[0], isCode: true })
        lastIndex = match.index + match[0].length
    }
    if (lastIndex < body.length) {
        segments.push({ text: body.slice(lastIndex), isCode: false })
    }

    return { docCode, segments }
})

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
                    <div class="flex-1 min-w-0 space-y-1.5">
                        <AlertDialogHeader class="feedback-header text-left space-y-1.5">
                            <div class="flex flex-wrap items-center gap-2">
                                <AlertDialogTitle class="feedback-title">
                                    {{ dialogState.title }}
                                </AlertDialogTitle>
                                <span
                                    v-if="descriptionParts.docCode"
                                    class="inline-flex items-center rounded-md bg-[#eef4fc] px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight text-[#014baa] ring-1 ring-inset ring-blue-200/80"
                                >
                                    {{ descriptionParts.docCode }}
                                </span>
                            </div>
                            <AlertDialogDescription v-if="descriptionParts.segments.length" class="feedback-description">
                                <template v-for="(seg, idx) in descriptionParts.segments" :key="idx">
                                    <code
                                        v-if="seg.isCode"
                                        class="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-slate-900 ring-1 ring-inset ring-slate-200/80"
                                    >{{ seg.text }}</code>
                                    <template v-else>{{ seg.text }}</template>
                                </template>
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
    max-width: 468px;
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    padding: 24px 24px 20px;
    gap: 0;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    box-shadow: 0 24px 64px -20px rgb(15 23 42 / 30%), 0 8px 20px -8px rgb(15 23 42 / 10%);
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
    background: #eef4fc;
    color: #014baa;
    box-shadow: inset 0 0 0 1px rgb(1 75 170 / 12%);
}
[data-feedback-type='success'] .feedback-icon {
    background: #ecfdf5;
    color: #059669;
    box-shadow: inset 0 0 0 1px rgb(5 150 105 / 15%);
}
[data-feedback-type='error'] .feedback-icon,
[data-feedback-type='danger'] .feedback-icon {
    background: #fff1f2;
    color: #e11d48;
    box-shadow: inset 0 0 0 1px rgb(225 29 72 / 15%);
}
[data-feedback-type='prompt'] .feedback-icon {
    background: #fffbeb;
    color: #b45309;
    box-shadow: inset 0 0 0 1px rgb(180 83 9 / 15%);
}
:global(.feedback-dialog .feedback-title) {
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.02em;
    color: #0f172a;
    overflow-wrap: anywhere;
    text-align: left;
}
:global(.feedback-dialog .feedback-description) {
    font-size: 13.5px;
    line-height: 1.65;
    font-weight: 400;
    color: #475569;
    overflow-wrap: anywhere;
    white-space: pre-line;
    text-align: left;
}
:global(.feedback-dialog .feedback-actions) {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    margin: 20px -24px -20px;
    padding: 14px 24px;
    border-top: 1px solid #f1f5f9;
    border-radius: 0 0 17px 17px;
    background: #f8fafc;
}
.feedback-button {
    min-height: 38px;
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    cursor: pointer;
    transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 120ms ease;
    overflow-wrap: anywhere;
}
.feedback-button:active { transform: scale(0.98); }
.feedback-button:focus-visible { outline: 2px solid #014baa; outline-offset: 2px; }
.feedback-cancel { border: 1px solid #cbd5e1; background: #ffffff; color: #334155; }
.feedback-cancel:hover { background: #f1f5f9; border-color: #94a3b8; }
.feedback-confirm {
    border: 1px solid transparent;
    background: #014baa;
    color: #ffffff;
    box-shadow: 0 1px 2px rgb(1 75 170 / 24%);
}
.feedback-confirm:hover {
    background: #013c89;
    box-shadow: 0 4px 12px rgb(1 75 170 / 22%);
}
.feedback-destructive {
    background: #dc2626;
    box-shadow: 0 1px 2px rgb(220 38 38 / 24%);
}
.feedback-destructive:hover {
    background: #b91c1c;
    box-shadow: 0 4px 12px rgb(220 38 38 / 22%);
}
.feedback-destructive:focus-visible { outline-color: #dc2626; }
@media (max-width: 480px) {
    :global(.feedback-dialog[data-slot='alert-dialog-content']) { padding: 20px 20px 18px; }
    .feedback-heading { flex-direction: column; gap: 12px; }
    :global(.feedback-dialog .feedback-actions) {
        flex-direction: column-reverse;
        margin: 18px -20px -18px;
        padding: 14px 20px;
    }
    .feedback-button { width: 100%; min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) {
    :global(.feedback-dialog[data-slot='alert-dialog-content']), .feedback-button { animation: none; transition: none; }
    .feedback-button:active { transform: none; }
}
</style>
