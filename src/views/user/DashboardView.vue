<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useApprovalStore } from '../../stores/approvalStore'
import { getActiveModules } from '../../config/modules'
import ModuleCard from '../../components/ui/ModuleCard.vue'
import {
    Building2,
    Layers,
    Briefcase,
    IdCard,
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
</script>

<template>
    <section class="w-full space-y-8 py-1">
        <!-- 1. Compact Welcome Section & Inline Metadata -->
        <div class="bg-white border border-[#E5EAF1] rounded-[14px] p-6 sm:p-7">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div class="space-y-1">
                    <h1 class="text-[22px] sm:text-[26px] font-semibold text-[#111827] tracking-tight leading-[1.25]">
                        {{ timeGreeting }}, {{ formattedUserName }}
                    </h1>
                    <p class="text-[14px] sm:text-[15px] text-[#667085] leading-normal">
                        Akses modul ERP sesuai tugas dan wewenang Anda.
                    </p>
                </div>

                <!-- Secondary Calendar Date -->
                <div class="text-[13px] font-medium text-[#667085] sm:text-right shrink-0 select-none">
                    {{ currentDateFormatted }}
                </div>
            </div>

            <!-- Inline Metadata Chips -->
            <div class="flex flex-wrap items-center gap-2 pt-5 mt-5 border-t border-[#E5EAF1]/80 text-[13px]">
                <!-- Entitas Perusahaan -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#F7F9FC] border border-[#E5EAF1] text-[#111827]">
                    <Building2 class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium">{{ companyName }}</span>
                </div>

                <!-- Divisi Kerja -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#F7F9FC] border border-[#E5EAF1] text-[#111827]">
                    <Layers class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium">{{ divisionName }}</span>
                </div>

                <!-- Jabatan & Level -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#F7F9FC] border border-[#E5EAF1] text-[#111827]">
                    <Briefcase class="size-3.5 text-[#014BAA] shrink-0" />
                    <span class="font-medium">{{ positionName }}</span>
                    <span v-if="jobLevel" class="text-[#667085] font-normal">({{ jobLevel }})</span>
                </div>

                <!-- NIK (Metadata Sekunder) -->
                <div v-if="nik" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#F7F9FC] border border-[#E5EAF1] text-[#667085]">
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
                        Modul ERP
                    </h2>
                    <p class="text-[14px] text-[#667085] mt-0.5">
                        Pilih modul untuk mulai bekerja.
                    </p>
                </div>

                <div v-if="activeModules.length > 0" class="text-[13px] font-medium text-[#667085] select-none">
                    {{ activeModules.length }} modul tersedia
                </div>
            </div>

            <!-- Responsive Grid: 1 col mobile (<768px), 2 cols tablet (768-1199px), 3 cols desktop (>=1200px) -->
            <div
                v-if="activeModules.length > 0"
                class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch"
            >
                <ModuleCard
                    v-for="moduleItem in activeModules"
                    :key="moduleItem.id"
                    :title="moduleItem.title"
                    :subtitle="moduleItem.subtitle"
                    :description="moduleItem.description"
                    :icon="moduleItem.icon"
                    :to="moduleItem.routeName ? { name: moduleItem.routeName } : null"
                    :color="moduleItem.color || 'blue'"
                    :badge="moduleItem.badge"
                    :badge-variant="moduleItem.badgeVariant || 'default'"
                    :status="moduleItem.status"
                    action-text="Buka Modul"
                />
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