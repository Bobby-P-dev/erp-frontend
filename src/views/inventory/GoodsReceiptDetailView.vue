<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getGoodsReceiptDetail, confirmGoodsReceiptHandover } from '../../services/inventoryServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import {
    Boxes,
    Package,
    ArrowLeft,
    Printer,
    Truck,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Building2,
    FileText,
    UserCheck,
    Receipt,
    Paperclip,
    ExternalLink,
    FileCheck,
    Clock,
    User,
    Check,
    X
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const receipt = ref(null)

// Handover Modal State
const showHandoverModal = ref(false)
const handoverNotes = ref('')
const isSubmittingHandover = ref(false)

// Summary metrics
const metrics = computed(() => {
    if (!receipt.value) return { totalItems: 0, received: 0, accepted: 0, rejected: 0 }
    const items = receipt.value.items || []
    let received = 0
    let accepted = 0
    let rejected = 0

    items.forEach(it => {
        received += parseFloat(it.quantity_received) || 0
        accepted += parseFloat(it.quantity_accepted) || 0
        rejected += parseFloat(it.quantity_rejected) || 0
    })

    return {
        totalItems: items.length,
        received,
        accepted,
        rejected
    }
})

// Status Badge
const statusBadge = computed(() => {
    const st = receipt.value?.status?.value || receipt.value?.status
    switch (st) {
        case 'completed':
            return {
                label: 'Selesai (Completed)',
                class: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
        case 'partial':
            return {
                label: 'Sebagian (Partial)',
                class: 'bg-amber-50 text-amber-800 border-amber-200'
            }
        case 'rejected':
            return {
                label: 'Ditolak Total',
                class: 'bg-rose-50 text-rose-700 border-rose-200'
            }
        default:
            return {
                label: st || 'Tercatat',
                class: 'bg-blue-50 text-blue-700 border-blue-200'
            }
    }
})

const fetchDetail = async () => {
    isLoading.value = true
    try {
        const id = route.params.id
        const res = await getGoodsReceiptDetail(id)
        receipt.value = res.data || res
    } catch (err) {
        console.error('Failed to load goods receipt detail:', err)
    } finally {
        isLoading.value = false
    }
}

// Open Handover Dialog
const openHandoverDialog = () => {
    handoverNotes.value = ''
    showHandoverModal.value = true
}

// Submit Handover
const submitHandover = async () => {
    if (!receipt.value) return
    const requesterName = receipt.value.purchase_requisition?.requester?.name || 'pemohon'
    const isConfirmed = await showConfirm(
        'Serahkan Barang ke Pemohon?',
        `Konfirmasi bahwa barang dari penerimaan ${receipt.value.grn_number} telah diserahkan dan diambil oleh ${requesterName}. Status PR terkait akan berubah menjadi Selesai (Completed).`,
        'Ya, Konfirmasi Penyerahan'
    )

    if (isConfirmed) {
        isSubmittingHandover.value = true
        try {
            showLoading('Memproses serah terima...')
            await confirmGoodsReceiptHandover(receipt.value.id, {
                notes: handoverNotes.value
            })
            showSuccess('Berhasil!', `Barang berhasil diserahkan ke ${requesterName} dan status PR diselesaikan.`)
            showHandoverModal.value = false
            await fetchDetail()
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal memproses penyerahan barang.'
            showError('Gagal!', msg, err)
        } finally {
            isSubmittingHandover.value = false
        }
    }
}

const printDocument = () => {
    window.print()
}

onMounted(() => {
    fetchDetail()
})
</script>

<template>
    <div class="space-y-6">
        <!-- 1. Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Inventory', to: { name: 'user.inventory.goods-receipts' } },
                { label: 'Penerimaan Barang', to: { name: 'user.inventory.goods-receipts' } },
                { label: receipt?.grn_number || 'Detail Penerimaan Barang' }
            ]" 
        />


        <!-- 2. Navigation Bar & Actions -->
        <div class="flex items-center justify-between gap-4">
            <RouterLink
                :to="{ name: 'user.inventory.goods-receipts' }"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
                <ArrowLeft class="w-4 h-4" />
                Kembali ke Daftar Penerimaan Barang
            </RouterLink>

            <button
                type="button"
                @click="printDocument"
                class="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
            >
                <Printer class="w-3.5 h-3.5 text-slate-500" />
                Cetak Bukti Penerimaan (GRN)
            </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-2xs">
            <div class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm font-semibold text-slate-700">Memuat detail surat jalan & inspeksi fisik...</p>
        </div>

        <!-- Content When Loaded -->
        <div v-else-if="receipt" class="space-y-6">
            <!-- 2. Header Surat Jalan Vendor & Ringkasan -->
            <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <div class="flex items-center gap-2.5">
                            <span class="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                <Boxes class="w-5 h-5" />
                            </span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h1 class="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                                        {{ receipt.grn_number }}
                                    </h1>
                                    <span :class="['px-2.5 py-0.5 rounded-full text-xs font-semibold border', statusBadge.class]">
                                        {{ statusBadge.label }}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-500 mt-0.5">
                                    Waktu Terima Fisik: {{ receipt.receipt_date ? new Date(receipt.receipt_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Acuan Pembelian -->
                    <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-right self-start md:self-auto">
                        <span class="text-[11px] text-slate-400">Dokumen Acuan Pembelian:</span>
                        <div v-if="receipt.direct_purchase" class="flex items-center justify-end gap-1.5 mt-0.5">
                            <RouterLink
                                :to="{ name: 'user.purchasing.direct.detail', params: { id: receipt.direct_purchase.id } }"
                                class="font-mono font-bold text-blue-600 hover:underline text-sm"
                            >
                                {{ receipt.direct_purchase.dp_number }}
                            </RouterLink>
                            <span class="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                                Direct Purchase
                            </span>
                        </div>
                        <p v-else class="font-mono text-slate-700 text-sm mt-0.5">-</p>
                    </div>
                </div>

                <!-- 3. Key Identification Details -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span class="text-slate-400">Surat Jalan / Resi Kurir:</span>
                        <p class="font-mono font-bold text-slate-900 text-sm mt-1">
                            {{ receipt.delivery_note_number || '-' }}
                        </p>
                        <p v-if="receipt.shipping_carrier" class="text-slate-500 flex items-center gap-1 mt-0.5">
                            <Truck class="w-3 h-3 text-slate-400" />
                            {{ receipt.shipping_carrier }}
                        </p>
                    </div>

                    <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span class="text-slate-400">Penyedia / Toko / Vendor:</span>
                        <p class="font-semibold text-slate-900 text-sm mt-1">
                            {{ receipt.direct_purchase?.merchant_name || receipt.direct_purchase?.supplier?.name || '-' }}
                        </p>
                        <p class="text-slate-500 capitalize mt-0.5">
                            Saluran: {{ receipt.direct_purchase?.purchase_channel?.replace('_', ' ') || '-' }}
                        </p>
                    </div>

                    <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span class="text-slate-400">Petugas Gudang Penerima:</span>
                        <p class="font-semibold text-slate-900 text-sm mt-1">
                            {{ receipt.received_by_user?.name || '-' }}
                        </p>
                        <p class="text-slate-500 mt-0.5">
                            {{ receipt.received_by_user?.email || '-' }}
                        </p>
                    </div>

                    <div class="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span class="text-slate-400">Catatan Penerimaan:</span>
                        <p class="text-slate-700 italic text-xs mt-1">
                            {{ receipt.notes || 'Tidak ada catatan khusus.' }}
                        </p>
                    </div>
                </div>

                <!-- 4. Quick KPI Counters -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div class="border border-slate-200 rounded-lg p-3 text-center">
                        <span class="text-[11px] text-slate-400">Total Baris Item</span>
                        <p class="text-lg font-bold text-slate-900 mt-0.5">{{ metrics.totalItems }}</p>
                    </div>

                    <div class="border border-slate-200 rounded-lg p-3 text-center">
                        <span class="text-[11px] text-slate-400">Total Fisik Datang</span>
                        <p class="text-lg font-bold font-mono text-slate-900 mt-0.5">{{ metrics.received }}</p>
                    </div>

                    <div class="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3 text-center">
                        <span class="text-[11px] text-emerald-700">Diterima Baik (Accepted)</span>
                        <p class="text-lg font-bold font-mono text-emerald-700 mt-0.5">{{ metrics.accepted }}</p>
                    </div>

                    <div class="border border-rose-200 bg-rose-50/50 rounded-lg p-3 text-center">
                        <span class="text-[11px] text-rose-700">Ditolak / Cacat (Rejected)</span>
                        <p class="text-lg font-bold font-mono text-rose-700 mt-0.5">{{ metrics.rejected }}</p>
                    </div>
                </div>
            </div>

            <!-- 4.5 Status Serah Terima ke Pemohon (Requester Handover Section) -->
            <div class="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div class="flex items-center gap-2.5">
                        <div 
                            class="w-9 h-9 rounded-lg flex items-center justify-center"
                            :class="receipt.handover_status === 'handed_over' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                        >
                            <component :is="receipt.handover_status === 'handed_over' ? CheckCircle2 : Clock" class="w-5 h-5" />
                        </div>
                        <div>
                            <h2 class="text-base font-bold text-slate-900">
                                Status Serah Terima ke Pemohon (Goods Handover)
                            </h2>
                            <p class="text-xs text-slate-500">
                                Pemantauan pengambilan fisik barang oleh pemohon PR dari gudang
                            </p>
                        </div>
                    </div>

                    <span 
                        :class="[
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto',
                            receipt.handover_status === 'handed_over' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                : 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20'
                        ]"
                    >
                        <component :is="receipt.handover_status === 'handed_over' ? CheckCircle2 : Clock" class="w-3.5 h-3.5" />
                        {{ receipt.handover_status === 'handed_over' ? 'Sudah Diambil Pemohon' : 'Sampai di Gudang (Belum Diambil)' }}
                    </span>
                </div>

                <!-- State: Sudah Diambil -->
                <div v-if="receipt.handover_status === 'handed_over'" class="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                            <span class="text-slate-500 font-medium block">Diterima & Diambil Oleh:</span>
                            <span class="font-bold text-slate-900 text-sm mt-0.5 block">
                                {{ receipt.received_by_requester_user?.name || receipt.purchase_requisition?.requester?.name || 'Pemohon' }}
                            </span>
                            <span class="text-slate-500 text-[11px]">{{ receipt.received_by_requester_user?.email || '-' }}</span>
                        </div>

                        <div>
                            <span class="text-slate-500 font-medium block">Waktu Serah Terima:</span>
                            <span class="font-bold text-slate-900 text-sm mt-0.5 block">
                                {{ receipt.handed_over_at ? new Date(receipt.handed_over_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' }}
                            </span>
                            <span class="text-slate-500 text-[11px]">Diserahkan oleh: {{ receipt.handed_over_by_user?.name || 'Petugas Gudang' }}</span>
                        </div>

                        <div>
                            <span class="text-slate-500 font-medium block">Catatan Serah Terima:</span>
                            <p class="text-slate-700 italic text-xs mt-0.5">
                                {{ receipt.handover_notes || 'Tidak ada catatan serah terima.' }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- State: Belum Diambil -->
                <div v-else class="bg-amber-50/50 border border-amber-200 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 text-amber-900 font-bold text-sm">
                            <Clock class="w-4 h-4 text-amber-600" />
                            <span>Barang Aman di Gudang - Menunggu Pengambilan / Konfirmasi Pemohon</span>
                        </div>
                        <p class="text-xs text-amber-800 leading-relaxed">
                            Barang fisik telah sampai di gudang dan selesai diinspeksi. Pemohon PR (<strong class="font-semibold text-slate-900">{{ receipt.purchase_requisition?.requester?.name || 'Pemohon' }}</strong>) dapat mengambil barang di loket gudang atau mengonfirmasi penerimaan secara mandiri di menu Purchasing.
                        </p>
                    </div>

                    <button
                        type="button"
                        @click="openHandoverDialog"
                        class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto shrink-0 cursor-pointer"
                    >
                        <Check class="w-4 h-4" />
                        Serahkan Barang ke Pemohon
                    </button>
                </div>
            </div>

            <!-- 5. Dokumen / Foto Bukti Surat Jalan -->
            <div v-if="receipt.delivery_proof_file" class="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-3">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div class="flex items-center gap-2">
                        <Paperclip class="w-4 h-4 text-blue-600" />
                        <h2 class="text-sm font-bold text-slate-900">
                            Lampiran Bukti Surat Jalan Vendor & Inspeksi Fisik
                        </h2>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Terverifikasi Gudang
                    </span>
                </div>

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-slate-50/80 rounded-lg border border-slate-200/80">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <FileCheck class="w-5 h-5" />
                        </div>
                        <div>
                            <p class="font-semibold text-slate-900 text-xs">{{ receipt.delivery_proof_file.original_name }}</p>
                            <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                                {{ Math.round((receipt.delivery_proof_file.file_size || 0) / 1024) }} KB • {{ receipt.delivery_proof_file.file_type || 'Dokumen' }}
                            </p>
                        </div>
                    </div>

                    <a
                        :href="receipt.delivery_proof_file.file_url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
                    >
                        <ExternalLink class="w-3.5 h-3.5" />
                        Lihat / Unduh Dokumen
                    </a>
                </div>

                <!-- If Image, show thumbnail preview -->
                <div v-if="(receipt.delivery_proof_file.file_type || '').startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(receipt.delivery_proof_file.original_name)" class="pt-2">
                    <p class="text-xs font-medium text-slate-500 mb-2">Pratinjau Foto Bukti:</p>
                    <div class="max-w-xs rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                        <img
                            :src="receipt.delivery_proof_file.file_url"
                            :alt="receipt.delivery_proof_file.original_name"
                            class="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
                        />
                    </div>
                </div>
            </div>

            <!-- 6. Tabel Pemeriksaan Mutu Barang (Item Inspection Table) -->
            <div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div class="flex items-center gap-2">
                        <Package class="w-4 h-4 text-blue-600" />
                        <h2 class="text-sm font-bold text-slate-900">
                            Rincian Hasil Pemeriksaan Fisik Barang (Inspection Breakdown)
                        </h2>
                    </div>
                    <span class="text-xs text-slate-400">
                        {{ receipt.items?.length || 0 }} Item Diperiksa
                    </span>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <th class="py-3 px-4 w-12 text-center">No</th>
                                <th class="py-3 px-4">Deskripsi / Nama Barang</th>
                                <th class="py-3 px-4 text-center">Satuan</th>
                                <th class="py-3 px-4 text-center">Dipesan</th>
                                <th class="py-3 px-4 text-center">Fisik Datang</th>
                                <th class="py-3 px-4 text-center text-emerald-700">Diterima Baik</th>
                                <th class="py-3 px-4 text-center text-rose-700">Ditolak / Cacat</th>
                                <th class="py-3 px-4">Alasan Penolakan / Catatan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-xs">
                            <tr
                                v-for="(row, idx) in receipt.items"
                                :key="row.id || idx"
                                class="hover:bg-slate-50/60 transition-colors"
                            >
                                <td class="py-3.5 px-4 text-center text-slate-400 font-mono">
                                    {{ idx + 1 }}
                                </td>

                                <td class="py-3.5 px-4">
                                    <p class="font-semibold text-slate-900">
                                        {{ row.item_description || row.item?.name || 'Item Barang' }}
                                    </p>
                                    <p v-if="row.item?.code" class="text-[10px] font-mono text-slate-400 mt-0.5">
                                        Kode: {{ row.item.code }}
                                    </p>
                                </td>

                                <td class="py-3.5 px-4 text-center font-medium text-slate-700">
                                    {{ row.unit?.code || row.unit?.name || 'Unit' }}
                                </td>

                                <td class="py-3.5 px-4 text-center font-mono font-medium text-slate-700">
                                    {{ row.quantity_ordered }}
                                </td>

                                <td class="py-3.5 px-4 text-center font-mono font-semibold text-slate-900">
                                    {{ row.quantity_received }}
                                </td>

                                <td class="py-3.5 px-4 text-center">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {{ row.quantity_accepted }}
                                    </span>
                                </td>

                                <td class="py-3.5 px-4 text-center">
                                    <span
                                        v-if="parseFloat(row.quantity_rejected) > 0"
                                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                    >
                                        {{ row.quantity_rejected }}
                                    </span>
                                    <span v-else class="text-slate-300 font-mono">-</span>
                                </td>

                                <td class="py-3.5 px-4">
                                    <div v-if="row.rejection_reason" class="flex items-center gap-1.5 text-rose-700 font-medium">
                                        <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
                                        <span>{{ row.rejection_reason }}</span>
                                    </div>
                                    <p v-if="row.notes" class="text-[11px] text-slate-500 italic mt-0.5">
                                        {{ row.notes }}
                                    </p>
                                    <span v-if="!row.rejection_reason && !row.notes" class="text-slate-300 italic text-[11px]">
                                        Kondisi baik, sesuai pesanan.
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Modal Serah Terima Barang -->
            <div 
                v-if="showHandoverModal" 
                class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
                @click.self="showHandoverModal = false"
            >
                <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                <CheckCircle2 class="w-5 h-5" />
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-slate-900">Serah Terima Barang ke Pemohon</h3>
                                <p class="text-xs text-slate-500">Konfirmasi pengambilan barang fisik oleh pemohon PR</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            @click="showHandoverModal = false"
                            class="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                        >
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="p-6 space-y-4">
                        <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500 font-medium">Nomor Penerimaan:</span>
                                <span class="font-mono font-bold text-blue-600">{{ receipt.grn_number }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500 font-medium">Surat Jalan Vendor:</span>
                                <span class="font-mono font-semibold text-slate-800">{{ receipt.delivery_note_number || '-' }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500 font-medium">PR Acuan:</span>
                                <span class="font-mono font-semibold text-slate-800">{{ receipt.purchase_requisition?.pr_number || '-' }}</span>
                            </div>
                            <div class="flex items-center justify-between pt-1 border-t border-slate-200/80">
                                <span class="text-slate-700 font-bold">Nama Pemohon:</span>
                                <span class="font-bold text-slate-900">{{ receipt.purchase_requisition?.requester?.name || 'Pemohon Terkait' }}</span>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">
                                Catatan Serah Terima / Pengambilan
                            </label>
                            <textarea
                                v-model="handoverNotes"
                                rows="3"
                                placeholder="Contoh: Barang telah diambil langsung oleh pemohon di loket gudang dalam kondisi baik dan lengkap."
                                class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                            ></textarea>
                        </div>

                        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                            <Package class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>Dengan mengonfirmasi, status serah terima barang menjadi <strong>Sudah Diambil</strong> dan status Purchase Requisition (PR) pemohon akan diselesaikan secara otomatis.</span>
                        </div>
                    </div>

                    <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            @click="showHandoverModal = false"
                            class="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg border border-slate-200 bg-white cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            @click="submitHandover"
                            :disabled="isSubmittingHandover"
                            class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <Check class="w-4 h-4" />
                            <span>{{ isSubmittingHandover ? 'Memproses...' : 'Konfirmasi Penyerahan' }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

