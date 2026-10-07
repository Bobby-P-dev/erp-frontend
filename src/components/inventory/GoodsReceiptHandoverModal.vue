<script setup>
import { ref, watch } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { confirmGoodsReceiptHandover } from '../../services/inventoryServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { CheckCircle2, Check, Package } from '@lucide/vue'

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

const submitHandover = async () => {
    if (!props.target) return
    const requesterName = props.target.purchase_requisition?.requester?.name || 'pemohon'
    const isConfirmed = await showConfirm(
        'Serahkan Barang ke Pemohon?',
        `Konfirmasi bahwa barang dari penerimaan ${props.target.grn_number} telah diserahkan dan diambil oleh ${requesterName}. Status PR terkait akan berubah menjadi Selesai (Completed).`,
        'Ya, Konfirmasi Penyerahan'
    )

    if (isConfirmed) {
        isSubmitting.value = true
        try {
            showLoading('Memproses penyerahan barang...')
            await confirmGoodsReceiptHandover(props.target.id, {
                notes: notes.value
            })
            showSuccess('Berhasil!', `Barang telah berhasil diserahkan ke ${requesterName} dan status PR diselesaikan.`)
            emit('saved')
            close()
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal memproses penyerahan barang.'
            showError('Gagal!', msg, err)
        } finally {
            isSubmitting.value = false
        }
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
                        Serah Terima Barang ke Pemohon
                    </h3>
                    <p class="text-xs text-slate-500">
                        Konfirmasi pengambilan barang fisik oleh pemohon PR
                    </p>
                </div>
            </div>
        </template>

        <!-- Info Ringkas -->
        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Nomor Penerimaan:</span>
                <span class="font-mono font-bold text-blue-600">{{ target?.grn_number }}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Surat Jalan Vendor:</span>
                <span class="font-mono font-semibold text-slate-800">{{ target?.delivery_note_number || '-' }}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Nomor PR Acuan:</span>
                <span class="font-mono font-semibold text-slate-800">{{ target?.purchase_requisition?.pr_number || '-' }}</span>
            </div>
            <div class="flex items-center justify-between pt-1 border-t border-slate-200/80">
                <span class="text-slate-700 font-bold">Nama Pemohon:</span>
                <span class="font-bold text-slate-900">{{ target?.purchase_requisition?.requester?.name || 'Pemohon Terkait' }}</span>
            </div>
        </div>

        <!-- Catatan Serah Terima -->
        <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
                Catatan Serah Terima / Pengambilan
            </label>
            <textarea
                v-model="notes"
                rows="3"
                placeholder="Contoh: Barang telah diambil langsung di loket gudang dalam kondisi baik dan lengkap."
                class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            ></textarea>
        </div>

        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
            <Package class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>Dengan mengonfirmasi, status serah terima barang menjadi <strong>Sudah Diambil</strong> dan status Purchase Requisition (PR) pemohon akan diselesaikan secara otomatis.</span>
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
                @click="submitHandover"
                :disabled="isSubmitting"
                class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
                <Check class="w-4 h-4" />
                <span>{{ isSubmitting ? 'Memproses...' : 'Konfirmasi Penyerahan' }}</span>
            </button>
        </template>
    </BaseModal>
</template>
