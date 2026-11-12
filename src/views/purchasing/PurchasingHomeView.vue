<script setup>
import { computed, ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getPurchaseRequisitions } from '../../services/purchaseRequisitionServices.js'
import { getProcurementPlans } from '../../services/procurementPlanServices.js'
import { getDirectPurchases } from '../../services/directPurchaseServices.js'
import { getRfqs } from '../../services/rfqServices.js'
import { getPurchaseOrders } from '../../services/purchaseOrderServices.js'
import { getPendingApprovalCount } from '../../services/approvalServices.js'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import {
    Plus,
    ArrowUpRight,
    FileText,
    CheckCircle2,
    Layers,
    ShoppingCart,
    Scale,
    Lock,
    BookOpen,
    ChevronDown,
    ShoppingBag,
} from '@lucide/vue'

const authStore = useAuthStore()

// Presentation groups retain the existing route names and access conditions.
const menuGroups = computed(() => {
    const procurement = authStore.hasPermission('purchasing.view')
    const sourcing = procurement || authStore.hasPermission('rfq.read')
    return [
        { title: 'Kebutuhan & perencanaan', description: 'Ajukan kebutuhan, tinjau persetujuan, dan siapkan pengadaan.', items: [
            { key: 'pr', title: 'Purchase Requisition', label: 'Pengajuan kebutuhan', description: 'Buat dan pantau permintaan barang atau jasa.', route: 'user.purchasing.requisitions', icon: FileText, allowed: true, unit: 'permohonan', tone: 'blue' },
            { key: 'approvals', title: 'Persetujuan Pengadaan', label: 'Review & persetujuan', description: 'Tinjau pengajuan yang memerlukan keputusan Anda.', route: 'user.purchasing.approvals', icon: CheckCircle2, allowed: true, unit: 'menunggu', tone: 'amber' },
            { key: 'plans', title: 'Rencana Pengadaan', label: 'Perencanaan', description: 'Konsolidasikan kebutuhan dan tentukan metode pembelian.', route: 'user.purchasing.plans', icon: Layers, allowed: procurement, unit: 'rencana', tone: 'teal' },
        ] },
        { title: 'Sourcing & pemesanan', description: 'Kelola pembelian langsung, penawaran supplier, dan pesanan.', items: [
            { key: 'direct', title: 'Pembelian Langsung', label: 'Direct purchase', description: 'Kelola transaksi melalui toko, marketplace, atau supplier.', route: 'user.purchasing.direct', icon: ShoppingCart, allowed: procurement, unit: 'transaksi', tone: 'teal' },
            { key: 'rfq', title: 'Tender RFQ', label: 'Request for quotation', description: 'Undang supplier, bandingkan penawaran, dan pilih pemenang.', route: 'user.purchasing.rfq', icon: Scale, allowed: sourcing, unit: 'tender', tone: 'violet' },
            { key: 'po', title: 'Pesanan Pembelian', label: 'Purchase order', description: 'Kelola pesanan resmi dan tindak lanjut pengiriman supplier.', route: 'user.purchasing.orders', icon: FileText, allowed: sourcing, unit: 'dokumen PO', tone: 'blue' },
        ] },
    ]
})

const guideSteps = [
    { title: 'Ajukan kebutuhan', description: 'Catat barang atau jasa, jumlah, dan spesifikasi melalui PR.' },
    { title: 'Tinjau pengajuan', description: 'Proses persetujuan sesuai konfigurasi dan kewenangan perusahaan.' },
    { title: 'Tentukan pengadaan', description: 'Susun rencana dan pilih metode RFQ atau pembelian langsung.' },
    { title: 'Tindak lanjuti transaksi', description: 'Kelola pesanan atau pembelian, lalu penerimaan dan tagihan pada modul terkait.' },
]

// Operational summary counts for live tactile feedback
const counts = ref({
    pr: null,
    approvals: null,
    plans: null,
    direct: null,
    rfq: null,
    po: null
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

    try {
        const rfqRes = await getRfqs('', 1, {})
        counts.value.rfq = rfqRes?.meta?.total ?? rfqRes?.data?.total ?? null
    } catch (_) {}

    try {
        const poRes = await getPurchaseOrders('', 1, {})
        counts.value.po = poRes?.meta?.total ?? poRes?.data?.total ?? null
    } catch (_) {}
}

onMounted(() => {
    fetchSummaryCounts()
})
</script>

<template>
    <section class="purchasing-home space-y-8 pb-4">
        <BaseBreadcrumb :items="[{ label: 'Pengadaan (Purchasing)' }]" />

        <div class="purchasing-welcome flex flex-col justify-between gap-6 rounded-2xl px-6 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-center">
            <div>
                <p class="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-800">
                    <ShoppingBag class="size-4" aria-hidden="true" /> Purchasing
                </p>
                <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Pengadaan & Pembelian</h1>
                <p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Dari kebutuhan tim hingga pesanan ke supplier. Pilih pekerjaan yang ingin Anda lanjutkan.</p>
            </div>
            <RouterLink
                :to="{ name: 'user.purchasing.requisitions.create' }"
                class="create-pr inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#014BAA] px-5 py-3 text-sm font-medium text-white hover:bg-[#013C89] lg:self-center"
            >
                <Plus class="size-4" aria-hidden="true" /> Buat PR baru
            </RouterLink>
        </div>

        <section v-for="group in menuGroups" :key="group.title" class="space-y-4" :aria-label="group.title">
            <div>
                <h2 class="text-lg font-semibold tracking-tight text-slate-900">{{ group.title }}</h2>
                <p class="mt-1 text-sm text-slate-500">{{ group.description }}</p>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <component
                    v-for="item in group.items"
                    :is="item.allowed ? RouterLink : 'div'"
                    :key="item.key"
                    :to="item.allowed ? { name: item.route } : undefined"
                    :aria-disabled="!item.allowed ? true : undefined"
                    :data-menu="item.key"
                    :data-tone="item.tone"
                    class="purchasing-card group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6"
                >
                    <div class="flex items-center justify-between gap-3">
                        <span class="card-icon flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <component :is="item.icon" class="size-5" aria-hidden="true" />
                        </span>
                        <Lock v-if="!item.allowed" class="size-4 text-slate-400" aria-hidden="true" />
                        <span
                            v-else-if="counts[item.key] !== null"
                            class="text-xs font-medium text-slate-500"
                            :class="{ 'pending-count rounded-full bg-amber-50 px-2.5 py-1 text-amber-900': item.key === 'approvals' && counts.approvals > 0 }"
                        >
                            {{ counts[item.key] }} {{ item.unit }}
                        </span>
                        <span v-else class="text-xs text-slate-400">Jumlah belum tersedia</span>
                    </div>
                    <div class="mt-5 flex-1">
                        <p class="mb-1 text-xs text-slate-500">{{ item.label }}</p>
                        <h3 class="text-base font-semibold tracking-tight text-slate-900">{{ item.title }}</h3>
                        <p class="mt-2 text-sm leading-relaxed text-slate-500">{{ item.description }}</p>
                    </div>
                    <div class="mt-5 flex items-center justify-between gap-3 text-sm">
                        <span :class="item.allowed ? 'font-medium text-slate-700' : 'text-slate-500'">{{ item.allowed ? 'Buka ' + item.title : 'Akses khusus procurement' }}</span>
                        <ArrowUpRight v-if="item.allowed" class="card-arrow size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </div>
                </component>
            </div>
        </section>

        <details class="procurement-guide rounded-xl border border-slate-200/80 bg-white">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-4 text-sm text-slate-600">
                <span class="inline-flex items-center gap-2.5">
                    <BookOpen class="size-4 text-slate-500" aria-hidden="true" />
                    Panduan singkat alur pengadaan
                </span>
                <ChevronDown class="guide-chevron size-4 shrink-0 text-slate-400" aria-hidden="true" />
            </summary>
            <div class="border-t border-slate-100 px-5 py-5">
                <p class="mb-5 text-sm text-slate-500">Gambaran umum untuk membantu Anda memilih menu. Tahapan mengikuti jenis transaksi dan kebijakan perusahaan.</p>
                <ol class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <li v-for="(step, index) in guideSteps" :key="step.title" class="flex gap-3">
                        <span class="mt-0.5 text-xs font-medium tabular-nums text-blue-700">0{{ index + 1 }}</span>
                        <div>
                            <h3 class="text-sm font-medium text-slate-800">{{ step.title }}</h3>
                            <p class="mt-1 text-sm leading-relaxed text-slate-500">{{ step.description }}</p>
                        </div>
                    </li>
                </ol>
            </div>
        </details>
    </section>
</template>

<style scoped>
.purchasing-welcome {
    border: 1px solid #e0e9f5;
    background: linear-gradient(115deg, #edf4ff, #f5f8ff 65%, #f0f6f7);
}
.purchasing-card {
    --card-accent: #014baa;
    --card-soft: #edf4ff;
    transition: border-color 160ms, box-shadow 160ms, transform 160ms;
}
.purchasing-card[data-tone='teal'] { --card-accent: #08756e; --card-soft: #eaf7f4; }
.purchasing-card[data-tone='violet'] { --card-accent: #6953a6; --card-soft: #f3effb; }
.purchasing-card[data-tone='amber'] { --card-accent: #946016; --card-soft: #fff6e8; }
.card-icon { color: var(--card-accent); background: var(--card-soft); }
.card-arrow { transition: color 160ms, transform 160ms; }
.purchasing-card:not([aria-disabled='true']):hover {
    border-color: var(--card-accent);
    box-shadow: 0 8px 24px rgb(15 23 42 / 5%);
    transform: translateY(-2px);
}
.purchasing-card:not([aria-disabled='true']):hover .card-arrow { color: var(--card-accent); transform: translate(2px, -2px); }
.purchasing-card[aria-disabled='true'] { background: #f8fafc; }
.purchasing-card[aria-disabled='true'] .card-icon { color: #64748b; background: #eef2f6; }
.purchasing-card:focus-visible, .create-pr:focus-visible, summary:focus-visible { outline: 2px solid #014baa; outline-offset: 4px; }
summary::-webkit-details-marker { display: none; }
.procurement-guide[open] .guide-chevron { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) {
    .purchasing-card, .card-arrow { transition: none; }
    .purchasing-card:not([aria-disabled='true']):hover, .purchasing-card:not([aria-disabled='true']):hover .card-arrow { transform: none; }
}
</style>
