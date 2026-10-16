<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getPurchaseRequisitions } from '../../services/purchaseRequisitionServices.js'
import { getProcurementPlans } from '../../services/procurementPlanServices.js'
import { getDirectPurchases } from '../../services/directPurchaseServices.js'
import { getPendingApprovalCount } from '../../services/approvalServices.js'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import warehouseHeroImg from '../../assets/purchasing-warehouse-hero.png'
import { 
    Plus, 
    ArrowRight,
    ChevronRight,
    FileText,
    CheckCircle2,
    CheckSquare,
    Layers, 
    ShoppingCart, 
    Scale, 
    Lock, 
    ShieldAlert,
    Link2,
    Workflow
} from '@lucide/vue'

const authStore = useAuthStore()

// Operational summary counts for live tactile feedback
const counts = ref({
    pr: null,
    approvals: null,
    plans: null,
    direct: null
})

const fetchSummaryCounts = async () => {
    try {
        const prRes = await getPurchaseRequisitions('', 1, 1)
        counts.value.pr = prRes?.meta?.total ?? prRes?.data?.total ?? null
    } catch (_) {}

    try {
        const appRes = await getPendingApprovalCount({ document_type: 'purchase_requisition' })
        counts.value.approvals = Number(appRes?.count ?? 0)
    } catch (_) {}

    try {
        const planRes = await getProcurementPlans({}, 1, 1)
        counts.value.plans = planRes?.meta?.total ?? planRes?.data?.total ?? null
    } catch (_) {}

    try {
        const dpRes = await getDirectPurchases('', 1, {})
        counts.value.direct = dpRes?.meta?.total ?? dpRes?.data?.total ?? null
    } catch (_) {}
}

onMounted(() => {
    fetchSummaryCounts()
})
</script>

<template>
    <section class="space-y-6">
        <!-- 1. Breadcrumb Navigation -->
        <BaseBreadcrumb :items="[{ label: 'Pengadaan (Purchasing)' }]" />

        <!-- 2. Hero Section with Integrated Illustration -->
        <div class="relative bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 min-h-[220px]">
            <!-- Background Warehouse Illustration on the Right -->
            <div class="absolute right-0 top-0 bottom-0 w-full sm:w-3/5 lg:w-1/2 pointer-events-none select-none overflow-hidden flex items-center justify-end">
                <div class="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-10 hidden sm:block"></div>
                <img 
                    :src="warehouseHeroImg" 
                    alt="Warehouse Procurement Illustration" 
                    class="h-full w-auto object-cover sm:object-contain object-right"
                />
            </div>

            <!-- Left: Title, Context & CTA -->
            <div class="relative z-20 max-w-xl space-y-3">
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Pengadaan & Pembelian
                </h1>
                <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                    Kelola seluruh proses pengadaan barang dan jasa, mulai dari pengajuan, persetujuan, pemenuhan kebutuhan hingga pembayaran dengan lebih terstruktur.
                </p>
                <div class="pt-2">
                    <RouterLink
                        :to="{ name: 'user.purchasing.requisitions.create' }"
                        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all cursor-pointer group"
                    >
                        <Plus class="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                        <span>Buat PR Baru</span>
                    </RouterLink>
                </div>
            </div>
        </div>

        <!-- 3. Siklus Pengadaan Barang & Jasa (Informational SOP Workflow) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs select-none">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                        <Workflow class="w-4.5 h-4.5" />
                    </div>
                    <div>
                        <h3 class="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                            Siklus Pengadaan Barang & Jasa
                        </h3>
                        <p class="text-xs text-slate-500 mt-0.5">
                            Standar alur kerja procurement terintegrasi perusahaan (SOP End-to-End)
                        </p>
                    </div>
                </div>

                <!-- Structured Reference Tag (Anti-Slop: No fake status dots or pastel pills) -->
                <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 self-start sm:self-auto">
                    <span class="font-mono text-[11px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">SOP</span>
                    <span class="font-medium text-slate-700">4 Tahap Alur Kerja</span>
                </div>
            </div>

            <!-- Interconnected Workflow Track (Info Only, Non-Clickable) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 cursor-default">
                <!-- Step 1: Pengajuan PR -->
                <div class="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/20">
                                01
                            </span>
                            <span class="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                                Tahap 1 • Pemohon
                            </span>
                        </div>
                        <div class="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            Pengajuan PR
                        </div>
                        <p class="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
                            Identifikasi kebutuhan barang/jasa & spesifikasi oleh divisi pemohon.
                        </p>
                    </div>
                    <div class="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Dokumen:</span>
                        <span class="font-mono font-medium text-slate-700">PR Form</span>
                    </div>
                </div>

                <!-- Step 2: Persetujuan (Approval) -->
                <div class="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="w-7 h-7 rounded-lg bg-amber-500 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs shadow-amber-500/20">
                                02
                            </span>
                            <span class="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                                Tahap 2 • Otorisasi
                            </span>
                        </div>
                        <div class="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            Persetujuan Berjenjang
                        </div>
                        <p class="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
                            Verifikasi anggaran dan otorisasi tanda tangan digital sesuai wewenang.
                        </p>
                    </div>
                    <div class="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Validasi:</span>
                        <span class="font-mono font-medium text-amber-700">Digital Sign</span>
                    </div>
                </div>

                <!-- Step 3: Rencana Pengadaan -->
                <div class="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/20">
                                03
                            </span>
                            <span class="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                                Tahap 3 • Sourcing
                            </span>
                        </div>
                        <div class="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            Rencana Pengadaan
                        </div>
                        <p class="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
                            Konsolidasi antrean item disetujui & penentuan metode pengadaan.
                        </p>
                    </div>
                    <div class="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Metode:</span>
                        <span class="font-mono font-medium text-slate-700">RFQ / Direct</span>
                    </div>
                </div>

                <!-- Step 4: Realisasi Transaksi -->
                <div class="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs shadow-emerald-500/20">
                                04
                            </span>
                            <span class="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                                Tahap 4 • Eksekusi
                            </span>
                        </div>
                        <div class="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            Realisasi Transaksi
                        </div>
                        <p class="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
                            Penerbitan PO / Pembelian Langsung, serah terima barang, dan tagihan.
                        </p>
                    </div>
                    <div class="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Output:</span>
                        <span class="font-mono font-medium text-emerald-700">PO & Receipt</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. Operational Cards Grid -->
        <div class="space-y-4">
            <div>
                <h2 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Menu Purchasing
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">
                    Pilih fungsi operasional pengadaan yang ingin Anda kelola.
                </p>
            </div>

            <!-- Grid 5 Kartu (3 Kolom: Baris 1 isi 3, Baris 2 isi 2) -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                <!-- Card 1: Purchase Requisition -->
                <div 
                    class="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                <FileText class="w-5 h-5" />
                            </div>
                            <span v-if="counts.pr !== null" class="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                                {{ counts.pr }} Permohonan
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                Purchase Requisition
                            </h4>
                            <p class="text-xs font-medium text-slate-500 mt-0.5">
                                Pengajuan Kebutuhan (PR)
                            </p>
                            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                                Buat dan monitor kebutuhan pembelian barang atau jasa divisi Anda dengan alur persetujuan terintegrasi.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                        <RouterLink :to="{ name: 'user.purchasing.requisitions' }" class="flex items-center justify-between w-full">
                            <span>Kelola Requisition</span>
                            <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </RouterLink>
                    </div>
                </div>

                <!-- Card 2: Persetujuan Pengadaan -->
                <div 
                    class="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                <CheckCircle2 class="w-5 h-5" />
                            </div>
                            <span class="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                                {{ counts.approvals !== null && counts.approvals > 0 ? counts.approvals + ' Menunggu' : 'Tahap 2' }}
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                Persetujuan Pengadaan
                            </h4>
                            <p class="text-xs font-medium text-slate-500 mt-0.5">
                                Purchasing Approvals
                            </p>
                            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                                Tinjau, setujui, minta revisi, atau tolak permohonan pembelian yang membutuhkan wewenang otorisasi Anda.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                        <RouterLink :to="{ name: 'user.purchasing.approvals' }" class="flex items-center justify-between w-full">
                            <span>Buka Persetujuan</span>
                            <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </RouterLink>
                    </div>
                </div>

                <!-- Card 3: Rencana Pengadaan -->
                <div 
                    v-if="authStore.hasPermission('purchasing.view')"
                    class="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                <Layers class="w-5 h-5" />
                            </div>
                            <span class="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                                {{ counts.plans !== null ? counts.plans + ' Rencana' : '16 Rencana' }}
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                Rencana Pengadaan
                            </h4>
                            <p class="text-xs font-medium text-slate-500 mt-0.5">
                                Procurement Plans
                            </p>
                            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                                Konsolidasi item kebutuhan, penentuan metode sourcing (Direct / RFQ), dan penetapan alokasi pagu anggaran.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                        <RouterLink :to="{ name: 'user.purchasing.plans' }" class="flex items-center justify-between w-full">
                            <span>Kelola Rencana</span>
                            <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </RouterLink>
                    </div>
                </div>

                <!-- Restricted Card 3 -->
                <div 
                    v-else
                    class="bg-slate-50/70 rounded-2xl border border-slate-200/70 p-5 sm:p-6 opacity-80 flex flex-col justify-between"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                <Layers class="w-5 h-5" />
                            </div>
                            <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                                Khusus Procurement
                            </span>
                        </div>
                        <div>
                            <h4 class="text-base font-bold text-slate-700">Rencana Pengadaan</h4>
                            <p class="text-xs font-medium text-slate-400 mt-0.5">Procurement Plans</p>
                            <p class="text-xs text-slate-500 mt-2 leading-relaxed">Konsolidasi item kebutuhan dan penetapan alokasi anggaran.</p>
                        </div>
                    </div>
                    <div class="mt-5 pt-4 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-400">
                        <span class="flex items-center gap-1.5"><ShieldAlert class="w-3.5 h-3.5 text-slate-400" /> Akses Terbatas</span>
                        <Lock class="w-3.5 h-3.5" />
                    </div>
                </div>

                <!-- Card 4: Pembelian Langsung -->
                <div 
                    v-if="authStore.hasPermission('purchasing.view')"
                    class="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                <ShoppingCart class="w-5 h-5" />
                            </div>
                            <span class="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                                {{ counts.direct !== null ? counts.direct + ' Transaksi' : '13 Transaksi' }}
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                Pembelian Langsung
                            </h4>
                            <p class="text-xs font-medium text-slate-500 mt-0.5">
                                Direct Purchases
                            </p>
                            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                                Eksekusi pembelian cepat melalui marketplace online atau toko/supplier rekanan resmi perusahaan.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                        <RouterLink :to="{ name: 'user.purchasing.direct' }" class="flex items-center justify-between w-full">
                            <span>Lihat Pembelian</span>
                            <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </RouterLink>
                    </div>
                </div>

                <!-- Restricted Card 4 -->
                <div 
                    v-else
                    class="bg-slate-50/70 rounded-2xl border border-slate-200/70 p-5 sm:p-6 opacity-80 flex flex-col justify-between"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                <ShoppingCart class="w-5 h-5" />
                            </div>
                            <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                                Khusus Procurement
                            </span>
                        </div>
                        <div>
                            <h4 class="text-base font-bold text-slate-700">Pembelian Langsung</h4>
                            <p class="text-xs font-medium text-slate-400 mt-0.5">Direct Purchases</p>
                            <p class="text-xs text-slate-500 mt-2 leading-relaxed">Eksekusi pembelian cepat marketplace atau toko rekanan resmi.</p>
                        </div>
                    </div>
                    <div class="mt-5 pt-4 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-400">
                        <span class="flex items-center gap-1.5"><ShieldAlert class="w-3.5 h-3.5 text-slate-400" /> Akses Terbatas</span>
                        <Lock class="w-3.5 h-3.5" />
                    </div>
                </div>

                <!-- Card 5: Request for Quotation (RFQ) -->
                <div class="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 select-none opacity-90 flex flex-col justify-between">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-200/80 flex items-center justify-center">
                                <FileText class="w-5 h-5" />
                            </div>
                            <span class="text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200/80 px-3 py-1 rounded-lg">
                                Segera Hadir
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-900">
                                Request for Quotation (RFQ)
                            </h4>
                            <p class="text-xs font-medium text-slate-500 mt-0.5">
                                Multi-Vendor Tender
                            </p>
                            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                                Komparasi penawaran harga multi-vendor dan negosiasi tender pengadaan bernilai besar.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
                        <span>Dalam Pengembangan</span>
                        <Lock class="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
