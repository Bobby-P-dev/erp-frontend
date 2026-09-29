<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
    recordGoodsReceipt,
    getDirectPurchasesReadyForReceipt
} from '../../services/inventoryServices.js'
import { showDirectPurchase } from '../../services/directPurchaseServices.js'
import { uploadFile } from '../../services/fileServices.js'
import { showSuccess, showError, showConfirm } from '../../utils/swal.js'
import {
    Boxes,
    Package,
    Truck,
    Calendar,
    FileText,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    X,
    Building2,
    ChevronDown,
    Search,
    UploadCloud,
    FileCheck,
    Trash2,
    ExternalLink,
    Paperclip
} from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue', 'saved'])

// State
const isLoadingOrders = ref(false)
const readyOrders = ref([])
const selectedOrderId = ref('')
const isLoadingDetail = ref(false)
const selectedOrder = ref(null)

const isUploadingProof = ref(false)
const proofFilePreview = ref(null)

const form = ref({
    delivery_note_number: '',
    shipping_carrier: '',
    receipt_date: new Date().toISOString().substring(0, 10),
    delivery_proof_file_id: null,
    notes: '',
    items: []
})

const isSubmitting = ref(false)

// Fetch eligible orders
const fetchOrders = async () => {
    isLoadingOrders.value = true
    try {
        readyOrders.value = await getDirectPurchasesReadyForReceipt()
    } catch (err) {
        console.error('Failed to load ready orders:', err)
        readyOrders.value = []
    } finally {
        isLoadingOrders.value = false
    }
}

// When user selects an order
watch(selectedOrderId, async (newId) => {
    if (!newId) {
        selectedOrder.value = null
        form.value.items = []
        return
    }

    isLoadingDetail.value = true
    try {
        const res = await showDirectPurchase(newId)
        const orderData = res.data || res
        selectedOrder.value = orderData

        // Populate items
        const rawItems = orderData.items || []
        form.value.items = rawItems.map(item => {
            const orderedQty = parseFloat(item.quantity) || 1
            return {
                direct_purchase_item_id: item.id,
                description: item.description || item.item?.name || 'Barang Pesanan',
                unit: item.unit?.code || item.unit?.name || 'Unit',
                quantity_ordered: orderedQty,
                quantity_received: orderedQty,
                quantity_accepted: orderedQty,
                quantity_rejected: 0,
                rejection_reason: '',
                notes: ''
            }
        })
    } catch (err) {
        console.error('Failed to load direct purchase detail:', err)
        showError('Gagal Memuat Pesanan', 'Tidak dapat mengambil rincian item pesanan.')
    } finally {
        isLoadingDetail.value = false
    }
})

// Quick helper: Set all accepted
const acceptAll = () => {
    form.value.items.forEach(item => {
        item.quantity_received = item.quantity_ordered
        item.quantity_accepted = item.quantity_ordered
        item.quantity_rejected = 0
        item.rejection_reason = ''
    })
}

// Recalculate on quantity changes
const onReceivedChange = (item) => {
    const rec = parseFloat(item.quantity_received) || 0
    item.quantity_accepted = rec
    item.quantity_rejected = 0
    item.rejection_reason = ''
}

const onAcceptedChange = (item) => {
    const rec = parseFloat(item.quantity_received) || 0
    const acc = parseFloat(item.quantity_accepted) || 0
    if (acc <= rec) {
        item.quantity_rejected = rec - acc
    } else {
        item.quantity_accepted = rec
        item.quantity_rejected = 0
    }
}

const onRejectedChange = (item) => {
    const rec = parseFloat(item.quantity_received) || 0
    const rej = parseFloat(item.quantity_rejected) || 0
    if (rej <= rec) {
        item.quantity_accepted = rec - rej
    } else {
        item.quantity_rejected = rec
        item.quantity_accepted = 0
    }
}

// Validation
const validationError = computed(() => {
    if (!selectedOrderId.value) return 'Silakan pilih dokumen Direct Purchase yang diterima.'
    if (form.value.items.length === 0) return 'Pesanan tidak memiliki item untuk diterima.'

    for (let i = 0; i < form.value.items.length; i++) {
        const item = form.value.items[i]
        const rec = parseFloat(item.quantity_received) || 0
        const acc = parseFloat(item.quantity_accepted) || 0
        const rej = parseFloat(item.quantity_rejected) || 0

        if (rec <= 0) {
            return `Kuantitas fisik diterima untuk item "${item.description}" harus lebih dari 0.`
        }
        if (acc + rej !== rec) {
            return `Jumlah kuantitas diterima (${acc}) + ditolak (${rej}) harus sama dengan kuantitas fisik (${rec}) untuk item "${item.description}".`
        }
        if (rej > 0 && !item.rejection_reason) {
            return `Mohon sebutkan alasan penolakan/cacat untuk item "${item.description}".`
        }
    }

    return null
})

// Handle upload delivery proof file (surat jalan / foto fisik barang)
const handleProofFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
        showError('File Terlalu Besar', 'Ukuran bukti surat jalan maksimal 10MB.')
        return
    }

    isUploadingProof.value = true
    try {
        const res = await uploadFile(file, 'goods_receipts')
        const fileData = res.data || res
        form.value.delivery_proof_file_id = fileData.id
        proofFilePreview.value = {
            id: fileData.id,
            name: fileData.original_name || file.name,
            size: fileData.file_size || file.size,
            url: fileData.file_url || (typeof window !== 'undefined' ? window.URL.createObjectURL(file) : ''),
            type: fileData.file_type || file.type,
            isImage: (fileData.file_type || file.type || '').startsWith('image/')
        }
    } catch (err) {
        console.error('Failed to upload delivery proof:', err)
        showError('Upload Gagal', err.response?.data?.message || 'Gagal mengunggah bukti surat jalan/barang.')
    } finally {
        isUploadingProof.value = false
        event.target.value = ''
    }
}

const removeProofFile = () => {
    form.value.delivery_proof_file_id = null
    proofFilePreview.value = null
}

// Submit
const handleSubmit = async () => {
    if (validationError.value) {
        showError('Validasi Gagal', validationError.value)
        return
    }

    const confirmed = await showConfirm(
        'Simpan Penerimaan Barang',
        `Catat penerimaan fisik barang untuk pesanan ${selectedOrder.value?.dp_number}?`,
        'Ya, Simpan Penerimaan'
    )

    if (!confirmed) return

    isSubmitting.value = true
    try {
        const payload = {
            direct_purchase_id: parseInt(selectedOrderId.value, 10),
            delivery_note_number: form.value.delivery_note_number || null,
            shipping_carrier: form.value.shipping_carrier || null,
            delivery_proof_file_id: form.value.delivery_proof_file_id || null,
            receipt_date: form.value.receipt_date,
            notes: form.value.notes || null,
            items: form.value.items.map(item => ({
                direct_purchase_item_id: item.direct_purchase_item_id,
                quantity_received: parseFloat(item.quantity_received),
                quantity_accepted: parseFloat(item.quantity_accepted),
                quantity_rejected: parseFloat(item.quantity_rejected),
                rejection_reason: item.quantity_rejected > 0 ? item.rejection_reason : null,
                notes: item.notes || null
            }))
        }

        const res = await recordGoodsReceipt(payload)
        const grnNumber = res.data?.grn_number || res.grn_number || 'GRN Baru'
        showSuccess('Berhasil!', `Penerimaan barang fisik ${grnNumber} berhasil disimpan.`)
        emit('saved')
        closeModal()
    } catch (err) {
        console.error('Failed to record goods receipt:', err)
        showError('Gagal Mencatat Penerimaan', err.response?.data?.message || 'Terjadi kesalahan sistem.')
    } finally {
        isSubmitting.value = false
    }
}

const closeModal = () => {
    emit('update:modelValue', false)
    selectedOrderId.value = ''
    selectedOrder.value = null
    proofFilePreview.value = null
    form.value = {
        delivery_note_number: '',
        shipping_carrier: '',
        receipt_date: new Date().toISOString().substring(0, 10),
        delivery_proof_file_id: null,
        notes: '',
        items: []
    }
}

watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        fetchOrders()
    }
})

onMounted(() => {
    if (props.modelValue) {
        fetchOrders()
    }
})
</script>

<template>
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
    >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-blue-50/60">
                <div class="flex items-center gap-2.5">
                    <span class="p-2 rounded-lg bg-blue-100 text-blue-700">
                        <Boxes class="w-5 h-5" />
                    </span>
                    <div>
                        <h3 class="text-base font-bold text-slate-900">
                            Catat Penerimaan Barang Fisik (Goods Receipt / GRN)
                        </h3>
                        <p class="text-xs text-slate-500">
                            Pemeriksaan surat jalan vendor dan verifikasi kualitas barang masuk ke gudang.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    @click="closeModal"
                    class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
                <!-- 1. Pilih Pesanan Direct Purchase -->
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <label class="block font-semibold text-slate-800 text-sm">
                        1. Dokumen Acuan Pembelian (Direct Purchase) <span class="text-rose-500">*</span>
                    </label>

                    <div v-if="isLoadingOrders" class="py-2 text-slate-500 flex items-center gap-2">
                        <div class="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Memuat daftar pesanan yang siap diterima...
                    </div>

                    <div v-else>
                        <select
                            v-model="selectedOrderId"
                            class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        >
                            <option value="">-- Pilih Pesanan Siap Diterima (Status: Paid / Ordered) --</option>
                            <option
                                v-for="order in readyOrders"
                                :key="order.id"
                                :value="order.id"
                            >
                                {{ order.dp_number }} - {{ order.merchant_name || order.supplier?.name || 'Toko' }} ({{ order.items?.length || 0 }} Item)
                            </option>
                        </select>
                        <p class="text-[11px] text-slate-400 mt-1">
                            Hanya menampilkan pesanan yang sudah dibayar kasir (Paid) atau telah diterima sebagian.
                        </p>
                    </div>

                    <!-- Order Preview Details -->
                    <div v-if="selectedOrder" class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-slate-700">
                        <div>
                            <span class="text-slate-400">Penyedia / Toko:</span>
                            <p class="font-medium text-slate-900 mt-0.5">{{ selectedOrder.merchant_name || selectedOrder.supplier?.name || '-' }}</p>
                        </div>
                        <div>
                            <span class="text-slate-400">Saluran Pembelian:</span>
                            <p class="font-medium text-slate-900 mt-0.5 capitalize">{{ selectedOrder.purchase_channel?.replace('_', ' ') }}</p>
                        </div>
                        <div>
                            <span class="text-slate-400">Rencana Pengadaan:</span>
                            <p class="font-mono text-slate-900 mt-0.5">{{ selectedOrder.procurement_plan?.plan_number || '-' }}</p>
                        </div>
                    </div>
                </div>

                <!-- 2. Informasi Surat Jalan Vendor & Kurir -->
                <div v-if="selectedOrder" class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-slate-200 rounded-xl p-4">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">
                            No. Surat Jalan Vendor / Resi Kurir
                        </label>
                        <input
                            v-model="form.delivery_note_number"
                            type="text"
                            placeholder="e.g. SJ-2026/09/881 atau Resi JNE"
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">
                            Ekspedisi / Kurir Pengantar
                        </label>
                        <input
                            v-model="form.shipping_carrier"
                            type="text"
                            placeholder="e.g. Kurir Internal / JNE / SiCepat"
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">
                            Tanggal Penerimaan Fisik <span class="text-rose-500">*</span>
                        </label>
                        <input
                            v-model="form.receipt_date"
                            type="date"
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>

                    <div class="sm:col-span-3">
                        <label class="block font-semibold text-slate-700 mb-1">
                            Catatan Penerimaan Gudang
                        </label>
                        <input
                            v-model="form.notes"
                            type="text"
                            placeholder="Kondisi kemasan luar, nama driver pengantar, dll."
                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        />
                    </div>
                </div>

                <!-- 3. Upload Bukti Surat Jalan / Foto Fisik Barang -->
                <div v-if="selectedOrder" class="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <label class="block font-semibold text-slate-800 text-xs">
                        Bukti Surat Jalan Vendor / Foto Kondisi Fisik Barang <span class="text-slate-400 font-normal">(Opsional / Dianjurkan)</span>
                    </label>

                    <!-- Preview if uploaded -->
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
                                title="Buka Dokumen"
                            >
                                <ExternalLink class="w-4 h-4" />
                            </a>
                            <button
                                type="button"
                                @click="removeProofFile"
                                class="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                title="Hapus / Ganti Dokumen"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <!-- Upload Box -->
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
                            <span class="text-xs font-semibold">Mengunggah bukti surat jalan...</span>
                        </div>
                        <div v-else class="flex flex-col items-center justify-center py-1">
                            <UploadCloud class="w-6 h-6 text-slate-400 mb-1" />
                            <p class="font-medium text-slate-700 text-xs">
                                Unggah foto fisik surat jalan vendor atau foto fisik kondisi barang datang
                            </p>
                            <p class="text-[10px] text-slate-400 mt-0.5">
                                Format JPG, PNG, WEBP, atau PDF (Maks. 10 MB)
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 4. Tabel Pemeriksaan Fisik Item -->
                <div v-if="selectedOrder" class="space-y-2">
                    <div class="flex items-center justify-between">
                        <h4 class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Package class="w-4 h-4 text-blue-600" />
                            Pemeriksaan Fisik Barang (Item Inspection)
                        </h4>
                        <button
                            type="button"
                            @click="acceptAll"
                            class="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                            ✓ Terima Semua Sesuai Pesanan
                        </button>
                    </div>

                    <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                                    <th class="py-2.5 px-3">Nama Barang</th>
                                    <th class="py-2.5 px-3 text-center">Dipesan</th>
                                    <th class="py-2.5 px-3 text-center">Fisik Datang</th>
                                    <th class="py-2.5 px-3 text-center text-emerald-700">Diterima Baik</th>
                                    <th class="py-2.5 px-3 text-center text-rose-700">Ditolak / Cacat</th>
                                    <th class="py-2.5 px-3">Alasan Penolakan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs">
                                <tr
                                    v-for="(item, idx) in form.items"
                                    :key="item.direct_purchase_item_id"
                                    class="hover:bg-slate-50/50"
                                >
                                    <td class="py-3 px-3">
                                        <p class="font-semibold text-slate-800">{{ item.description }}</p>
                                        <span class="text-[10px] text-slate-400">Satuan: {{ item.unit }}</span>
                                    </td>

                                    <td class="py-3 px-3 text-center font-mono font-medium text-slate-700">
                                        {{ item.quantity_ordered }} {{ item.unit }}
                                    </td>

                                    <!-- Kuantitas Fisik Datang -->
                                    <td class="py-3 px-3 text-center">
                                        <input
                                            v-model.number="item.quantity_received"
                                            @input="onReceivedChange(item)"
                                            type="number"
                                            min="0"
                                            step="1"
                                            class="w-20 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                                        />
                                    </td>

                                    <!-- Kuantitas Diterima Baik -->
                                    <td class="py-3 px-3 text-center">
                                        <input
                                            v-model.number="item.quantity_accepted"
                                            @input="onAcceptedChange(item)"
                                            type="number"
                                            min="0"
                                            step="1"
                                            class="w-20 px-2 py-1 text-center bg-emerald-50 border border-emerald-200 rounded font-mono font-bold text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                                        />
                                    </td>

                                    <!-- Kuantitas Ditolak -->
                                    <td class="py-3 px-3 text-center">
                                        <input
                                            v-model.number="item.quantity_rejected"
                                            @input="onRejectedChange(item)"
                                            type="number"
                                            min="0"
                                            step="1"
                                            class="w-20 px-2 py-1 text-center bg-rose-50 border border-rose-200 rounded font-mono font-bold text-rose-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                                        />
                                    </td>

                                    <!-- Alasan Penolakan -->
                                    <td class="py-3 px-3">
                                        <input
                                            v-if="item.quantity_rejected > 0"
                                            v-model="item.rejection_reason"
                                            type="text"
                                            placeholder="e.g. Layar retak, segel rusak"
                                            class="w-full px-2 py-1 bg-rose-50 border border-rose-200 rounded text-rose-800 placeholder-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                                        />
                                        <span v-else class="text-slate-300 italic text-[11px]">-</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                    type="button"
                    @click="closeModal"
                    class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    Batal
                </button>

                <button
                    type="button"
                    @click="handleSubmit"
                    :disabled="isSubmitting || !selectedOrderId"
                    class="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                    <CheckCircle2 v-if="!isSubmitting" class="w-4 h-4" />
                    <div v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {{ isSubmitting ? 'Menyimpan...' : 'Simpan Bukti Penerimaan Barang' }}
                </button>
            </div>
        </div>
    </div>
</template>
