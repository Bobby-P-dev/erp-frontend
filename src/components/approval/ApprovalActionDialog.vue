<script setup>
import { ref, computed, watch } from 'vue'
import { 
    CheckCircle2, 
    RotateCcw, 
    XCircle, 
    AlertTriangle,
    Loader2,
    X,
    FileSignature,
    ShieldCheck,
    FileText,
    MessageSquareQuote
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
                title: 'Setujui Dokumen Ini?',
                description: `Anda akan memberikan persetujuan pada dokumen ${props.documentNumber || 'ini'}. Alur persetujuan akan berlanjut ke tahap berikutnya atau menyelesaikan workflow.`,
                notesLabel: 'Catatan Persetujuan',
                placeholder: 'Tuliskan catatan persetujuan jika diperlukan (opsional)...',
                confirmButtonText: 'Konfirmasi Setujui',
                btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                icon: CheckCircle2,
                confirmIcon: CheckCircle2,
                iconClass: 'text-emerald-600 bg-emerald-50 border border-emerald-200',
                isNotesRequired: false,
            }
        case 'revision':
            return {
                title: 'Minta Revisi Dokumen',
                description: `Dokumen ${props.documentNumber || 'ini'} akan dikembalikan ke pemohon untuk diperbaiki sesuai instruksi Anda.`,
                notesLabel: 'Alasan / Instruksi Revisi',
                placeholder: 'Jelaskan secara spesifik poin apa saja yang harus diperbaiki oleh pemohon...',
                confirmButtonText: 'Kirim Permintaan Revisi',
                btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
                icon: RotateCcw,
                confirmIcon: RotateCcw,
                iconClass: 'text-amber-600 bg-amber-50 border border-amber-200',
                isNotesRequired: true,
            }
        case 'reject':
            return {
                title: 'Tolak Pengajuan Dokumen',
                description: `Dokumen ${props.documentNumber || 'ini'} akan ditolak secara permanen. Tindakan ini tidak dapat dibatalkan.`,
                notesLabel: 'Alasan Penolakan Objektif',
                placeholder: 'Tuliskan alasan penolakan yang jelas untuk catatan audit pengadaan (minimal 5 karakter)...',
                confirmButtonText: 'Konfirmasi Tolak Dokumen',
                btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
                icon: XCircle,
                confirmIcon: XCircle,
                iconClass: 'text-rose-600 bg-rose-50 border border-rose-200',
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
        <div 
            v-if="isOpen" 
            class="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/50 animate-in fade-in duration-150"
            @click="!isSubmitting && emit('close')"
        >
            <div 
                class="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 sm:p-7 text-left shadow-2xl border border-slate-200 transition-all space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain my-auto animate-in fade-in zoom-in-95 duration-150"
                @click.stop
            >
                <!-- Close button -->
                <button 
                    v-if="!isSubmitting"
                    type="button"
                    @click="emit('close')"
                    class="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Batal / Tutup"
                >
                    <X class="w-5 h-5" />
                </button>

                <!-- Header -->
                <div class="flex items-start gap-4 pr-8">
                    <div 
                        class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                        :class="actionConfig.iconClass"
                    >
                        <component :is="actionConfig.icon" class="w-6 h-6" />
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 tracking-tight">
                            {{ actionConfig.title }}
                        </h3>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            {{ actionConfig.description }}
                        </p>
                    </div>
                </div>

                <!-- Document Context Card -->
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shrink-0">
                            <FileText class="w-4 h-4 text-blue-600" />
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-mono font-bold text-slate-900">{{ documentNumber || 'Dokumen' }}</span>
                                <span v-if="currentStepName" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                    {{ currentStepName }}
                                </span>
                            </div>
                            <p v-if="documentTitle" class="text-slate-600 truncate mt-0.5 font-medium">
                                {{ documentTitle }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Digital Signature Verification Box (Only for Approve Action) -->
                <div v-if="actionType === 'approve'" class="space-y-2">
                    <!-- State 1: User does not have a signature -->
                    <div 
                        v-if="!userHasSignature" 
                        class="rounded-xl border border-amber-200 bg-amber-50/90 p-4 space-y-3"
                    >
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle class="w-4 h-4 text-amber-600" />
                            </div>
                            <div class="space-y-1 min-w-0">
                                <h4 class="text-xs font-bold text-amber-900">
                                    Spesimen Tanda Tangan Digital Wajib Dilampirkan
                                </h4>
                                <p class="text-[11px] text-amber-800 leading-relaxed">
                                    Sesuai kepatuhan ISO & alur persetujuan, Anda wajib memiliki spesimen tanda tangan digital untuk menyetujui pengajuan ini. Tanda tangan akan dibubuhkan secara permanen pada dokumen audit.
                                </p>
                            </div>
                        </div>
                        <div class="pt-1">
                            <button
                                type="button"
                                @click="isSignatureModalOpen = true"
                                class="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                                <FileSignature class="w-4 h-4" />
                                <span>Buat / Unggah Tanda Tangan Sekarang</span>
                            </button>
                        </div>
                    </div>

                    <!-- State 2: User has active signature -->
                    <div 
                        v-else 
                        class="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-900 shadow-2xs"
                    >
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                                <ShieldCheck class="w-4.5 h-4.5 text-emerald-600" />
                            </div>
                            <div class="min-w-0">
                                <div class="font-bold text-emerald-950 flex items-center gap-1.5">
                                    <span>Tanda Tangan Digital Terverifikasi</span>
                                    <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Aktif
                                    </span>
                                </div>
                                <p class="text-[11px] text-emerald-700 truncate mt-0.5">
                                    Spesimen digital Anda akan otomatis disematkan pada lembar persetujuan.
                                </p>
                            </div>
                        </div>
                        <div v-if="authStore.user?.signature_url" class="shrink-0 bg-white border border-emerald-200 rounded-lg p-1 shadow-2xs">
                            <img 
                                :src="authStore.user.signature_url" 
                                alt="Specimen" 
                                class="h-6 max-w-[70px] object-contain"
                            />
                        </div>
                    </div>
                </div>

                <!-- Textarea Form -->
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <MessageSquareQuote class="w-3.5 h-3.5 text-slate-500" />
                            <span>{{ actionConfig.notesLabel }}</span>
                            <span v-if="actionConfig.isNotesRequired" class="text-rose-600">*</span>
                        </label>
                        <span class="text-[11px] text-slate-400">
                            {{ actionConfig.isNotesRequired ? 'Wajib diisi' : 'Opsional' }}
                        </span>
                    </div>

                    <textarea
                        v-model="notes"
                        rows="3"
                        :disabled="isSubmitting"
                        :placeholder="actionConfig.placeholder"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all text-slate-900 placeholder:text-slate-400 leading-relaxed font-normal"
                        :class="[
                            validationError 
                                ? 'border-rose-300 ring-2 ring-rose-400/40 bg-rose-50/20' 
                                : 'border-slate-300 focus:ring-blue-600/30 focus:border-blue-600'
                        ]"
                    ></textarea>

                    <p v-if="validationError" class="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
                        <span>{{ validationError }}</span>
                    </p>
                </div>

                <!-- Actions -->
                <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                        type="button"
                        :disabled="isSubmitting"
                        @click="emit('close')"
                        class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                        Batal
                    </button>

                    <button
                        type="button"
                        :disabled="isConfirmDisabled"
                        @click="handleConfirm"
                        class="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        :class="actionConfig.btnClass"
                    >
                        <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
                        <component :is="actionConfig.confirmIcon" v-else class="w-4 h-4" />
                        <span>{{ actionConfig.confirmButtonText }}</span>
                    </button>
                </div>
            </div>
        </div>

            <!-- In-place Signature Pad Modal -->
            <SignaturePadModal 
                :is-open="isSignatureModalOpen" 
                @close="isSignatureModalOpen = false" 
                @saved="isSignatureModalOpen = false" 
            />
    </Teleport>
</template>
