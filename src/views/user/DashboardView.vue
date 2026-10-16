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
    if (hour >= 4 && hour < 11) return 'Selamat Pagi'
    if (hour >= 11 && hour < 15) return 'Selamat Siang'
    if (hour >= 15 && hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
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

// User initial monogram for profile lockup
const userInitials = computed(() => {
    const raw = formattedUserName.value || 'K'
    const parts = raw.trim().split(/\s+/)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return raw.slice(0, 2).toUpperCase()
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
    const raw = authStore.profile?.company?.name || 'PT Padma Soode Indonesia'
    if (raw && raw === raw.toUpperCase()) return toTitleCase(raw)
    return raw
})

const divisionName = computed(() => {
    const raw = authStore.profile?.division?.name || '-'
    if (raw && raw === raw.toUpperCase()) return toTitleCase(raw)
    return raw
})

const positionName = computed(() => {
    const raw = authStore.profile?.position?.name || primaryRole.value
    if (raw && raw === raw.toUpperCase()) return toTitleCase(raw)
    return raw
})

const jobLevel = computed(() => {
    const raw = authStore.profile?.job_level?.name || ''
    if (raw && raw === raw.toUpperCase()) return toTitleCase(raw)
    return raw
})

const nik = computed(() => {
    return authStore.profile?.nik || ''
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
    <section class="w-full space-y-8">
        <!-- 1. Streamlined Welcome & Identity Lockup -->
        <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3.5 sm:gap-4">
                    <!-- Refined Initial Monogram Lockup -->
                    <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white font-bold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/20 select-none tracking-wider">
                        {{ userInitials }}
                    </div>
                    <div>
                        <div class="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                            {{ timeGreeting }}
                        </div>
                        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                            {{ formattedUserName }}
                        </h1>
                    </div>
                </div>

                <!-- Workplace Context Subline -->
                <p class="text-xs sm:text-sm text-slate-500 max-w-sm sm:text-right">
                    Akses modul ERP terintegrasi sesuai kewenangan tugas Anda.
                </p>
            </div>

            <!-- Inline Metadata Chips (Company, Division, Position, NIK) -->
            <div class="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <!-- Entitas Perusahaan -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-2xs">
                    <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span class="font-medium text-slate-900">{{ companyName }}</span>
                </div>

                <!-- Divisi Kerja -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-2xs">
                    <Layers class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span class="text-slate-500 font-normal">Divisi:</span>
                    <span class="font-medium text-slate-900">{{ divisionName }}</span>
                </div>

                <!-- Jabatan & Level -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-2xs">
                    <Briefcase class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span class="font-medium text-slate-900">{{ positionName }}</span>
                    <span v-if="jobLevel" class="text-slate-400 font-normal">({{ jobLevel }})</span>
                </div>

                <!-- NIK (Metadata Sekunder) -->
                <div v-if="nik" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600 font-mono text-xs">
                    <IdCard class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>NIK: <strong class="font-medium text-slate-800">{{ nik }}</strong></span>
                </div>
            </div>
        </div>

        <!-- 2. ERP Modules Section (Primary Focus of Dashboard) -->
        <div class="space-y-5 pt-2">
            <!-- Section Header & Architectural Counter (No Floating AI Pill Badge) -->
            <div class="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div class="flex items-center gap-2.5">
                    <h2 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Modul ERP
                    </h2>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold font-mono bg-slate-100 text-slate-700 border border-slate-200/70">
                        {{ activeModules.length }} Modul
                    </span>
                </div>
                <p class="text-xs text-slate-500 hidden sm:block">
                    Pilih modul untuk mulai bekerja
                </p>
            </div>

            <!-- Responsive 3-Column Launcher Grid (Equal Height Stretching) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
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
                    actionText="Buka Modul"
                />
            </div>
        </div>
    </section>
</template>