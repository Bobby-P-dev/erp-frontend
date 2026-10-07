<script setup>
import { ref, watch } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { confirmPurchaseRequisitionReceipt } from '../../services/purchaseRequisitionServices.js'
import { formatDate } from '../../composables/useFormatter.js'
import { showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { CheckCircle2, Package } from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    target: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['update:modelValue', 'close', 'saved'])

const notes = ref('')
const isSubmitting = ref(false)

watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        notes.value = ''
    }
})

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

const handleConfirmReceipt = async () => {
    if (!props.target) return

    const isConfirmed = await showConfirm(
        'Konfirmasi Terima Barang?',
        `Konfirmasi bahwa Anda telah mengambil/menerima barang fisik untuk PR ${props.target.pr_number}. Status PR akan berubah menjadi Selesai (Completed).`,
        'Ya, Barang Sudah Diterima'
    )

    if (!isConfirmed) return

    isSubmitting.value = true
    try {
        await confirmPurchaseRequisitionReceipt(props.target.id, {
            notes: notes.value
        })
        showSuccess('Berhasil!', 'Barang telah dikonfirmasi diterima dan PR diselesaikan.')
        emit('saved')
        close()
    } catch (err) {
        showError('Gagal!', err.response?.data?.message || 'Gagal mengonfirmasi penerimaan barang.', err)
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        @close="close"
        size="lg"
        body-class="p-6 space-y-4 text-xs"
    >
        <template #header>
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 class="w-5 h-5" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-slate-900 tracking-tight">
                        Konfirmasi Penerimaan Barang
                    </h3>
                    <p class="text-xs text-slate-500">
                        Verifikasi pengambilan barang fisik di gudang oleh pemohon
                    </p>
                </div>
            </div>
        </template>

        <!-- Ringkasan PR -->
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Nomor Purchase Requisition:</span>
                <span class="font-mono font-bold text-blue-600 text-sm">{{ target?.pr_number }}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Tanggal Pengajuan:</span>
                <span class="font-medium text-slate-800">{{ formatDate(target?.request_date) }}</span>
            </div>
            <div class="pt-2 border-t border-slate-200">
                <span class="text-slate-500 font-medium block mb-1">Keperluan Pengadaan:</span>
                <p class="text-slate-800 font-medium leading-relaxed">{{ target?.purpose }}</p>
            </div>
        </div>

        <!-- Input Catatan Penerimaan -->
        <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
                Catatan Penerimaan / Kondisi Barang (Opsional)
            </label>
            <textarea
                v-model="notes"
                rows="3"
                placeholder="Contoh: Barang sudah diambil dari loket gudang dan telah diperiksa, semua berfungsi dengan baik."
                class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
            ></textarea>
        </div>

        <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
            <Package class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Setelah konfirmasi ini disimpan, status PR akan berubah menjadi <strong>Selesai (Completed)</strong> dan siklus pengadaan untuk dokumen ini resmi ditutup.</span>
        </div>

        <template #footer>
            <button
                type="button"
                @click="close"
                class="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg border border-slate-200 bg-white cursor-pointer"
            >
                Batal
            </button>
            <button
                type="button"
                @click="handleConfirmReceipt"
                :disabled="isSubmitting"
                class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
                <CheckCircle2 class="w-4 h-4" />
                <span>{{ isSubmitting ? 'Menyimpan...' : 'Ya, Barang Sudah Diterima' }}</span>
            </button>
        </template>
    </BaseModal>
</template>
