<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseModal from '../ui/BaseModal.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'
import {
    Receipt,
    CreditCard,
    ShoppingCart,
    Building2,
    Package,
    ExternalLink,
    Paperclip,
    FileCheck,
    CheckCircle2,
    RefreshCw
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
    isLoading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue', 'close', 'disburse'])

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

const handleDisburse = () => {
    emit('disburse', props.item)
}

const getRecipientLabel = (type) => {
    switch (type) {
        case 'supplier': return 'Supplier / Vendor Resmi'
        case 'marketplace_va': return 'Virtual Account / Marketplace'
        case 'employee_reimbursement': return 'Reimbursement Karyawan'
        default: return type || '-'
    }
}

// Source Document Info for Selected PRQ
const sourceDocInfo = computed(() => {
    if (!props.item) return null
    if (props.item.direct_purchase) {
        const dp = props.item.direct_purchase
        return {
            type: 'Direct Purchase (Pembelian Langsung)',
            typeCode: 'direct_purchase',
            documentNumber: dp.dp_number,
            channel: dp.purchase_channel,
            marketplace: dp.marketplace_name,
            merchant: dp.merchant_name || dp.supplier?.name,
            storeUrl: dp.store_url,
            route: `/purchasing/direct-purchases/${dp.id}`
        }
    }
    if (props.item.payable_type === 'direct_purchase' || props.item.direct_purchase_id) {
        return {
            type: 'Direct Purchase (Pembelian Langsung)',
            typeCode: 'direct_purchase',
            documentNumber: props.item.direct_purchase?.dp_number || `DP #${props.item.direct_purchase_id}`,
            channel: props.item.direct_purchase?.purchase_channel || 'marketplace',
            marketplace: props.item.direct_purchase?.marketplace_name,
            merchant: props.item.direct_purchase?.merchant_name,
            storeUrl: props.item.direct_purchase?.store_url,
            route: `/purchasing/direct-purchases/${props.item.direct_purchase_id}`
        }
    }
    if (props.item.payable_type === 'rfq' || props.item.payable_type === 'purchase_order') {
        return {
            type: props.item.payable_type === 'rfq' ? 'RFQ / Tender Vendor' : 'Purchase Order',
            typeCode: props.item.payable_type,
            documentNumber: props.item.payable_number || `#${props.item.payable_id}`,
            channel: 'supplier',
            marketplace: null,
            merchant: props.item.recipient_name,
            storeUrl: null,
            route: null
        }
    }
    return null
})

// Effective Items for Selected PRQ
const effectivePRQItems = computed(() => {
    if (!props.item) return []
    if (props.item.items && Array.isArray(props.item.items) && props.item.items.length > 0) {
        return props.item.items
    }
    const dpItems = props.item.direct_purchase?.items
    if (Array.isArray(dpItems) && dpItems.length > 0) {
        return dpItems.map(item => ({
            id: item.id,
            item_name: item.description || item.item?.name || (item.item_id ? `Item #${item.item_id}` : 'Item Pengadaan'),
            item_code: item.item?.code || null,
            is_non_catalog: !item.item_id,
            quantity: item.quantity,
            unit_name: item.unit?.code || item.unit?.name || '-',
            unit_price: item.unit_price,
            discount_amount: item.discount_amount || 0,
            subtotal: item.total || item.subtotal || ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)),
            notes: item.notes,
            product_url: item.product_url
        }))
    }
    return []
})

// Cost Breakdown for Selected PRQ
const effectiveCostBreakdown = computed(() => {
    if (!props.item) return null
    if (props.item.cost_breakdown) {
        return props.item.cost_breakdown
    }
    if (props.item.direct_purchase) {
        const dp = props.item.direct_purchase
        return {
            subtotal: Number(dp.subtotal) || 0,
            discount_amount: Number(dp.discount_amount) || 0,
            shipping_cost: Number(dp.shipping_cost) || 0,
            platform_fee: Number(dp.platform_fee) || 0,
            tax_amount: Number(dp.tax_amount) || 0,
            grand_total: Number(dp.grand_total) || Number(props.item.amount) || 0
        }
    }
    return null
})
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        @close="close"
        size="5xl"
        body-class="p-6 text-xs"
    >
        <template #header>
            <div class="flex items-center gap-3">
                <span class="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <Receipt class="w-5 h-5" />
                </span>
                <div>
                    <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Detail Permohonan Pembayaran
                    </h3>
                    <p class="text-xs font-mono text-slate-500">
                        {{ item?.prq_number }}
                    </p>
                </div>
            </div>
        </template>

        <div v-if="isLoading" class="py-12 text-center">
            <RefreshCw class="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            <span class="text-xs text-slate-500">Memuat rincian lengkap dokumen pembayaran...</span>
        </div>

        <div v-else-if="item" class="space-y-6">
            <!-- Ringkasan Finansial Card -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                    <span class="text-slate-400">Total Nominal Tagihan:</span>
                    <p class="text-lg font-bold font-mono text-slate-900 mt-0.5">
                        {{ formatCurrency(item.amount, item.currency) }}
                    </p>
                    <p v-if="item.currency && item.currency !== 'IDR' && item.exchange_rate" class="text-xs text-blue-600 font-mono mt-0.5">
                        ≈ {{ formatCurrency((Number(item.amount) || 0) * (Number(item.exchange_rate) || 1), 'IDR') }}
                    </p>
                </div>
                <div>
                    <span class="text-slate-400">Status Pembayaran:</span>
                    <div class="mt-1">
                        <StatusBadge :status="item.status" size="sm" />
                    </div>
                </div>
                <div>
                    <span class="text-slate-400">Jatuh Tempo:</span>
                    <p class="font-medium text-slate-800 mt-0.5">
                        {{ item.due_date ? formatDate(item.due_date) : 'Segera (Immediate)' }}
                    </p>
                </div>
            </div>

            <!-- Dokumen Asal Pengadaan (Direct Purchase / RFQ) -->
            <div v-if="sourceDocInfo" class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div class="flex items-center justify-between">
                    <h4 class="font-semibold text-slate-900 text-sm flex items-center gap-2">
                        <ShoppingCart class="w-4 h-4 text-blue-600" />
                        Dokumen Asal Pengadaan
                    </h4>
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {{ sourceDocInfo.type }}
                    </span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <p class="text-slate-400">Nomor Dokumen:</p>
                        <div class="mt-0.5 flex items-center gap-1.5">
                            <span class="font-mono font-bold text-slate-900">{{ sourceDocInfo.documentNumber }}</span>
                            <RouterLink
                                v-if="sourceDocInfo.route"
                                :to="sourceDocInfo.route"
                                target="_blank"
                                class="text-blue-600 hover:text-blue-700 inline-flex items-center"
                                title="Buka Dokumen Pengadaan"
                            >
                                <ExternalLink class="w-3.5 h-3.5" />
                            </RouterLink>
                        </div>
                    </div>
                    <div>
                        <p class="text-slate-400">Saluran Pembelian:</p>
                        <p class="font-medium text-slate-800 mt-0.5 capitalize">{{ sourceDocInfo.channel?.replace('_', ' ') || '-' }}</p>
                    </div>
                    <div>
                        <p class="text-slate-400">Toko / Merchant / Marketplace:</p>
                        <div class="mt-0.5 flex items-center gap-1.5">
                            <span class="font-medium text-slate-800">{{ sourceDocInfo.merchant || sourceDocInfo.marketplace || '-' }}</span>
                            <a
                                v-if="sourceDocInfo.storeUrl"
                                :href="sourceDocInfo.storeUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-blue-600 hover:text-blue-700 inline-flex items-center"
                                title="Kunjungi Toko"
                            >
                                <ExternalLink class="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                    <div>
                        <p class="text-slate-400">Pemohon (Purchasing):</p>
                        <p class="font-medium text-slate-800 mt-0.5">
                            {{ item.requester?.employee?.name || item.requester?.name || '-' }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Informasi Rekening & Rekanan -->
            <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 class="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Building2 class="w-4 h-4 text-blue-600" />
                    Informasi Rekening Penerima Dana
                </h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-slate-400">Nama Penerima / Vendor:</p>
                        <p class="font-medium text-slate-800 mt-0.5">{{ item.recipient_name || '-' }}</p>
                    </div>
                    <div>
                        <p class="text-slate-400">Tipe Penerima:</p>
                        <p class="font-medium text-slate-800 mt-0.5">{{ getRecipientLabel(item.recipient_type) }}</p>
                    </div>
                    <div>
                        <p class="text-slate-400">Bank Tujuan:</p>
                        <p class="font-medium text-slate-800 mt-0.5">{{ item.bank_name || '-' }}</p>
                    </div>
                    <div>
                        <p class="text-slate-400">Nomor Rekening / VA:</p>
                        <p class="font-mono font-bold text-slate-900 mt-0.5">{{ item.bank_account_number || '-' }}</p>
                        <p class="text-[10px] text-slate-400">a.n. {{ item.bank_account_holder || '-' }}</p>
                    </div>
                </div>
                <div v-if="item.notes" class="pt-2 border-t border-slate-100">
                    <p class="text-slate-400">Catatan Pengajuan:</p>
                    <p class="text-slate-700 italic mt-0.5">{{ item.notes }}</p>
                </div>
            </div>

            <!-- RINCIAN BARANG / JASA (ITEMS TABLE) & KALKULASI BIAYA -->
            <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <h4 class="font-semibold text-slate-900 text-sm flex items-center gap-2">
                        <Package class="w-4 h-4 text-blue-600" />
                        Daftar Barang / Jasa yang Dibayarkan
                    </h4>
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {{ effectivePRQItems.length }} Item
                    </span>
                </div>

                <!-- Empty State -->
                <div v-if="effectivePRQItems.length === 0" class="p-6 text-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500">
                    <Package class="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>Dokumen ini tidak memiliki rincian item barang/jasa atau item dimuat dari sistem dokumen terkait.</p>
                </div>

                <!-- Table -->
                <div v-else class="rounded-lg border border-slate-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                                    <th class="py-2.5 px-3 w-10 text-center">No</th>
                                    <th class="py-2.5 px-3 min-w-[200px]">Item / Deskripsi</th>
                                    <th class="py-2.5 px-3 text-right w-20">Jumlah</th>
                                    <th class="py-2.5 px-3 text-center w-20">Satuan</th>
                                    <th class="py-2.5 px-3 text-right w-28">Harga Satuan ({{ item.currency || 'IDR' }})</th>
                                    <th class="py-2.5 px-3 text-right w-28">Subtotal ({{ item.currency || 'IDR' }})</th>
                                    <th class="py-2.5 px-3 min-w-[150px]">Catatan / Tautan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 bg-white">
                                <tr v-for="(it, idx) in effectivePRQItems" :key="it.id || idx" class="hover:bg-slate-50/60 transition-colors">
                                    <td class="py-2.5 px-3 text-center text-slate-400 font-medium">{{ idx + 1 }}</td>
                                    <td class="py-2.5 px-3">
                                        <div class="flex items-center gap-1.5 flex-wrap">
                                            <span class="font-bold text-slate-900">{{ it.item_name }}</span>
                                            <span v-if="it.is_non_catalog" class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                Non-Katalog
                                            </span>
                                            <span v-else-if="it.item_code" class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-600">
                                                {{ it.item_code }}
                                            </span>
                                        </div>
                                    </td>
                                    <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                        {{ Number(it.quantity).toLocaleString('id-ID') }}
                                    </td>
                                    <td class="py-2.5 px-3 text-center text-slate-600 font-medium">
                                        {{ it.unit_name || it.unit?.code || '-' }}
                                    </td>
                                    <td class="py-2.5 px-3 text-right font-mono text-slate-700">
                                        {{ formatCurrency(it.unit_price, item.currency) }}
                                    </td>
                                    <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                        {{ formatCurrency(it.subtotal, item.currency) }}
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <div class="space-y-0.5">
                                            <p v-if="it.notes" class="text-slate-500 italic">{{ it.notes }}</p>
                                            <a
                                                v-if="it.product_url"
                                                :href="it.product_url"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                                            >
                                                <ExternalLink class="w-3 h-3" />
                                                <span>Link Produk</span>
                                            </a>
                                            <span v-if="!it.notes && !it.product_url" class="text-slate-300">-</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Rincian Biaya Tambahan & Total (Cost Breakdown) -->
                    <div v-if="effectiveCostBreakdown" class="bg-slate-50/80 p-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div class="text-[11px] text-slate-500 space-y-0.5">
                            <p>Verifikasi item dan nominal tagihan sebelum memproses pencairan kasir.</p>
                            <p v-if="effectiveCostBreakdown.shipping_cost > 0 || effectiveCostBreakdown.platform_fee > 0" class="text-slate-400">
                                Termasuk ongkos kirim dan biaya platform dari marketplace / vendor.
                            </p>
                        </div>
                        <div class="w-full sm:w-72 space-y-1.5 text-xs">
                            <div class="flex justify-between text-slate-600">
                                <span>Subtotal Barang:</span>
                                <span class="font-mono font-medium">{{ formatCurrency(effectiveCostBreakdown.subtotal, item.currency) }}</span>
                            </div>
                            <div v-if="effectiveCostBreakdown.discount_amount > 0" class="flex justify-between text-emerald-700">
                                <span>Diskon:</span>
                                <span class="font-mono font-medium">-{{ formatCurrency(effectiveCostBreakdown.discount_amount, item.currency) }}</span>
                            </div>
                            <div v-if="effectiveCostBreakdown.shipping_cost > 0" class="flex justify-between text-slate-600">
                                <span>Ongkos Kirim:</span>
                                <span class="font-mono font-medium">+{{ formatCurrency(effectiveCostBreakdown.shipping_cost, item.currency) }}</span>
                            </div>
                            <div v-if="effectiveCostBreakdown.platform_fee > 0" class="flex justify-between text-slate-600">
                                <span>Biaya Layanan:</span>
                                <span class="font-mono font-medium">+{{ formatCurrency(effectiveCostBreakdown.platform_fee, item.currency) }}</span>
                            </div>
                            <div v-if="effectiveCostBreakdown.tax_amount > 0" class="flex justify-between text-slate-600">
                                <span>Pajak (PPN):</span>
                                <span class="font-mono font-medium">+{{ formatCurrency(effectiveCostBreakdown.tax_amount, item.currency) }}</span>
                            </div>
                            <div class="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-slate-900 text-sm">
                                <span>Total Tagihan:</span>
                                <span class="font-mono text-blue-600">{{ formatCurrency(effectiveCostBreakdown.grand_total, item.currency) }}</span>
                            </div>
                            <div v-if="item.currency && item.currency !== 'IDR' && item.exchange_rate" class="flex justify-between pt-1 border-t border-dashed border-slate-200 text-xs text-blue-700 font-semibold">
                                <span>Setara Pembukuan (IDR):</span>
                                <span class="font-mono">≈ {{ formatCurrency((Number(effectiveCostBreakdown.grand_total) || 0) * (Number(item.exchange_rate) || 1), 'IDR') }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Realisasi Pembayaran Kasir & Bukti Transfer (Jika Sudah Paid) -->
            <div v-if="item.payment" class="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard class="w-4 h-4 text-emerald-600" />
                        Realisasi Pencairan Kasir (Disbursement)
                    </h4>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Telah Dibayar (Paid)
                    </span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-700">
                    <div>
                        <p class="text-slate-400">No. Bukti Kasir:</p>
                        <p class="font-mono font-bold text-slate-900 mt-0.5">{{ item.payment.payment_number }}</p>
                    </div>
                    <div>
                        <p class="text-slate-400">Tanggal Realisasi:</p>
                        <p class="font-medium text-slate-800 mt-0.5">
                            {{ item.payment.payment_date ? formatDate(item.payment.payment_date, { month: 'long' }) : '-' }}
                        </p>
                    </div>
                    <div>
                        <p class="text-slate-400">Akun Sumber Dana:</p>
                        <p class="font-medium text-slate-800 mt-0.5">{{ item.payment.source_account?.name || '-' }}</p>
                    </div>
                    <div>
                        <p class="text-slate-400">Biaya Admin Bank:</p>
                        <p class="font-mono text-slate-800 mt-0.5">{{ formatCurrency(item.payment.bank_fee) }}</p>
                    </div>
                    <div>
                        <p class="text-slate-400">No. Referensi / Mutasi:</p>
                        <p class="font-mono font-bold text-slate-900 mt-0.5">{{ item.payment.reference_number || '-' }}</p>
                    </div>
                </div>

                <!-- Bukti Transfer File Preview -->
                <div v-if="item.payment.proof_file" class="pt-2 border-t border-emerald-200/80">
                    <p class="text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                        <Paperclip class="w-3.5 h-3.5 text-emerald-600" />
                        Lampiran Bukti Transfer / Slip Pembayaran:
                    </p>
                    <div class="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-lg">
                        <div class="flex items-center gap-2.5 overflow-hidden">
                            <div class="w-8 h-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <FileCheck class="w-4 h-4" />
                            </div>
                            <div class="truncate">
                                <p class="font-semibold text-slate-800 truncate text-xs">{{ item.payment.proof_file.original_name }}</p>
                                <p class="text-[10px] text-slate-400 font-mono">{{ Math.round((item.payment.proof_file.file_size || 0) / 1024) }} KB</p>
                            </div>
                        </div>
                        <a
                            :href="item.payment.proof_file.file_url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 shrink-0"
                        >
                            <ExternalLink class="w-3 h-3" />
                            Buka File
                        </a>
                    </div>
                </div>
            </div>

            <!-- Informasi Status Tagihan -->
            <div class="border border-blue-200 bg-blue-50/50 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                    <p class="text-xs font-bold text-slate-800">Tagihan Siap Dicairkan (Persetujuan Otomatis dari PR)</p>
                    <p class="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Sesuai regulasi sistem, permohonan pembayaran (Payment Request) tidak melewati jenjang approval finance terpisah. Dokumen ini disahkan secara langsung saat Purchase Requisition (PR) / Direct Purchase disetujui, dan kasir dapat langsung memproses pencairan dana.
                    </p>
                </div>
            </div>
        </div>

        <template #footer>
            <button
                type="button"
                @click="close"
                class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
                Tutup
            </button>

            <button
                v-if="(item?.status?.value || item?.status) === 'approved'"
                type="button"
                @click="handleDisburse"
                class="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
                <CreditCard class="w-4 h-4" />
                Cairkan Dana Sekarang
            </button>
        </template>
    </BaseModal>
</template>
