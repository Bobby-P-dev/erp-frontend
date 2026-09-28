<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { 
    showDirectPurchase, 
    submitDirectPurchaseForPayment, 
    cancelDirectPurchase 
} from '../../services/directPurchaseServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'
import Swal from 'sweetalert2'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import DocumentWorkflowTracker from '../../components/approval/DocumentWorkflowTracker.vue'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    ShoppingCart,
    Store,
    Building2,
    Calendar,
    Clock,
    CreditCard,
    CheckCircle2,
    XCircle,
    Ban,
    ExternalLink,
    FileText,
    Layers,
    Truck,
    Receipt,
    Tag,
    Package
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// State
const dp = ref(null)
const isLoading = ref(true)

// Fetch DP Detail
const fetchDetail = async () => {
    try {
        isLoading.value = true
        const id = route.params.id
        const response = await showDirectPurchase(id)
        dp.value = response.data || null
    } catch (error) {
        showError('Gagal Memuat Detail!', 'Transaksi Direct Purchase tidak ditemukan atau terjadi kesalahan server.', error)
        router.push({ name: 'user.purchasing.direct' })
    } finally {
        isLoading.value = false
    }
}

// Table Columns for items
const tableColumns = [
    { key: 'no', label: 'No', class: 'w-14 text-center' },
    { key: 'item', label: 'Item & Referensi', class: 'min-w-[240px]' },
    { key: 'unit', label: 'Satuan', class: 'w-24 text-center' },
    { key: 'qty', label: 'Kuantitas', class: 'w-28 text-right' },
    { key: 'price', label: 'Harga Satuan (Rp)', class: 'w-36 text-right' },
    { key: 'discount', label: 'Diskon (Rp)', class: 'w-32 text-right' },
    { key: 'subtotal', label: 'Subtotal (Rp)', class: 'w-40 text-right' },
    { key: 'notes', label: 'Catatan & Tautan', class: 'min-w-[180px]' }
]

const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date)
}

const getStatusBadge = (status) => {
    switch (status) {
        case 'draft':
            return {
                label: 'Draft',
                bg: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: Clock
            }
        case 'ready_for_payment':
            return {
                label: 'Siap Dibayar (Ready for Payment)',
                bg: 'bg-blue-50 text-blue-700 border-blue-200',
                icon: CreditCard
            }
        case 'completed':
            return {
                label: 'Selesai Dibayar',
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: CheckCircle2
            }
        case 'cancelled':
            return {
                label: 'Dibatalkan',
                bg: 'bg-rose-50 text-rose-700 border-rose-200',
                icon: XCircle
            }
        default:
            return {
                label: status || '-',
                bg: 'bg-gray-50 text-gray-600 border-gray-200',
                icon: Clock
            }
    }
}

// Action Handlers
const handleSubmitForPayment = async () => {
    if (!dp.value) return
    const confirmed = await showConfirm(
        'Ajukan Pembayaran?',
        `Direct Purchase ${dp.value.dp_number} senilai ${formatCurrency(dp.value.grand_total)} akan diajukan ke bagian keuangan untuk verifikasi dan proses pembayaran.`,
        'Ya, Ajukan Pembayaran',
        'Batal',
        '#2563eb'
    )
    if (!confirmed) return

    try {
        showLoading('Mengajukan pembayaran...')
        await submitDirectPurchaseForPayment(dp.value.id)
        showSuccess('Berhasil!', `Direct Purchase ${dp.value.dp_number} berhasil diajukan untuk pembayaran.`)
        fetchDetail()
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal mengajukan pembayaran.'
        showError('Gagal!', errorMsg, error)
    }
}

const handleCancel = async () => {
    if (!dp.value) return
    const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Batalkan Pembelian Langsung?',
        text: `Masukkan alasan pembatalan untuk ${dp.value.dp_number}:`,
        input: 'textarea',
        inputPlaceholder: 'Tuliskan alasan pembatalan pembelian ini...',
        showCancelButton: true,
        confirmButtonText: 'Ya, Batalkan Pembelian',
        cancelButtonText: 'Tutup',
        confirmButtonColor: '#e11d48',
        inputValidator: (value) => {
            if (!value) {
                return 'Alasan pembatalan wajib diisi!'
            }
        }
    })

    if (!isConfirmed) return

    try {
        showLoading('Membatalkan pembelian...')
        await cancelDirectPurchase(dp.value.id, reason)
        showSuccess('Berhasil!', `Direct Purchase ${dp.value.dp_number} telah dibatalkan.`)
        fetchDetail()
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal membatalkan transaksi.'
        showError('Gagal!', errorMsg, error)
    }
}

onMounted(() => {
    fetchDetail()
})
</script>

<template>
    <div class="space-y-6 max-w-7xl mx-auto pb-16">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <RouterLink to="/" class="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <Home class="w-4 h-4" />
                <span>Beranda</span>
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <RouterLink to="/purchasing" class="hover:text-indigo-600 transition-colors">
                Purchasing
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <RouterLink :to="{ name: 'user.purchasing.direct' }" class="hover:text-indigo-600 transition-colors">
                Direct Purchases
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <span class="text-gray-900 font-semibold">{{ dp?.dp_number || 'Detail Transaksi' }}</span>
        </nav>

        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm font-medium text-gray-600">Memuat rincian Direct Purchase...</p>
        </div>

        <template v-else-if="dp">
            <!-- Header Section -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div class="space-y-2">
                    <div class="flex items-center gap-3 flex-wrap">
                        <RouterLink :to="{ name: 'user.purchasing.direct' }" class="text-gray-400 hover:text-gray-600">
                            <ArrowLeft class="w-5 h-5" />
                        </RouterLink>
                        <h2 class="text-2xl font-bold text-gray-900 font-mono">{{ dp.dp_number }}</h2>

                        <!-- Status Badge -->
                        <span 
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                            :class="getStatusBadge(dp.status).bg"
                        >
                            <component :is="getStatusBadge(dp.status).icon" class="w-3.5 h-3.5" />
                            {{ getStatusBadge(dp.status).label }}
                        </span>

                        <!-- Channel Badge -->
                        <span 
                            v-if="dp.purchase_channel === 'marketplace'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200"
                        >
                            <Store class="w-3.5 h-3.5" />
                            {{ dp.marketplace_name || 'Marketplace' }}
                        </span>
                        <span 
                            v-else-if="dp.purchase_channel === 'direct_supplier'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                            <Building2 class="w-3.5 h-3.5" />
                            Supplier Resmi
                        </span>
                        <span 
                            v-else-if="dp.purchase_channel === 'retail_store'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                            <ShoppingCart class="w-3.5 h-3.5" />
                            Toko Retail
                        </span>
                    </div>

                    <p class="text-xs text-gray-500">
                        Dibuat pada {{ formatDate(dp.created_at) }} oleh 
                        <strong class="text-gray-700 font-semibold">{{ dp.created_by_user?.name || 'Staff Purchasing' }}</strong>
                    </p>
                </div>

                <!-- Header Actions -->
                <div class="flex items-center gap-3">
                    <button 
                        v-if="dp.status === 'draft'"
                        @click="handleSubmitForPayment"
                        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5"
                    >
                        <CreditCard class="w-4 h-4" />
                        <span>Ajukan Pembayaran</span>
                    </button>

                    <button 
                        v-if="['draft', 'ready_for_payment'].includes(dp.status)"
                        @click="handleCancel"
                        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-sm transition-all hover:-translate-y-0.5"
                    >
                        <Ban class="w-4 h-4" />
                        <span>Batalkan Pembelian</span>
                    </button>
                </div>
            </div>

            <!-- Two-Column Information Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Channel & Toko Information Card -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div class="flex items-center gap-2 pb-3 border-b border-gray-100">
                        <Store class="w-4 h-4 text-orange-600" />
                        <h3 class="text-sm font-bold text-gray-900">Saluran Pembelian & Tempat Transaksi</h3>
                    </div>

                    <div class="space-y-3 text-xs">
                        <template v-if="dp.purchase_channel === 'marketplace'">
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Marketplace:</span>
                                <span class="font-bold text-gray-900">{{ dp.marketplace_name }}</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Nama Official Store / Penjual:</span>
                                <span class="font-semibold text-gray-800">{{ dp.merchant_name }}</span>
                            </div>
                            <div v-if="dp.store_url" class="pt-1">
                                <span class="text-gray-500 block mb-1">Tautan Toko Online:</span>
                                <a 
                                    :href="dp.store_url" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-semibold"
                                >
                                    <ExternalLink class="w-3.5 h-3.5" />
                                    <span>Buka Halaman Toko Penjual</span>
                                </a>
                            </div>
                        </template>

                        <template v-else-if="dp.purchase_channel === 'direct_supplier'">
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Nama Supplier:</span>
                                <span class="font-bold text-gray-900">{{ dp.supplier?.name || '-' }}</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Kode Supplier:</span>
                                <span class="font-mono text-gray-700">{{ dp.supplier?.code || '-' }}</span>
                            </div>
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Email / Kontak:</span>
                                <span class="text-gray-700">{{ dp.supplier?.email || dp.supplier?.phone || '-' }}</span>
                            </div>
                        </template>

                        <template v-else-if="dp.purchase_channel === 'retail_store'">
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Nama Toko Retail:</span>
                                <span class="font-bold text-gray-900">{{ dp.merchant_name }}</span>
                            </div>
                            <div v-if="dp.store_url" class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Lokasi / URL:</span>
                                <span class="text-gray-700">{{ dp.store_url }}</span>
                            </div>
                        </template>

                        <div v-if="dp.notes" class="pt-1">
                            <span class="text-gray-500 block mb-1">Catatan Transaksi:</span>
                            <p class="text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100 italic">
                                {{ dp.notes }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Plan & Financial Summary Card -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center gap-2 pb-3 border-b border-gray-100">
                            <Receipt class="w-4 h-4 text-emerald-600" />
                            <h3 class="text-sm font-bold text-gray-900">Rincian Dokumen & Finansial</h3>
                        </div>

                        <div class="space-y-2.5 text-xs mt-3">
                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Rencana Pengadaan:</span>
                                <span class="font-bold text-gray-900 font-mono">{{ dp.procurement_plan?.pp_number || '-' }}</span>
                            </div>

                            <div class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Subtotal Barang:</span>
                                <span class="font-bold font-mono text-gray-800">{{ formatCurrency(dp.subtotal) }}</span>
                            </div>

                            <div v-if="Number(dp.discount_amount) > 0" class="flex justify-between items-center py-1 border-b border-gray-50 text-emerald-700">
                                <span>Diskon Transaksi:</span>
                                <span class="font-bold font-mono">- {{ formatCurrency(dp.discount_amount) }}</span>
                            </div>

                            <div v-if="Number(dp.shipping_cost) > 0" class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Ongkos Kirim:</span>
                                <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.shipping_cost) }}</span>
                            </div>

                            <div v-if="Number(dp.platform_fee) > 0" class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Biaya Platform:</span>
                                <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.platform_fee) }}</span>
                            </div>

                            <div v-if="Number(dp.tax_amount) > 0" class="flex justify-between items-center py-1 border-b border-gray-50">
                                <span class="text-gray-500">Pajak / PPN:</span>
                                <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.tax_amount) }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="pt-4 border-t-2 border-gray-200 mt-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                            Grand Total Pembayaran:
                        </span>
                        <span class="text-2xl font-black text-emerald-700 font-mono block mt-1">
                            {{ formatCurrency(dp.grand_total) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Associated PR Approval Workflow & History -->
            <DocumentWorkflowTracker
                v-if="dp.procurement_plan?.purchase_requisition_id"
                documentType="purchase_requisition"
                :documentId="dp.procurement_plan?.purchase_requisition_id"
                title="Progres Alur Persetujuan Dokumen PR Terkait (Workflow)"
                auditTrailTitle="Jejak Audit Persetujuan PR Terkait (Audit Trail)"
            />

            <!-- Items Table -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <Package class="w-4 h-4 text-indigo-600" />
                        <h3 class="text-sm font-bold text-gray-900">Daftar Barang yang Dibeli</h3>
                    </div>
                    <span class="text-xs font-semibold text-gray-500">
                        {{ dp.items?.length || 0 }} Item Transaksi
                    </span>
                </div>

                <BaseTable :columns="tableColumns">
                    <tr 
                        v-for="(item, idx) in dp.items" 
                        :key="item.id"
                        class="hover:bg-gray-50/70 transition-colors"
                    >
                        <!-- No -->
                        <td class="px-6 py-4 text-sm text-gray-500 text-center font-medium">
                            {{ idx + 1 }}
                        </td>

                        <!-- Item details -->
                        <td class="px-6 py-4">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-bold text-gray-900 text-sm">
                                        {{ item.item?.name || item.description || 'Item Pengadaan' }}
                                    </span>
                                    <span 
                                        v-if="!item.item_id" 
                                        class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                    >
                                        Non-Katalog
                                    </span>
                                    <span 
                                        v-else-if="item.item?.code" 
                                        class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600"
                                    >
                                        {{ item.item.code }}
                                    </span>
                                </div>

                                <!-- Product link -->
                                <a 
                                    v-if="item.product_url" 
                                    :href="item.product_url" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
                                >
                                    <ExternalLink class="w-3 h-3" />
                                    <span>Buka Link Produk</span>
                                </a>
                            </div>
                        </td>

                        <!-- Unit -->
                        <td class="px-6 py-4 text-center text-xs font-semibold text-gray-700">
                            {{ item.unit?.code || item.unit?.name || '-' }}
                        </td>

                        <!-- Qty -->
                        <td class="px-6 py-4 text-right font-black text-gray-900 text-sm">
                            {{ Number(item.quantity).toLocaleString('id-ID') }}
                        </td>

                        <!-- Unit Price -->
                        <td class="px-6 py-4 text-right font-mono text-gray-800 text-xs">
                            {{ formatCurrency(item.unit_price) }}
                        </td>

                        <!-- Item Discount -->
                        <td class="px-6 py-4 text-right font-mono text-emerald-700 text-xs">
                            {{ Number(item.discount_amount) > 0 ? formatCurrency(item.discount_amount) : '-' }}
                        </td>

                        <!-- Subtotal -->
                        <td class="px-6 py-4 text-right font-black font-mono text-gray-900 text-sm">
                            {{ formatCurrency(item.total || item.subtotal) }}
                        </td>

                        <!-- Notes -->
                        <td class="px-6 py-4 text-xs text-gray-500 italic">
                            {{ item.notes || '-' }}
                        </td>
                    </tr>
                </BaseTable>
            </div>
        </template>
    </div>
</template>
