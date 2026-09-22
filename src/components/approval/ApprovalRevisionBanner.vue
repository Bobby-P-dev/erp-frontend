<script setup>
import { 
    AlertTriangle, 
    Edit3, 
    Send, 
    MessageSquareQuote 
} from '@lucide/vue'
import BaseButton from '../ui/BaseButton.vue'

defineProps({
    revisionNotes: {
        type: String,
        default: '',
    },
    requestedBy: {
        type: String,
        default: '',
    },
    requestedAt: {
        type: String,
        default: '',
    },
    canResubmit: {
        type: Boolean,
        default: true,
    },
    canEdit: {
        type: Boolean,
        default: true,
    },
    isSubmitting: {
        type: Boolean,
        default: false,
    },
})

defineEmits(['edit', 'resubmit'])

const formatDate = (dateString) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d)
}
</script>

<template>
    <div class="bg-amber-50/90 border border-amber-200/80 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <!-- Subtle accent indicator bar -->
        <div class="absolute left-0 top-0 bottom-0 w-2 bg-amber-500"></div>

        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <AlertTriangle class="w-6 h-6" />
                </div>

                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-amber-950">
                            Dokumen Memerlukan Revisi
                        </h3>
                        <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200/60 text-amber-900">
                            Action Required
                        </span>
                    </div>

                    <p class="text-xs text-amber-800 leading-relaxed">
                        Pihak approver meminta perbaikan pada dokumen ini sebelum alur persetujuan dapat dilanjutkan.
                        <span v-if="requestedBy" class="font-semibold text-amber-950">
                            Diminta oleh: {{ requestedBy }}
                            <span v-if="requestedAt"> ({{ formatDate(requestedAt) }})</span>.
                        </span>
                    </p>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                <BaseButton
                    v-if="canEdit"
                    @click="$emit('edit')"
                    variant="outline"
                    size="sm"
                    class="border-amber-300 text-amber-900 hover:bg-amber-100/60"
                >
                    <Edit3 class="w-4 h-4 mr-1.5" />
                    Ubah Dokumen
                </BaseButton>

                <BaseButton
                    v-if="canResubmit"
                    @click="$emit('resubmit')"
                    :disabled="isSubmitting"
                    size="sm"
                    class="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                >
                    <Send class="w-4 h-4 mr-1.5" />
                    Kirim Ulang (Resubmit)
                </BaseButton>
            </div>
        </div>

        <!-- Approver Instruction / Notes Quote Box -->
        <div 
            v-if="revisionNotes"
            class="mt-4 ml-0 sm:ml-16 bg-white/80 border border-amber-200/70 rounded-2xl p-4 text-xs text-amber-950 shadow-2xs"
        >
            <div class="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                <MessageSquareQuote class="w-4 h-4" />
                Instruksi Perbaikan dari Approver:
            </div>
            <p class="italic leading-relaxed text-gray-800">
                "{{ revisionNotes }}"
            </p>
        </div>
    </div>
</template>
