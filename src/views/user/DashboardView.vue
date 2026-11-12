<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useApprovalStore } from '../../stores/approvalStore'
import { getActiveModules } from '../../config/modules'
import {
    Building2,
    Layers,
    Briefcase,
    IdCard,
    ArrowUpRight,
    CalendarDays,
    LayoutGrid,
} from '@lucide/vue'

const authStore = useAuthStore()
const approvalStore = useApprovalStore()

// Dynamic greeting based on current local time
const timeGreeting = computed(() => {
    const hour = new Date().getHours()
    if (hour >= 4 && hour < 11) return 'Selamat pagi'
    if (hour >= 11 && hour < 15) return 'Selamat siang'
    if (hour >= 15 && hour < 18) return 'Selamat sore'
    return 'Selamat malam'
})

// Current date formatted in Indonesian locale (e.g. "Kamis, 15 Oktober 2026")
const currentDateFormatted = computed(() => {
    const now = new Date()
    return now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
})

// Helper to convert shouting ALL-CAPS strings from database to elegant Title Case
function toTitleCase(str) {
    if (!str || typeof str !== 'string') return ''
    return str
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/\b(Dan|Di|Ke|Dari|Pada|Untuk|Atau|Sop|Nik|Erp|Pt)\b/g, match => {
            const lower = match.toLowerCase()
            if (['dan', 'di', 'ke', 'dari', 'pada', 'untuk', 'atau'].includes(lower)) return lower
            if (['sop', 'nik', 'erp', 'pt'].includes(lower)) return lower.toUpperCase()
            return match
        })
}

// User display name & formatting
const rawUserName = computed(() => {
    return authStore.profile?.name || authStore.user?.name || 'Karyawan'
})

const formattedUserName = computed(() => {
    const raw = rawUserName.value
    if (raw && raw === raw.toUpperCase() && raw.length > 2) {
        return toTitleCase(raw)
    }
    return raw
})

// Primary display role
const primaryRole = computed(() => {
    const roles = authStore.user?.roles || []
    if (roles.length > 0) {
        const first = roles[0]
        return typeof first === 'string' ? first : (first?.name || 'Karyawan')
    }
    return authStore.profile?.position?.name || 'Karyawan'
})

// Organization & employee metadata (with graceful Title Case formatting)
const companyName = computed(() => {
    const raw = authStore.profile?.company?.name || 'Padma Soode Indonesia'
    if (raw && raw === raw.toUpperCase()) return toTitleCase(raw)
    return raw.replace(/^PT\s+/i, '')
})

const divisionName = computed(() => {
    const raw = authStore.profile?.division?.name || 'Sistem & Audit'
    if (raw && raw === raw.toUpperCase()) return toTitleCase(raw)
    return raw
})

const positionName = computed(() => {
    const raw = authStore.profile?.position?.name || primaryRole.value || 'Software Developer'
    if (raw && raw === raw.toUpperCase()) return toTitleCase(raw)
    return raw
})

const jobLevel = computed(() => {
    const raw = authStore.profile?.job_level?.name || ''
    if (raw && raw === raw.toUpperCase()) return toTitleCase(raw)
    return raw
})

const nik = computed(() => {
    return authStore.profile?.nik || authStore.user?.nik || ''
})

// Filter active modules by permissions and inject live approval count if applicable
const activeModules = computed(() => {
    const modules = getActiveModules(authStore)
    return modules.map(mod => {
        if (mod.id === 'purchasing' && approvalStore.pendingCount > 0) {
            return {
                ...mod,
                badge: `${approvalStore.formattedBadge} Menunggu`,
                badgeVariant: 'amber'
            }
        }
        return mod
    })
})

// Presentation only; routes, permissions and approval badges stay in the registry/store.
const modulePresentation = {
    purchasing: { label: 'Pengadaan', description: 'Dari kebutuhan pembelian hingga pesanan ke supplier.', tone: 'blue' },
    finance: { label: 'Keuangan', description: 'Verifikasi tagihan dan kelola proses pembayaran.', tone: 'teal' },
    inventory: { label: 'Persediaan', description: 'Pantau penerimaan dan pemeriksaan barang masuk.', tone: 'violet' },
}
</script>

<template>
    <section class="dashboard-home w-full space-y-9 py-2 sm:py-4" aria-label="Beranda ERP">
        <!-- 1. Compact Welcome Section & Inline Metadata -->
        <div class="welcome-panel relative overflow-hidden rounded-2xl px-6 py-7 sm:px-9 sm:py-9">
            <div class="relative mb-6 flex flex-wrap items-center justify-between gap-3">
                <span class="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-blue-800 uppercase">
                    <LayoutGrid class="size-3.5" aria-hidden="true" /> Ruang kerja Anda
                </span>
                <span class="inline-flex items-center gap-2 text-xs text-slate-600">
                    <CalendarDays class="size-3.5" aria-hidden="true" /> {{ currentDateFormatted }}
                </span>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div class="space-y-1">
                    <h1 class="relative text-2xl sm:text-[32px] font-semibold text-slate-900 tracking-tight leading-tight">
                        {{ timeGreeting }}, {{ formattedUserName }}
                    </h1>
                    <p class="text-[14px] sm:text-[15px] text-[#667085] leading-normal">
                        Semua kebutuhan operasional, dalam satu ruang kerja.
                    </p>
                </div>

            </div>

            <!-- Inline Metadata Chips -->
            <div class="relative flex flex-wrap items-center gap-x-5 gap-y-3 mt-6 text-[13px]">
                <!-- Entitas Perusahaan -->
                <div class="inline-flex items-center gap-2 text-slate-700">
                    <Building2 class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium">{{ companyName }}</span>
                </div>

                <!-- Divisi Kerja -->
                <div class="inline-flex items-center gap-2 text-slate-700">
                    <Layers class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium">{{ divisionName }}</span>
                </div>

                <!-- Jabatan & Level -->
                <div class="inline-flex items-center gap-2 text-slate-700">
                    <Briefcase class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium">{{ positionName }}</span>
                    <span v-if="jobLevel" class="text-[#667085] font-normal">({{ jobLevel }})</span>
                </div>

                <!-- NIK (Metadata Sekunder) -->
                <div v-if="nik" class="inline-flex items-center gap-1.5 text-slate-500">
                    <IdCard class="size-3.5 text-[#667085] shrink-0" />
                    <span>NIK: <strong class="font-medium text-[#111827] font-mono">{{ nik }}</strong></span>
                </div>
            </div>
        </div>

        <!-- 2. ERP Modules Launcher Section -->
        <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                    <h2 class="text-[18px] sm:text-[19px] font-semibold text-[#111827] tracking-tight leading-snug">
                        Mulai bekerja
                    </h2>
                    <p class="text-[14px] text-[#667085] mt-0.5">
                        Pilih area kerja yang ingin Anda buka.
                    </p>
                </div>

                <div v-if="activeModules.length > 0" class="text-xs text-slate-500 select-none">
                    {{ activeModules.length }} modul tersedia
                </div>
            </div>

            <!-- Responsive Grid: 1 col mobile (<768px), 2 cols tablet (768-1199px), 3 cols desktop (>=1200px) -->
            <div
                v-if="activeModules.length > 0"
                class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch"
            >
                <component
                    v-for="moduleItem in activeModules"
                    :is="moduleItem.status === 'active' && moduleItem.routeName ? RouterLink : 'div'"
                    :key="moduleItem.id"
                    :to="moduleItem.status === 'active' && moduleItem.routeName ? { name: moduleItem.routeName } : undefined"
                    :aria-disabled="moduleItem.status !== 'active' || !moduleItem.routeName ? true : undefined"
                    class="module-tile group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7"
                    :data-tone="modulePresentation[moduleItem.id]?.tone || 'blue'"
                >
                    <div class="flex items-start justify-between gap-3">
                        <span class="module-icon flex size-12 items-center justify-center rounded-xl">
                            <component :is="moduleItem.icon" class="size-6" aria-hidden="true" />
                        </span>
                        <span v-if="moduleItem.badge" class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">{{ moduleItem.badge }}</span>
                        <ArrowUpRight v-else class="tile-arrow size-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <div class="mt-6 flex-1">
                        <p class="module-label mb-1.5 text-[11px] font-semibold uppercase tracking-widest">{{ modulePresentation[moduleItem.id]?.label || moduleItem.subtitle }}</p>
                        <h3 class="text-lg font-semibold tracking-tight text-slate-900">{{ moduleItem.title }}</h3>
                        <p class="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{{ modulePresentation[moduleItem.id]?.description || moduleItem.description }}</p>
                    </div>
                    <div class="mt-7 flex items-center justify-between text-sm">
                        <span class="font-medium text-slate-700">{{ moduleItem.status === 'active' && moduleItem.routeName ? 'Buka modul' : 'Belum tersedia' }}</span>
                    </div>
                </component>
            </div>

            <!-- Neutral Empty State if no modules match user permissions -->
            <div
                v-else
                class="bg-white border border-[#E5EAF1] rounded-[14px] p-8 text-center"
            >
                <p class="text-[15px] font-medium text-[#111827]">
                    Belum ada modul yang tersedia untuk akun Anda
                </p>
                <p class="text-[13px] text-[#667085] mt-1">
                    Silakan hubungi administrator sistem apabila Anda memerlukan akses ke modul operasional.
                </p>
            </div>
        </div>
    </section>
</template>

<style scoped>
.welcome-panel {
    background: linear-gradient(115deg, #edf4ff 0%, #f5f8ff 55%, #f0f6f7 100%);
    border: 1px solid #e0e9f5;
}
.welcome-panel::before {
    content: '';
    position: absolute;
    width: 330px;
    height: 330px;
    border: 1px solid rgb(1 75 170 / 7%);
    border-radius: 50%;
    right: -65px;
    top: -170px;
    box-shadow: 0 0 0 48px rgb(1 75 170 / 2.5%), 0 0 0 96px rgb(1 75 170 / 2%);
    pointer-events: none;
}
.module-tile { --tile-accent: #014baa; --tile-soft: #edf4ff; transition: border-color 160ms, box-shadow 160ms, transform 160ms; }
.module-tile[data-tone='teal'] { --tile-accent: #08756e; --tile-soft: #eaf7f4; }
.module-tile[data-tone='violet'] { --tile-accent: #6953a6; --tile-soft: #f3effb; }
.module-icon { color: var(--tile-accent); background: var(--tile-soft); }
.module-label { color: var(--tile-accent); }
.tile-arrow { transition: color 160ms, transform 160ms; }
.module-tile:not([aria-disabled='true']):hover {
    border-color: var(--tile-accent);
    box-shadow: 0 8px 24px rgb(15 23 42 / 5%);
    transform: translateY(-3px);
}
.module-tile:not([aria-disabled='true']):hover .tile-arrow { color: var(--tile-accent); transform: translate(2px, -2px); }
.module-tile:focus-visible { outline: 2px solid var(--tile-accent); outline-offset: 4px; }
@media (prefers-reduced-motion: reduce) {
    .module-tile, .tile-arrow { transition: none; }
    .module-tile:not([aria-disabled='true']):hover, .module-tile:not([aria-disabled='true']):hover .tile-arrow { transform: none; }
}
</style>
