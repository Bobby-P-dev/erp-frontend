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
    if (hour >= 4 && hour < 11) return 'SELAMAT PAGI'
    if (hour >= 11 && hour < 15) return 'SELAMAT SIANG'
    if (hour >= 15 && hour < 18) return 'SELAMAT SORE'
    return 'SELAMAT MALAM'
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
    <section class="w-full space-y-8 py-2">
        <!-- 1. Header Greeting & Localized Date Lockup -->
        <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <div class="text-xs font-bold text-slate-500 tracking-wider uppercase">
                        {{ timeGreeting }}
                    </div>
                    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mt-1">
                        {{ formattedUserName }}
                    </h1>
                    <p class="text-xs sm:text-sm text-slate-500 mt-1">
                        Pilih modul ERP untuk melanjutkan pekerjaan Anda.
                    </p>
                </div>

                <!-- Right Aligned Live Calendar Date -->
                <div class="text-xs sm:text-sm font-medium text-slate-500 sm:text-right pt-1 select-none">
                    {{ currentDateFormatted }}
                </div>
            </div>

            <!-- 2. Horizontal Metadata Pills Bar (Rounded-Full Minimalist Chips) -->
            <div class="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
                <!-- Entitas Perusahaan -->
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 shadow-2xs hover:border-slate-300 transition-colors">
                    <Building2 class="size-3.5 text-blue-600 shrink-0" />
                    <span class="font-medium text-slate-800">{{ companyName }}</span>
                </div>

                <!-- Divisi Kerja -->
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 shadow-2xs hover:border-slate-300 transition-colors">
                    <Layers class="size-3.5 text-blue-600 shrink-0" />
                    <span class="font-medium text-slate-800">{{ divisionName }}</span>
                </div>

                <!-- Jabatan & Level -->
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 shadow-2xs hover:border-slate-300 transition-colors">
                    <Briefcase class="size-3.5 text-blue-600 shrink-0" />
                    <span class="font-medium text-slate-800">{{ positionName }}</span>
                    <span v-if="jobLevel" class="text-slate-400 font-normal">({{ jobLevel }})</span>
                </div>

                <!-- NIK (Metadata Karyawan) -->
                <div v-if="nik" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 font-mono shadow-2xs hover:border-slate-300 transition-colors">
                    <IdCard class="size-3.5 text-blue-600 shrink-0" />
                    <span>NIK: <strong class="font-semibold text-slate-900">{{ nik }}</strong></span>
                </div>
            </div>
        </div>

        <!-- 3. Minimalist Launcher Grid (Purchasing, Finance, Warehouse) -->
        <div class="pt-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
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
                />
            </div>
        </div>
    </section>
</template>