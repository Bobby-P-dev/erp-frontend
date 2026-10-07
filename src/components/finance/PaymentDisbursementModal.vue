<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { disbursePayment } from '../../services/financeServices.js'
import { uploadFile } from '../../services/fileServices.js'
import { formatCurrency } from '../../composables/useFormatter.js'
import { showSuccess, showError, showConfirm } from '../../utils/swal.js'
import {
    CreditCard,
    CheckCircle2,
    UploadCloud,
    FileCheck,
    Trash2,
    ExternalLink
} from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    item: {
        type: Object,
        default: null
    },
    accounts: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['update:modelValue', 'close', 'saved'])

const isSubmitting = ref(false)
const isUploadingProof = ref(false)
const proofFilePreview = ref(null)

const form = ref({
    source_account_id: '',
    payment_date: new Date().toISOString().substring(0, 10),
    payment_method: 'bank_transfer',
    bank_fee: 0,
    reference_number: '',
    proof_file_id: null,
    notes: ''
})

// Initialize form when item or modal opens
watch(() => [props.modelValue, props.item], ([isOpen, it]) => {
    if (isOpen && it) {
        // Auto-select primary bank account if not set
        const defaultAcc = props.accounts.find(a => (a.name || '').toLowerCase().includes('bca'))
            || props.accounts.find(a => (a.name || '').toLowerCase().includes('mandiri'))
            || (props.accounts.length > 0 ? props.accounts[0] : null)

        form.value = {
            source_account_id: defaultAcc ? defaultAcc.id : '',
            payment_date: new Date().toISOString().substring(0, 10),
            payment_method: it.payment_method || 'bank_transfer',
            bank_fee: 0,
            reference_number: '',
            proof_file_id: null,
            notes: `Pencairan tagihan ${it.prq_number} kepada ${it.recipient_name || ''}`
        }
        proofFilePreview.value = null
    }
}, { immediate: true })

const totalDisbursed = computed(() => {
    const base = parseFloat(props.item?.amount) || 0
    const fee = parseFloat(form.value.bank_fee) || 0
    return base + fee
})

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

// Handle upload payment proof file (slip transfer / mutasi)
const handleProofFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
        showError('File Terlalu Besar', 'Ukuran bukti pembayaran maksimal 10MB.')
        return
    }

    isUploadingProof.value = true
    try {
        const res = await uploadFile(file, 'payments')
        const fileData = res.data || res
        form.value.proof_file_id = fileData.id
        proofFilePreview.value = {
            id: fileData.id,
            name: fileData.original_name || file.name,
            size: fileData.file_size || file.size,
            url: fileData.file_url || (typeof window !== 'undefined' ? window.URL.createObjectURL(file) : ''),
            type: fileData.file_type || file.type
        }
    } catch (err) {
        console.error('Failed to upload payment proof:', err)
        showError('Upload Gagal', err.response?.data?.message || 'Gagal mengunggah file bukti pembayaran.')
    } finally {
        isUploadingProof.value = false
        event.target.value = ''
    }
}

const removeProofFile = () => {
    form.value.proof_file_id = null
    proofFilePreview.value = null
}

const handleSubmit = async () => {
    if (!form.value.source_account_id) {
        showError('Validasi Gagal', 'Silakan pilih Akun Sumber Kas/Bank.')
        return
    }

    const confirmed = await showConfirm(
        'Konfirmasi Pencairan Kas/Bank',
        `Apakah Anda yakin ingin mencairkan dana sebesar ${formatCurrency(totalDisbursed.value, props.item?.currency)} untuk dokumen ${props.item?.prq_number}?`,
        'Ya, Cairkan Dana'
    )

    if (!confirmed) return

    isSubmitting.value = true
    try {
        const payload = {
            source_account_id: parseInt(form.value.source_account_id, 10),
            payment_date: form.value.payment_date,
            bank_fee: parseFloat(form.value.bank_fee) || 0,
            reference_number: form.value.reference_number || null,
            proof_file_id: form.value.proof_file_id || null,
            notes: form.value.notes || null
        }

        await disbursePayment(props.item.id, payload)
        showSuccess('Berhasil!', `Dana sebesar ${formatCurrency(totalDisbursed.value, props.item?.currency)} berhasil dicairkan.`)
        emit('saved')
        close()
    } catch (err) {
        console.error('Disbursement failed:', err)
        showError('Pencairan Gagal', err.response?.data?.message || 'Terjadi kesalahan saat memproses pencairan kas.')
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
        size="xl"
        body-class="p-6 text-xs space-y-4"
    >
        <template #header>
            <div class="flex items-center gap-2.5">
                <span class="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <CreditCard class="w-5 h-5" />
                </span>
                <div>
                    <h3 class="text-base font-bold text-slate-900 tracking-tight">
                        Pencairan Dana Kasir (Disbursement)
                    </h3>
                    <p class="text-xs font-mono text-slate-500">
                        Dokumen: {{ item?.prq_number }}
                    </p>
                </div>
            </div>
        </template>

        <!-- Ringkasan Tagihan -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
            <div v-if="item?.direct_purchase?.dp_number" class="flex justify-between items-center">
                <span class="text-slate-500">Dokumen Acuan:</span>
                <span class="font-mono font-medium text-slate-800">{{ item.direct_purchase.dp_number }}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-500">Penerima Dana:</span>
                <span class="font-medium text-slate-800">{{ item?.recipient_name }}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-500">Bank & No Rekening:</span>
                <span class="font-mono text-slate-800">{{ item?.bank_name }} - {{ item?.bank_account_number }}</span>
            </div>
            <div class="flex justify-between items-center pt-1.5 border-t border-slate-200 font-bold">
                <span class="text-slate-700">Nominal Tagihan:</span>
                <span class="font-mono text-slate-900 text-sm">{{ formatCurrency(item?.amount, item?.currency) }}</span>
            </div>
        </div>

        <!-- Form Input Kasir -->
        <div class="space-y-3">
            <div>
                <label class="block font-semibold text-slate-700 mb-1">
                    Akun Sumber Kas/Bank <span class="text-rose-500">*</span>
                </label>
                <select
                    v-model="form.source_account_id"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                    <option value="" disabled>Pilih Akun Sumber Dana</option>
                    <option
                        v-for="acc in accounts"
                        :key="acc.id"
                        :value="acc.id"
                    >
                        {{ acc.account_code || acc.code ? `[${acc.account_code || acc.code}] ` : '' }}{{ acc.name }}
                    </option>
                </select>
                <p class="text-[11px] text-slate-400 mt-1">
                    Menampilkan akun Kas & Bank operasional aktif.
                </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-semibold text-slate-700 mb-1">
                        Metode Pembayaran
                    </label>
                    <select
                        v-model="form.payment_method"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                        <option value="bank_transfer">Transfer Bank</option>
                        <option value="cash">Tunai / Kas Kecil</option>
                        <option value="marketplace_va">Virtual Account</option>
                        <option value="corporate_card">Kartu Korporat</option>
                    </select>
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">
                        Tanggal Pembayaran <span class="text-rose-500">*</span>
                    </label>
                    <input
                        v-model="form.payment_date"
                        type="date"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-semibold text-slate-700 mb-1">
                        Biaya Admin Bank (Rp)
                    </label>
                    <input
                        v-model="form.bank_fee"
                        type="number"
                        min="0"
                        step="1000"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">
                        No. Referensi / Bukti Mutasi
                    </label>
                    <input
                        v-model="form.reference_number"
                        type="text"
                        placeholder="e.g. TRF-BCA-8921"
                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                </div>
            </div>

            <!-- Bukti Pembayaran / Slip Transfer Upload -->
            <div class="space-y-1.5">
                <label class="block font-semibold text-slate-700">
                    Bukti Pembayaran / Slip Transfer <span class="text-slate-400 font-normal">(Opsional / Dianjurkan)</span>
                </label>
                
                <div v-if="proofFilePreview" class="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div class="flex items-center gap-2.5 overflow-hidden">
                        <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileCheck class="w-5 h-5" />
                        </div>
                        <div class="truncate">
                            <p class="font-semibold text-slate-800 text-xs truncate">{{ proofFilePreview.name }}</p>
                            <p class="text-[10px] text-slate-400 font-mono">{{ Math.round((proofFilePreview.size || 0) / 1024) }} KB • Berhasil Diunggah</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <a
                            :href="proofFilePreview.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Buka File"
                        >
                            <ExternalLink class="w-4 h-4" />
                        </a>
                        <button
                            type="button"
                            @click="removeProofFile"
                            class="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus / Ganti File"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div v-else class="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-3 text-center transition-colors bg-slate-50/50 hover:bg-blue-50/30">
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        @change="handleProofFileUpload"
                        :disabled="isUploadingProof"
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div v-if="isUploadingProof" class="py-2 flex flex-col items-center justify-center gap-1.5 text-blue-600">
                        <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-xs font-semibold">Mengunggah bukti pembayaran...</span>
                    </div>
                    <div v-else class="flex flex-col items-center justify-center py-1">
                        <UploadCloud class="w-6 h-6 text-slate-400 mb-1" />
                        <p class="font-medium text-slate-700 text-xs">
                            Klik atau seret file slip transfer / bukti mutasi di sini
                        </p>
                        <p class="text-[10px] text-slate-400 mt-0.5">
                            Format JPG, PNG, WEBP, atau PDF (Maks. 10 MB)
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <label class="block font-semibold text-slate-700 mb-1">
                    Catatan Pembayaran Kasir
                </label>
                <textarea
                    v-model="form.notes"
                    rows="2"
                    placeholder="Catatan internal pengeluaran kas..."
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                ></textarea>
            </div>

            <!-- Grand Total Disburse Calculation -->
            <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div>
                    <p class="text-[11px] text-emerald-800 font-medium">Total Kas Keluar (Tagihan + Admin):</p>
                    <p class="text-sm font-bold font-mono text-emerald-900 mt-0.5">
                        {{ formatCurrency(totalDisbursed, item?.currency) }}
                    </p>
                    <p v-if="item?.currency && item?.currency !== 'IDR' && item?.exchange_rate" class="text-[10px] text-emerald-700 font-mono mt-0.5">
                        ≈ {{ formatCurrency((Number(totalDisbursed) || 0) * (Number(item?.exchange_rate) || 1), 'IDR') }}
                    </p>
                </div>
                <span class="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded">
                    Realisasi Kasir
                </span>
            </div>
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
                class="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
                <CheckCircle2 v-if="!isSubmitting" class="w-4 h-4" />
                <div v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {{ isSubmitting ? 'Memproses...' : 'Konfirmasi Pencairan Kasir' }}
            </button>
        </template>
    </BaseModal>
</template>
