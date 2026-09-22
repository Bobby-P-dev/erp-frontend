<script setup>
import { ref, computed, watch } from 'vue'
import { 
    CheckCircle2, 
    RotateCcw, 
    XCircle, 
    AlertTriangle,
    Loader2,
    X
} from '@lucide/vue'
import BaseButton from '../ui/BaseButton.vue'

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

const notes = ref('')
const validationError = ref('')
const isSubmitting = ref(false)

const actionConfig = computed(() => {
    switch (props.actionType) {
        case 'approve':
            return {
                title: 'Setujui Dokumen Ini?',
                description: `Anda akan memberikan persetujuan pada dokumen ${props.documentNumber || 'ini'}. Alur persetujuan akan berlanjut ke tahap berikutnya atau menyelesaikan workflow.`,
                notesLabel: 'Catatan Persetujuan (Opsional)',
                placeholder: 'Tuliskan catatan persetujuan jika diperlukan...',
                confirmButtonText: 'Konfirmasi Setujui',
                confirmVariant: 'primary',
                btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                icon: CheckCircle2,
                iconClass: 'text-emerald-600 bg-emerald-50',
                isNotesRequired: false,
            }
        case 'revision':
            return {
                title: 'Minta Revisi Dokumen',
                description: `Dokumen ${props.documentNumber || 'ini'} akan dikembalikan ke pemohon untuk diperbaiki sesuai instruksi Anda.`,
                notesLabel: 'Alasan / Instruksi Revisi *',
                placeholder: 'Jelaskan secara spesifik poin apa saja yang harus diperbaiki oleh pemohon...',
                confirmButtonText: 'Kirim Permintaan Revisi',
                confirmVariant: 'warning',
                btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
                icon: RotateCcw,
                iconClass: 'text-amber-600 bg-amber-50',
                isNotesRequired: true,
            }
        case 'reject':
            return {
                title: 'Tolak Pengajuan Dokumen',
                description: `Dokumen ${props.documentNumber || 'ini'} akan ditolak secara permanen. Tindakan ini tidak dapat dibatalkan.`,
                notesLabel: 'Alasan Penolakan Objektif *',
                placeholder: 'Tuliskan alasan penolakan yang jelas untuk catatan audit pengadaan...',
                confirmButtonText: 'Konfirmasi Tolak Dokumen',
                confirmVariant: 'danger',
                btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
                icon: XCircle,
                iconClass: 'text-rose-600 bg-rose-50',
                isNotesRequired: true,
            }
        default:
            return {}
    }
})

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        notes.value = ''
        validationError.value = ''
        isSubmitting.value = false
    }
})

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
        <div v-if="isOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <!-- Backdrop (Tanpa backdrop-blur agar scroll ringan dan tidak patah-patah) -->
            <div 
                class="fixed inset-0 bg-gray-900/40 transition-opacity"
                @click="!isSubmitting && emit('close')"
            ></div>

            <div 
                class="relative w-full max-w-lg transform overflow-hidden rounded-3xl bg-white p-6 sm:p-7 text-left shadow-2xl transition-all space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
            >
                    <!-- Close button -->
                    <button 
                        v-if="!isSubmitting"
                        @click="emit('close')"
                        class="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>

                    <!-- Header -->
                    <div class="flex items-start gap-4 pr-6">
                        <div 
                            class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                            :class="actionConfig.iconClass"
                        >
                            <component :is="actionConfig.icon" class="w-6 h-6" />
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900">
                                {{ actionConfig.title }}
                            </h3>
                            <p class="text-xs text-gray-500 mt-1 leading-relaxed">
                                {{ actionConfig.description }}
                            </p>
                        </div>
                    </div>

                    <!-- Context Pill -->
                    <div v-if="documentTitle" class="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-xs text-gray-600">
                        <span class="font-bold text-gray-800">{{ documentNumber }}:</span> {{ documentTitle }}
                    </div>

                    <!-- Textarea Form -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                            {{ actionConfig.notesLabel }}
                        </label>
                        <textarea
                            v-model="notes"
                            rows="4"
                            :disabled="isSubmitting"
                            :placeholder="actionConfig.placeholder"
                            class="w-full px-4 py-3 bg-gray-50 border rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all text-gray-900 font-medium placeholder:text-gray-400"
                            :class="validationError ? 'border-rose-300 ring-1 ring-rose-400 bg-rose-50/20' : 'border-gray-200'"
                        ></textarea>

                        <p v-if="validationError" class="text-xs text-rose-600 mt-2 flex items-center gap-1 font-semibold">
                            <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
                            {{ validationError }}
                        </p>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            :disabled="isSubmitting"
                            @click="emit('close')"
                            class="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                        >
                            Batal
                        </button>

                        <button
                            type="button"
                            :disabled="isSubmitting"
                            @click="handleConfirm"
                            :class="[
                                'px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50',
                                actionConfig.btnClass
                            ]"
                        >
                            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
                            <span>{{ actionConfig.confirmButtonText }}</span>
                        </button>
                    </div>
                </div>
            </div>
    </Teleport>
</template>
