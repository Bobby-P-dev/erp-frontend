<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import { disbursePayment } from '../../services/financeServices.js'
import { uploadFile } from '../../services/fileServices.js'
import { formatCurrency } from '../../composables/useFormatter.js'
import { showSuccess, showError } from '../../utils/swal.js'
import {
    CreditCard,
    CheckCircle2,
    UploadCloud,
    FileCheck,
    Trash2,
    ExternalLink,
    Copy,
    Check,
    Info,
    Coins
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
const isCopied = ref(false)

const copyAccountNumber = async () => {
    const accNumber = props.item?.bank_account_number
    if (!accNumber) return
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(accNumber)
        } else {
            const textArea = document.createElement('textarea')
            textArea.value = accNumber
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
        }
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (e) {
        console.warn('Failed to copy account number:', e)
    }
}

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
        isCopied.value = false
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
        showSuccess('Pencairan Berhasil!', `Dana sebesar ${formatCurrency(totalDisbursed.value, props.item?.currency)} berhasil dicairkan. Status tagihan kini lunas.`)
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
        size="2xl"
        body-class="p-5 sm:p-6 space-y-5"
    >
        <template #header>
            <div class="flex items-center gap-3">
                <span class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <CreditCard class="w-5 h-5" />
                </span>
                <div>
                    <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Pencairan Dana Kasir</span>
                        <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            Disbursement
                        </span>
                    </h3>
                    <p class="text-xs font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>No. PRQ: <strong class="text-slate-800">{{ item?.prq_number }}</strong></span>
                        <span v-if="item?.direct_purchase?.dp_number" class="text-slate-400">• Ref: <strong class="text-slate-800">{{ item.direct_purchase.dp_number }}</strong></span>
                    </p>
                </div>
            </div>
        </template>

        <!-- Two-Column Cashier Slip Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- Left Column: Recipient & Bill Information (5 cols) -->
            <div class="lg:col-span-5 space-y-4">
                <div class="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3.5">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Penerima Dana
                        </span>
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {{ item?.recipient_type === 'supplier' ? 'Supplier' : (item?.recipient_type === 'marketplace_va' ? 'Virtual Account' : 'Pihak Terkait') }}
                        </span>
                    </div>

                    <div>
                        <div class="text-sm font-bold text-slate-900">
                            {{ item?.recipient_name || 'Vendor / Rekanan' }}
                        </div>
                        <div v-if="item?.direct_purchase?.merchant_name && item?.direct_purchase?.merchant_name !== item?.recipient_name" class="text-xs text-slate-500 mt-0.5">
                            Toko: {{ item.direct_purchase.merchant_name }}
                        </div>
                    </div>

                    <!-- Bank Account Box with Copy Button -->
                    <div class="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1.5">
                        <div class="flex items-center justify-between">
                            <span class="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold font-mono text-[11px] uppercase">
                                {{ item?.bank_name || 'BANK' }}
                            </span>
                            <button
                                type="button"
                                @click="copyAccountNumber"
                                class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                :title="item?.bank_account_number ? 'Salin nomor rekening' : ''"
                            >
                                <template v-if="isCopied">
                                    <Check class="w-3.5 h-3.5 text-emerald-600" />
                                    <span class="text-emerald-700 font-bold">Tersalin!</span>
                                </template>
                                <template v-else>
                                    <Copy class="w-3.5 h-3.5" />
                                    <span>Salin Rek</span>
                                </template>
                            </button>
                        </div>
                        <div class="font-mono text-base font-bold text-slate-900 tracking-wider select-all">
                            {{ item?.bank_account_number || '-' }}
                        </div>
                        <div class="text-[11px] text-slate-500 truncate" :title="item?.bank_account_holder">
                            a.n. <strong class="text-slate-700 font-semibold">{{ item?.bank_account_holder || item?.recipient_name || '-' }}</strong>
                        </div>
                    </div>

                    <!-- Bill Breakdown -->
                    <div class="pt-2 border-t border-slate-200/80 space-y-1.5">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-slate-500">Nominal Pokok:</span>
                            <span class="font-mono font-bold text-slate-900 text-sm">
                                {{ formatCurrency(item?.amount, item?.currency) }}
                            </span>
                        </div>
                        <div v-if="item?.currency && item?.currency !== 'IDR' && item?.exchange_rate" class="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                            <span>Kurs ({{ item.currency }}):</span>
                            <span>≈ {{ formatCurrency((Number(item.amount) || 0) * (Number(item.exchange_rate) || 1), 'IDR') }}</span>
                        </div>
                    </div>
                </div>

                <!-- Guidance Note -->
                <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                    <Info class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                        Pastikan transfer telah berhasil dilakukan ke rekening tujuan sebelum mengonfirmasi pencairan kasir.
                    </span>
                </div>
            </div>

            <!-- Right Column: Settlement Form (7 cols) -->
            <div class="lg:col-span-7 space-y-3.5 text-xs">
                <!-- Source Account -->
                <div>
                    <label class="block font-bold text-slate-800 mb-1">
                        Akun Kas / Bank Sumber Dana <span class="text-rose-500">*</span>
                    </label>
                    <select
                        v-model="form.source_account_id"
                        class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-2xs transition-all"
                    >
                        <option value="" disabled>-- Pilih Rekening Kas / Bank --</option>
                        <option
                            v-for="acc in accounts"
                            :key="acc.id"
                            :value="acc.id"
                        >
                            {{ acc.account_code || acc.code ? `[${acc.account_code || acc.code}] ` : '' }}{{ acc.name }}
                        </option>
                    </select>
                    <p class="text-[11px] text-slate-400 mt-1">
                        Saldo akan dikurangkan dari buku besar akun kas/bank yang dipilih.
                    </p>
                </div>

                <!-- Payment Method & Date -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-800 mb-1">
                            Metode Pembayaran
                        </label>
                        <select
                            v-model="form.payment_method"
                            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-2xs"
                        >
                            <option value="bank_transfer">Transfer Bank</option>
                            <option value="marketplace_va">Virtual Account</option>
                            <option value="cash">Tunai / Kas Kecil</option>
                            <option value="corporate_card">Kartu Korporat</option>
                        </select>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-800 mb-1">
                            Tanggal Pembayaran <span class="text-rose-500">*</span>
                        </label>
                        <input
                            v-model="form.payment_date"
                            type="date"
                            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-2xs"
                        />
                    </div>
                </div>

                <!-- Bank Fee & Reference Number -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-800 mb-1">
                            Biaya Admin Bank (Rp)
                        </label>
                        <input
                            v-model="form.bank_fee"
                            type="number"
                            min="0"
                            step="500"
                            placeholder="0"
                            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-2xs"
                        />
                    </div>

                    <div>
                        <label class="block font-bold text-slate-800 mb-1">
                            No. Referensi Transfer / Mutasi
                        </label>
                        <input
                            v-model="form.reference_number"
                            type="text"
                            placeholder="e.g. TRF-BCA-98124"
                            class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-2xs"
                        />
                    </div>
                </div>

                <!-- Proof of Payment Upload -->
                <div>
                    <label class="block font-bold text-slate-800 mb-1">
                        Bukti Pembayaran / Slip Mutasi <span class="text-slate-400 font-normal">(Opsional)</span>
                    </label>

                    <div v-if="proofFilePreview" class="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between shadow-2xs">
                        <div class="flex items-center gap-2.5 overflow-hidden">
                            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <FileCheck class="w-4 h-4" />
                            </div>
                            <div class="truncate">
                                <p class="font-bold text-slate-800 text-xs truncate">{{ proofFilePreview.name }}</p>
                                <p class="text-[10px] text-slate-500 font-mono">{{ Math.round((proofFilePreview.size || 0) / 1024) }} KB • Siap disimpan</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <a
                                :href="proofFilePreview.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 rounded-lg transition-colors"
                                title="Buka File"
                            >
                                <ExternalLink class="w-4 h-4" />
                            </a>
                            <button
                                type="button"
                                @click="removeProofFile"
                                class="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100/50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Bukti"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div v-else class="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 text-center transition-colors bg-slate-50/60 hover:bg-blue-50/30">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            @change="handleProofFileUpload"
                            :disabled="isUploadingProof"
                            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div v-if="isUploadingProof" class="py-1 flex flex-col items-center justify-center gap-1.5 text-blue-600">
                            <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span class="text-xs font-semibold">Mengunggah file...</span>
                        </div>
                        <div v-else class="flex items-center justify-center gap-2 py-0.5">
                            <UploadCloud class="w-4 h-4 text-slate-400" />
                            <span class="font-medium text-slate-600 text-xs">
                                Unggah slip transfer / struk pembayaran (PDF, JPG, PNG)
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Notes -->
                <div>
                    <label class="block font-bold text-slate-800 mb-1">
                        Catatan Internal Kasir
                    </label>
                    <textarea
                        v-model="form.notes"
                        rows="2"
                        placeholder="Keterangan pengeluaran kas atau mutasi..."
                        class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-2xs resize-none"
                    ></textarea>
                </div>
            </div>
        </div>

        <!-- Grand Total Calculation Dock (Full Width) -->
        <div class="bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Coins class="w-5 h-5" />
                </div>
                <div>
                    <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Realisasi Pengeluaran Kasir
                    </div>
                    <div class="text-xs text-slate-600 font-medium">
                        Tagihan: <span class="font-mono font-semibold text-slate-800">{{ formatCurrency(item?.amount, item?.currency) }}</span>
                        <span v-if="form.bank_fee > 0" class="text-emerald-700 font-semibold font-mono"> + Admin: Rp {{ Number(form.bank_fee).toLocaleString('id-ID') }}</span>
                    </div>
                </div>
            </div>

            <div class="text-right">
                <div class="text-[11px] font-bold text-emerald-800">
                    Total Kas Keluar
                </div>
                <div class="font-mono text-xl sm:text-2xl font-black text-emerald-900 tracking-tight">
                    {{ formatCurrency(totalDisbursed, item?.currency) }}
                </div>
            </div>
        </div>

        <!-- Footer Actions (Single Action, No Nested Modals) -->
        <template #footer>
            <button
                type="button"
                @click="close"
                class="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
                Batal
            </button>

            <button
                type="button"
                @click="handleSubmit"
                :disabled="isSubmitting || !form.source_account_id"
                class="px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-700/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]"
            >
                <div v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <CheckCircle2 v-else class="w-4 h-4" />
                <span>{{ isSubmitting ? 'Memproses Pencairan...' : `Konfirmasi & Cairkan (${formatCurrency(totalDisbursed, item?.currency)})` }}</span>
            </button>
        </template>
    </BaseModal>
</template>
