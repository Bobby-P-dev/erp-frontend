<script setup>
import { ref, watch, nextTick } from 'vue'
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
    Check
} from '@lucide/vue'
import { dialogState, closeGlobalDialog } from '@/composables/useFeedback'

const inputRef = ref(null)
const localInput = ref('')
const localError = ref('')

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
            class="sm:max-w-lg md:max-w-xl w-[calc(100%-2rem)] p-7 sm:p-9 rounded-2xl border border-slate-200/90 bg-white shadow-2xl text-slate-800 focus:outline-none"
            @escape-key-down="dialogState.type !== 'loading' && handleCancel()"
            @pointer-down-outside="dialogState.type !== 'loading' && handleCancel()"
        >
            <!-- Loading State -->
            <div v-if="dialogState.type === 'loading'" class="py-6 sm:py-8 flex flex-col items-center text-center space-y-5">
                <div class="relative size-20 flex items-center justify-center">
                    <div class="absolute inset-0 rounded-2xl bg-blue-100/60 animate-ping opacity-30"></div>
                    <div class="size-18 rounded-2xl bg-blue-50 border border-blue-200/90 flex items-center justify-center text-blue-600 shadow-sm">
                        <Loader2 class="size-9 animate-spin" />
                    </div>
                </div>
                <div class="space-y-2 max-w-sm">
                    <h3 class="text-lg font-bold text-slate-900 tracking-tight">
                        {{ dialogState.title || 'Memproses Data...' }}
                    </h3>
                    <p class="text-sm text-slate-500 leading-relaxed">
                        {{ dialogState.text || 'Mohon tunggu sebentar, sistem sedang menyelesaikan tindakan ini.' }}
                    </p>
                </div>
            </div>

            <!-- Standard Dialog / Confirm / Prompt / Danger -->
            <template v-else>
                <div class="flex items-start gap-5">
                    <!-- Contextual Icon Badge -->
                    <div
                        v-if="dialogState.type === 'danger'"
                        class="size-13 shrink-0 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs"
                    >
                        <Trash2 class="size-6.5" />
                    </div>
                    <div
                        v-else-if="dialogState.type === 'prompt' && dialogState.isDestructive"
                        class="size-13 shrink-0 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs"
                    >
                        <AlertTriangle class="size-6.5" />
                    </div>
                    <div
                        v-else-if="dialogState.type === 'prompt'"
                        class="size-13 shrink-0 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs"
                    >
                        <MessageSquareQuote class="size-6.5" />
                    </div>
                    <div
                        v-else
                        class="size-13 shrink-0 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs"
                    >
                        <HelpCircle class="size-6.5" />
                    </div>

                    <!-- Textual Content -->
                    <div class="flex-1 min-w-0 pt-0.5 space-y-1.5">
                        <AlertDialogHeader class="text-left space-y-1.5">
                            <AlertDialogTitle class="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                                {{ dialogState.title }}
                            </AlertDialogTitle>
                            <AlertDialogDescription class="text-sm text-slate-600 leading-relaxed font-normal">
                                {{ dialogState.text }}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>
                </div>

                <!-- Prompt Input (Textarea) -->
                <div v-if="dialogState.type === 'prompt'" class="mt-5 space-y-2">
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Alasan / Keterangan:
                    </label>
                    <textarea
                        ref="inputRef"
                        v-model="localInput"
                        rows="4"
                        :placeholder="dialogState.placeholder || 'Tuliskan keterangan di sini...'"
                        class="w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all resize-none leading-relaxed"
                        @keydown="handleKeydown"
                    ></textarea>
                    <div v-if="localError" class="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                        <AlertCircle class="size-4 shrink-0" />
                        <span>{{ localError }}</span>
                    </div>
                    <p class="text-xs text-slate-400 text-right">
                        Tekan <kbd class="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200 font-mono text-[11px]">Ctrl+Enter</kbd> untuk konfirmasi
                    </p>
                </div>

                <!-- Footer Buttons -->
                <AlertDialogFooter class="mt-7 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        v-if="dialogState.showCancel"
                        type="button"
                        class="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer select-none"
                        @click="handleCancel"
                    >
                        {{ dialogState.cancelText || 'Batal' }}
                    </button>
                    <button
                        type="button"
                        :class="[
                            'px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-sm transition-all cursor-pointer select-none active:scale-[0.98]',
                            dialogState.type === 'danger' || (dialogState.type === 'prompt' && dialogState.isDestructive)
                                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500/40'
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/40'
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
