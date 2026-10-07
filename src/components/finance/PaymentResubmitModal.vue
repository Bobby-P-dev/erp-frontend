<script setup>
import { ref, watch } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { resubmitPaymentRequest } from '../../services/financeServices.js'
import { showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { RotateCcw, Send } from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    item: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['update:modelValue', 'close', 'saved'])

const isSubmitting = ref(false)
const form = ref({
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    notes: ''
})

watch(() => [props.modelValue, props.item], ([isOpen, it]) => {
    if (isOpen && it) {
        form.value = {
            bank_name: it.bank_name || '',
            bank_account_number: it.bank_account_number || '',
            bank_account_holder: it.bank_account_holder || '',
            notes: ''
        }
    }
}, { immediate: true })

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

const handleSubmit = async () => {
    if (!form.value.bank_name || !form.value.bank_account_number || !form.value.bank_account_holder) {
        showError('Validasi Gagal', 'Lengkapi seluruh data rekening bank penerima.')
        return
    }

    const confirmed = await showConfirm(
        'Ajukan Ulang Permohonan?',
        `Apakah Anda yakin data rekening untuk tagihan ${props.item?.prq_number} sudah sesuai?`,
        'Ya, Ajukan Ulang'
    )

    if (!confirmed) return

    isSubmitting.value = true
    try {
        await resubmitPaymentRequest(props.item.id, form.value)
        showSuccess('Berhasil!', 'Permohonan pembayaran berhasil diajukan ulang ke persetujuan keuangan.')
        emit('saved')
        close()
    } catch (err) {
        console.error('Resubmit failed:', err)
        showError('Pengajuan Gagal', err.response?.data?.message || 'Gagal mengajukan ulang permohonan pembayaran.')
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
        body-class="p-6 space-y-3.5 text-xs"
    >
        <template #header>
            <div class="flex items-center gap-2">
                <RotateCcw class="w-5 h-5 text-amber-600" />
                <h3 class="text-base font-bold text-slate-900 tracking-tight">
                    Ajukan Ulang Permohonan Pembayaran
                </h3>
            </div>
        </template>

        <p class="text-slate-500">
            Perbarui rincian rekening tujuan atau catatan koreksi untuk diajukan kembali ke approver keuangan.
        </p>

        <div>
            <label class="block font-semibold text-slate-700 mb-1">Nama Bank <span class="text-rose-500">*</span></label>
            <input
                v-model="form.bank_name"
                type="text"
                placeholder="e.g. Bank Central Asia (BCA)"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
        </div>

        <div>
            <label class="block font-semibold text-slate-700 mb-1">Nomor Rekening <span class="text-rose-500">*</span></label>
            <input
                v-model="form.bank_account_number"
                type="text"
                placeholder="e.g. 521098231"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
        </div>

        <div>
            <label class="block font-semibold text-slate-700 mb-1">Nama Pemilik Rekening <span class="text-rose-500">*</span></label>
            <input
                v-model="form.bank_account_holder"
                type="text"
                placeholder="e.g. PT Mitra Sejahtera"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
        </div>

        <div>
            <label class="block font-semibold text-slate-700 mb-1">Catatan Koreksi</label>
            <textarea
                v-model="form.notes"
                rows="2"
                placeholder="Jelaskan perbaikan yang telah dilakukan..."
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            ></textarea>
        </div>

        <template #footer>
            <button
                type="button"
                @click="close"
                class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
                Batal
            </button>
            <button
                type="button"
                @click="handleSubmit"
                :disabled="isSubmitting"
                class="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
                <Send v-if="!isSubmitting" class="w-3.5 h-3.5" />
                <div v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {{ isSubmitting ? 'Mengajukan...' : 'Ajukan Ulang Sekarang' }}
            </button>
        </template>
    </BaseModal>
</template>
