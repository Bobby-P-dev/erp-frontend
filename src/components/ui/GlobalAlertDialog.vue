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
    CheckCircle2,
    XCircle,
    Info
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
            class="sm:max-w-lg md:max-w-xl w-[calc(100%-2rem)] p-6 sm:p-7 rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25),0_12px_32px_-8px_rgba(15,23,42,0.18)] text-[#0F172A] focus:outline-none"
            @escape-key-down="dialogState.type !== 'loading' && handleCancel()"
            @pointer-down-outside="dialogState.type !== 'loading' && handleCancel()"
        >
            <!-- Loading State -->
            <div v-if="dialogState.type === 'loading'" class="py-6 sm:py-8 flex flex-col items-center text-center space-y-4">
                <div class="size-16 rounded-full bg-[#BFDBFE] text-[#2563EB] flex items-center justify-center shadow-xs">
                    <Loader2 class="size-8 animate-spin" />
                </div>
                <div class="space-y-1.5 max-w-sm">
                    <h3 class="text-lg font-bold text-[#0F172A] tracking-tight">
                        {{ dialogState.title || 'Memproses Data...' }}
                    </h3>
                    <p class="text-sm text-[#64748B] leading-relaxed">
                        {{ dialogState.text || 'Mohon tunggu sebentar, sistem sedang menyelesaikan tindakan ini.' }}
                    </p>
                </div>
            </div>

            <!-- Standard Dialog / Confirm / Prompt / Danger -->
            <template v-else>
                <div class="flex items-start gap-4 sm:gap-5">
                    <!-- Contextual Soft-Circle Icon Badge -->
                    <div
                        v-if="dialogState.type === 'success'"
                        class="size-13 shrink-0 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shadow-xs"
                    >
                        <CheckCircle2 class="size-6.5" />
                    </div>
                    <div
                        v-else-if="dialogState.type === 'error'"
                        class="size-13 shrink-0 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shadow-xs"
                    >
                        <XCircle class="size-6.5" />
                    </div>
                    <div
                        v-else-if="dialogState.type === 'danger'"
                        class="size-13 shrink-0 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shadow-xs"
                    >
                        <Trash2 class="size-6.5" />
                    </div>
                    <div
                        v-else-if="dialogState.type === 'prompt' && dialogState.isDestructive"
                        class="size-13 shrink-0 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shadow-xs"
                    >
                        <AlertTriangle class="size-6.5" />
                    </div>
                    <div
                        v-else-if="dialogState.type === 'prompt'"
                        class="size-13 shrink-0 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shadow-xs"
                    >
                        <MessageSquareQuote class="size-6.5" />
                    </div>
                    <div
                        v-else-if="dialogState.type === 'info'"
                        class="size-13 shrink-0 rounded-full bg-[#BFDBFE] text-[#2563EB] flex items-center justify-center shadow-xs"
                    >
                        <Info class="size-6.5" />
                    </div>
                    <div
                        v-else
                        class="size-13 shrink-0 rounded-full bg-[#BFDBFE] text-[#2563EB] flex items-center justify-center shadow-xs"
                    >
                        <HelpCircle class="size-6.5" />
                    </div>

                    <!-- Textual Content -->
                    <div class="flex-1 min-w-0 pt-0.5 space-y-1.5">
                        <AlertDialogHeader class="text-left space-y-1.5">
                            <AlertDialogTitle class="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight leading-snug">
                                {{ dialogState.title }}
                            </AlertDialogTitle>
                            <AlertDialogDescription class="text-sm text-[#64748B] leading-relaxed font-normal">
                                {{ dialogState.text }}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>
                </div>

                <!-- Prompt Input (Textarea) -->
                <div v-if="dialogState.type === 'prompt'" class="mt-5 space-y-2">
                    <label class="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                        Alasan / Keterangan:
                    </label>
                    <textarea
                        ref="inputRef"
                        v-model="localInput"
                        rows="4"
                        :placeholder="dialogState.placeholder || 'Tuliskan keterangan di sini...'"
                        class="w-full rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFF] px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] transition-all resize-none leading-relaxed"
                        @keydown="handleKeydown"
                    ></textarea>
                    <div v-if="localError" class="flex items-center gap-1.5 text-xs text-[#DC2626] font-medium">
                        <AlertCircle class="size-4 shrink-0" />
                        <span>{{ localError }}</span>
                    </div>
                    <p class="text-xs text-[#64748B] text-right">
                        Tekan <kbd class="px-1.5 py-0.5 bg-[#F8FAFF] rounded text-[#0F172A] border border-[#E2E8F0] font-mono text-[11px]">Ctrl+Enter</kbd> untuk konfirmasi
                    </p>
                </div>

                <!-- Footer Buttons -->
                <AlertDialogFooter class="mt-6 sm:mt-7 flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]/70">
                    <button
                        v-if="dialogState.showCancel"
                        type="button"
                        class="px-5 py-2.5 text-sm font-semibold rounded-[12px] border border-[#E2E8F0] bg-white text-[#1E293B] hover:bg-[#F8FAFC] transition-colors cursor-pointer select-none"
                        @click="handleCancel"
                    >
                        {{ dialogState.cancelText || 'Batal' }}
                    </button>
                    <button
                        type="button"
                        :class="[
                            'px-5 py-2.5 text-sm font-semibold rounded-[12px] text-white shadow-sm transition-all cursor-pointer select-none active:scale-[0.98]',
                            dialogState.type === 'danger' || dialogState.type === 'error' || (dialogState.type === 'prompt' && dialogState.isDestructive)
                                ? 'bg-[#DC2626] hover:bg-[#B91C1C] focus:ring-2 focus:ring-red-400/40'
                                : 'bg-[#0F172A] hover:bg-[#2563EB] focus:ring-2 focus:ring-blue-400/40'
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
