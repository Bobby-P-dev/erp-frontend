<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../../../stores/auth.js'
import { getSupplierPortalDashboard } from '../../../services/supplierPortalServices.js'
import { formatDate } from '../../../composables/useFormatter.js'
import { showError } from '../../../utils/swal.js'

import ModuleCard from '../../../components/ui/ModuleCard.vue'
import { useRfqDeadline } from '@/composables/purchasing/useRfqDeadline.js'

const { getDeadlineInfo } = useRfqDeadline()

import {
    Scale,
    Clock,
    AlertCircle,
    CheckCircle2,
    Building2,
    RefreshCw,
    FileText,
    ReceiptText,
    ArrowRight,
    ShieldCheck,
    IdCard,
    User
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const dashboardData = ref(null)

const user = computed(() => authStore.user || {})
const supplier = computed(() => user.value.supplier || dashboardData.value?.supplier || {})

// Dynamic time greeting (identik dengan Dashboard Main)
const timeGreeting = computed(() => {
    const hour = new Date().getHours()
    if (hour >= 4 && hour < 11) return 'Selamat pagi'
    if (hour >= 11 && hour < 15) return 'Selamat siang'
    if (hour >= 15 && hour < 18) return 'Selamat sore'
    return 'Selamat malam'
})

// Current date formatted in Indonesian locale
const currentDateFormatted = computed(() => {
    const now = new Date()
    return now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
})

const fetchDashboard = async () => {
    loading.value = true
    try {
        const res = await getSupplierPortalDashboard()
        dashboardData.value = res.data || res
    } catch (err) {
        showError('Gagal Memuat Dashboard', err.response?.data?.message || 'Terjadi kesalahan sistem.')
    } finally {
        loading.value = false
    }
}

// Menu Portal Rekanan berbentuk Card (Identik dengan ModuleCard Dashboard Main)
const supplierModules = computed(() => {
    const metrics = dashboardData.value?.metrics || {}
    const needAction = Number(metrics.need_action || 0)
    const inEval = Number(metrics.in_evaluation || 0)
    const awarded = Number(metrics.awarded || 0)
    const poNeedAck = Number(metrics.purchase_orders_need_ack || 0)
    const poTotal = Number(metrics.purchase_orders_total || 0)

    return [
        {
            id: 'rfqs',
            title: 'Tender & Permintaan Penawaran (RFQ)',
            subtitle: 'Undangan Penawaran Harga',
            description: 'Daftar paket tender pengadaan aktif, spesifikasi teknis barang, dan pengisian surat penawaran harga resmi.',
            icon: FileText,
            to: { name: 'supplier.portal.rfqs' },
            color: 'blue',
            badge: needAction > 0 ? `${needAction} Perlu Respon` : '',
            badgeVariant: 'amber',
            actionText: 'Buka Tender'
        },
        {
            id: 'quotations',
            title: 'Riwayat Penawaran & Status Awarding',
            subtitle: 'Surat Penawaran & Keputusan Pemenang',
            description: 'Pantau seluruh penawaran harga yang pernah diajukan, status evaluasi komparasi oleh Buyer, serta penetapan pemenang tender.',
            icon: ReceiptText,
            to: { name: 'supplier.portal.quotations' },
            color: 'emerald',
            badge: awarded > 0 ? `${awarded} Menang Tender` : (inEval > 0 ? `${inEval} Dalam Evaluasi` : ''),
            badgeVariant: awarded > 0 ? 'emerald' : 'blue',
            actionText: 'Lihat Hasil Penawaran'
        },
        {
            id: 'purchase_orders',
            title: 'Pesanan Pembelian Resmi (PO)',
            subtitle: 'Konfirmasi PO & Pengiriman Barang',
            description: 'Daftar dokumen Purchase Order resmi dari hasil tender yang Anda menangkan beserta formulir konfirmasi kesanggupan pengiriman.',
            icon: CheckCircle2,
            to: { name: 'supplier.portal.purchase-orders' },
            color: 'blue',
            badge: poNeedAck > 0 ? `${poNeedAck} Perlu Konfirmasi` : (poTotal > 0 ? `${poTotal} PO Aktif` : ''),
            badgeVariant: poNeedAck > 0 ? 'amber' : 'emerald',
            actionText: 'Buka Pesanan (PO)'
        }
    ]
})

// Konversi status internal RFQ ke label bahasa Indonesia & badge styling
const getRfqStatusBadge = (status) => {
    switch (status) {
        case 'published':
            return { label: 'Tender Dibuka', class: 'bg-blue-50 text-blue-700 border-blue-200' }
        case 'evaluation':
            return { label: 'Tahap Evaluasi', class: 'bg-amber-50 text-amber-700 border-amber-200' }
        case 'completed':
            return { label: 'Tender Selesai', class: 'bg-slate-100 text-slate-700 border-slate-200' }
        case 'cancelled':
            return { label: 'Dibatalkan', class: 'bg-rose-50 text-rose-700 border-rose-200' }
        default:
            return { label: status || '-', class: 'bg-slate-50 text-slate-600 border-slate-200' }
    }
}

onMounted(() => {
    fetchDashboard()
})
</script>

<template>
    <section class="w-full space-y-8 py-1">
        <!-- 1. Welcome Section & Inline Metadata (Identik dengan Dashboard Main) -->
        <div class="bg-white border border-[#E5EAF1] rounded-[14px] p-6 sm:p-7 shadow-xs">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div class="space-y-1">
                    <h1 class="text-[22px] sm:text-[26px] font-semibold text-[#111827] tracking-tight leading-[1.25]">
                        {{ timeGreeting }}, {{ supplier.name || user.name || 'Rekan Rekanan' }}
                    </h1>
                    <p class="text-[14px] sm:text-[15px] text-[#667085] leading-normal">
                        Kelola penawaran harga tender, jadwal pengadaan, dan arsip komersial bersama PT Padma Soode Indonesia.
                    </p>
                </div>

                <!-- Secondary Calendar Date & Refresh Button -->
                <div class="flex items-center gap-3 self-start sm:self-auto">
                    <div class="text-[13px] font-medium text-[#667085] sm:text-right shrink-0 select-none hidden sm:block">
                        {{ currentDateFormatted }}
                    </div>
                    <button
                        type="button"
                        @click="fetchDashboard"
                        :disabled="loading"
                        class="p-2 text-slate-500 hover:text-[#014BAA] hover:bg-[#EAF2FF] rounded-[10px] border border-[#E5EAF1] transition-colors cursor-pointer shrink-0"
                        title="Segarkan Data Dashboard"
                    >
                        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
                    </button>
                </div>
            </div>

            <!-- Inline Metadata Chips (Identik dengan Dashboard Main) -->
            <div class="flex flex-wrap items-center gap-2 pt-5 mt-5 border-t border-[#E5EAF1]/80 text-[13px]">
                <!-- Entitas Perusahaan Rekanan -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#F7F9FC] border border-[#E5EAF1] text-[#111827]">
                    <Building2 class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium">{{ supplier.name || 'PT Rekanan Terdaftar' }}</span>
                </div>

                <!-- Kode Vendor -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#F7F9FC] border border-[#E5EAF1] text-[#111827]">
                    <IdCard class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium font-mono">{{ supplier.supplier_code || 'VENDOR' }}</span>
                </div>

                <!-- Kontak PIC -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#F7F9FC] border border-[#E5EAF1] text-[#111827]">
                    <User class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium">{{ user.name || 'PIC Rekanan' }}</span>
                </div>

                <!-- Status Akun -->
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-semibold">
                    <ShieldCheck class="size-3.5 text-emerald-600 shrink-0" />
                    <span>Rekanan Resmi Terverifikasi</span>
                </div>
            </div>
        </div>

        <!-- 2. Menu Rekanan (Berbentuk Card seperti Dashboard Main) -->
        <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                    <h2 class="text-[18px] sm:text-[19px] font-semibold text-[#111827] tracking-tight leading-snug">
                        Menu Rekanan
                    </h2>
                    <p class="text-[14px] text-[#667085] mt-0.5">
                        Pilih menu portal untuk mulai mengelola tender dan penawaran Anda.
                    </p>
                </div>

                <div class="text-[13px] font-medium text-[#667085] select-none">
                    {{ supplierModules.length }} menu tersedia
                </div>
            </div>

            <!-- Responsive Grid of ModuleCards: 2 Module Cards side-by-side -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                <ModuleCard
                    v-for="mod in supplierModules"
                    :key="mod.id"
                    :title="mod.title"
                    :subtitle="mod.subtitle"
                    :description="mod.description"
                    :icon="mod.icon"
                    :to="mod.to"
                    :color="mod.color"
                    :badge="mod.badge"
                    :badge-variant="mod.badgeVariant"
                    :action-text="mod.actionText"
                />
            </div>
        </div>

        <!-- 3. Bento KPI Dock Ringkas (Statistik Operasional) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- 1. Total Diundang -->
            <div class="bg-white p-5 rounded-[14px] border border-[#E5EAF1] shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-slate-500">Total Undangan Tender</span>
                    <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                        <FileText class="w-4 h-4" />
                    </div>
                </div>
                <div class="mt-4">
                    <div class="text-2xl font-bold text-slate-900 font-mono">
                        {{ dashboardData?.metrics?.total_invited || 0 }}
                    </div>
                    <span class="text-[11px] text-slate-400 mt-1 block">Tender yang mengikutsertakan perusahaan Anda</span>
                </div>
            </div>

            <!-- 2. Perlu Respon (Action Required) -->
            <div class="bg-white p-5 rounded-[14px] border border-[#E5EAF1] shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-amber-700">Perlu Respon Segera</span>
                    <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                        <Clock class="w-4 h-4" />
                    </div>
                </div>
                <div class="mt-4">
                    <div class="text-2xl font-bold text-amber-800 font-mono">
                        {{ dashboardData?.metrics?.need_action || 0 }}
                    </div>
                    <span class="text-[11px] text-amber-600/90 mt-1 block font-medium">Belum mengisi penawaran harga</span>
                </div>
            </div>

            <!-- 3. Dalam Evaluasi -->
            <div class="bg-white p-5 rounded-[14px] border border-[#E5EAF1] shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-blue-700">Dalam Evaluasi Buyer</span>
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                        <Scale class="w-4 h-4" />
                    </div>
                </div>
                <div class="mt-4">
                    <div class="text-2xl font-bold text-blue-700 font-mono">
                        {{ dashboardData?.metrics?.in_evaluation || 0 }}
                    </div>
                    <span class="text-[11px] text-slate-400 mt-1 block">Penawaran masuk dalam komparasi matriks</span>
                </div>
            </div>

            <!-- 4. Terpilih (Pemenang) -->
            <div class="bg-white p-5 rounded-[14px] border border-[#E5EAF1] shadow-xs flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-emerald-800">Terpilih (Pemenang)</span>
                    <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                        <CheckCircle2 class="w-4 h-4" />
                    </div>
                </div>
                <div class="mt-4">
                    <div class="text-2xl font-bold text-emerald-700 font-mono">
                        {{ dashboardData?.metrics?.awarded || 0 }}
                    </div>
                    <span class="text-[11px] text-emerald-700 mt-1 block font-medium">Tender yang memilih perusahaan Anda</span>
                </div>
            </div>
        </div>

        <!-- 4. Tabel 5 Undangan Tender Terbaru -->
        <div class="bg-white rounded-[14px] border border-[#E5EAF1] shadow-xs overflow-hidden">
            <div class="p-5 border-b border-[#E5EAF1] flex items-center justify-between">
                <div>
                    <h3 class="text-sm font-bold text-slate-900">Undangan Tender Terbaru</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Daftar tender terbaru dari PT Padma Soode Indonesia</p>
                </div>
                <RouterLink
                    :to="{ name: 'supplier.portal.rfqs' }"
                    class="text-xs font-semibold text-[#014BAA] hover:text-blue-800 inline-flex items-center gap-1 transition-colors"
                >
                    <span>Lihat Semua RFQ</span>
                    <ArrowRight class="w-3.5 h-3.5" />
                </RouterLink>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                            <th class="py-3 px-5">No. RFQ & Judul Tender</th>
                            <th class="py-3 px-4">Tenggat Waktu</th>
                            <th class="py-3 px-4 text-center">Status Tender</th>
                            <th class="py-3 px-4 text-center">Status Respon</th>
                            <th class="py-3 px-5 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="loading">
                            <td colspan="5" class="py-8 text-center text-slate-400">
                                <RefreshCw class="w-5 h-5 animate-spin mx-auto mb-2 text-[#014BAA]" />
                                <span>Memuat daftar tender...</span>
                            </td>
                        </tr>
                        <tr v-else-if="!dashboardData?.recent_rfqs?.length">
                            <td colspan="5" class="py-8 text-center text-slate-400">
                                Belum ada undangan tender yang ditujukan ke perusahaan Anda.
                            </td>
                        </tr>
                        <tr
                            v-else
                            v-for="inv in dashboardData.recent_rfqs"
                            :key="inv.id"
                            class="hover:bg-slate-50/80 transition-colors"
                        >
                            <!-- Nomor RFQ & Judul -->
                            <td class="py-3.5 px-5">
                                <div class="font-mono font-bold text-slate-900">{{ inv.rfq?.rfq_number }}</div>
                                <div class="text-[11px] text-slate-600 line-clamp-1 max-w-sm mt-0.5">{{ inv.rfq?.title }}</div>
                            </td>

                            <!-- Deadline -->
                            <td class="py-3.5 px-4 whitespace-nowrap">
                                <div class="text-slate-800 font-medium">{{ formatDate(inv.rfq?.deadline_date) }}</div>
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] border mt-0.5" :class="getDeadlineInfo(inv.rfq).class">
                                    {{ getDeadlineInfo(inv.rfq).label }}
                                </span>
                            </td>

                            <!-- Status RFQ -->
                            <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                <span 
                                    class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                                    :class="getRfqStatusBadge(inv.rfq?.status).class"
                                >
                                    {{ getRfqStatusBadge(inv.rfq?.status).label }}
                                </span>
                            </td>

                            <!-- Status Respon -->
                            <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                <span
                                    v-if="inv.quote_status === 'received'"
                                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                >
                                    <CheckCircle2 class="w-3 h-3" />
                                    Penawaran Dikirim
                                </span>
                                <span
                                    v-else-if="inv.quote_status === 'viewed'"
                                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                    <Clock class="w-3 h-3" />
                                    Telah Dilihat
                                </span>
                                <span
                                    v-else-if="inv.quote_status === 'declined'"
                                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                                >
                                    Menolak Partisipasi
                                </span>
                                <span
                                    v-else
                                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 font-bold"
                                >
                                    <AlertCircle class="w-3 h-3" />
                                    Perlu Direspon
                                </span>
                            </td>

                            <!-- Aksi (Buka di Tab yang Sama) -->
                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                <RouterLink
                                    v-if="inv.portal_access_token"
                                    :to="`/portal/rfq/${inv.portal_access_token}`"
                                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                    :class="inv.quote_status === 'received' ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300' : 'bg-[#014BAA] hover:bg-blue-700 text-white shadow-2xs'"
                                >
                                    <span>{{ inv.quote_status === 'received' ? 'Lihat Penawaran' : 'Isi Penawaran' }}</span>
                                    <ArrowRight class="w-3.5 h-3.5" />
                                </RouterLink>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </section>
</template>
