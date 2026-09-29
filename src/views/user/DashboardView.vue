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
    ShieldCheck,
    Calendar,
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

// Localized date formatting (Indonesian)
const formattedToday = computed(() => {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date())
})

// User monogram initials (e.g., "BP" for Bobby Pratama)
const userInitials = computed(() => {
    const name = authStore.profile?.name || authStore.user?.name || 'User'
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() || '')
        .join('')
})

// Primary display role
const primaryRole = computed(() => {
    const roles = authStore.user?.roles || []
    if (roles.length > 0) {
        const first = roles[0]
        return typeof first === 'string' ? first : (first?.name || 'User')
    }
    return authStore.profile?.position?.name || 'Karyawan'
})

// Filter active modules by permissions using existing authStore
const activeModules = computed(() => {
    const modules = getActiveModules(authStore)
    return modules.map(mod => {
        if (mod.id === 'approvals' && approvalStore.pendingCount > 0) {
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
    <section class="space-y-8">
        <!-- 1. Executive Identity & Command Banner -->
        <div class="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <!-- Subtle Background Gradients & Grid (Ultra Lightweight CSS) -->
            <div 
                class="absolute inset-0 pointer-events-none opacity-40 z-0"
                style="
                    background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
                    background-size: 24px 24px;
                    mask-image: radial-gradient(ellipse 90% 80% at 90% 10%, #000 30%, transparent 85%);
                    -webkit-mask-image: radial-gradient(ellipse 90% 80% at 90% 10%, #000 30%, transparent 85%);
                "
            ></div>
            <div class="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none z-0"></div>
            <div class="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none z-0"></div>

            <div class="relative z-10 p-6 sm:p-7">
                <!-- Top Row: Avatar Monogram, Greeting, Badges, & Context Widget -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                    <!-- Left: Profile Hero & Greeter -->
                    <div class="flex items-start sm:items-center gap-4 sm:gap-5">
                        <!-- Tactile Monogram Avatar with Status Dot -->
                        <div class="relative shrink-0">
                            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white font-bold text-lg sm:text-xl flex items-center justify-center shadow-lg shadow-blue-600/25 ring-4 ring-blue-50 tracking-wider">
                                {{ userInitials }}
                            </div>
                            <!-- Online / Active Status Dot -->
                            <span 
                                class="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center"
                                title="Status Sesi: Aktif"
                            >
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white"></span>
                            </span>
                        </div>

                        <!-- Identity Details -->
                        <div>
                            <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                <span class="text-sm font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                                    Padma Soode User Portal
                                </span>
                            </div>

                            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                                {{ timeGreeting }}, 
                                <span class="text-blue-600">{{ authStore.profile?.name || authStore.user?.name || 'Karyawan' }}</span>
                            </h1>

                            <!-- Metadata Badges Cluster -->
                            <div class="flex flex-wrap items-center gap-2.5 mt-3">
                                <!-- NIK Pill -->
                                <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                                    <IdCard class="w-4 h-4 text-slate-500" />
                                    <span>NIK: <strong class="font-bold text-slate-900">{{ authStore.profile?.nik || '-' }}</strong></span>
                                </span>

                                <!-- Role Pill -->
                                <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                                    <ShieldCheck class="w-4 h-4 text-blue-600" />
                                    <span>{{ primaryRole }}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Quick Operational Context & Date -->
                    <div class="flex items-center shrink-0">
                        <!-- Date & Calendar Indicator -->
                        <div class="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm font-semibold text-slate-700">
                            <Calendar class="w-4.5 h-4.5 text-blue-600" />
                            <span>{{ formattedToday }}</span>
                        </div>
                    </div>
                </div>

                <!-- Bottom Row: Tactile Bento Information Hub (Company, Division, Position) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                    <!-- 1. Perusahaan (Company) -->
                    <div class="group relative flex items-start gap-4 p-4.5 rounded-xl bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200/70 hover:border-blue-200 transition-all duration-200">
                        <div class="p-3 rounded-xl bg-blue-100/70 text-blue-700 border border-blue-200/60 shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                            <Building2 class="w-5 h-5" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Entitas Perusahaan
                            </p>
                            <h3 class="mt-1 text-base font-bold text-slate-900 truncate" :title="authStore.profile?.company?.name">
                                {{ authStore.profile?.company?.name || 'Padma Soode Indonesia' }}
                            </h3>
                            <p class="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                                Unit Utama & Manufaktur
                            </p>
                        </div>
                    </div>

                    <!-- 2. Divisi Kerja (Division) -->
                    <div class="group relative flex items-start gap-4 p-4.5 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 hover:border-indigo-200 transition-all duration-200">
                        <div class="p-3 rounded-xl bg-indigo-100/70 text-indigo-700 border border-indigo-200/60 shrink-0 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                            <Layers class="w-5 h-5" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Divisi & Unit Kerja
                            </p>
                            <h3 class="mt-1 text-base font-bold text-slate-900 truncate" :title="authStore.profile?.division?.name">
                                {{ authStore.profile?.division?.name || '-' }}
                            </h3>
                            <p class="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Struktur Operasional Internal
                            </p>
                        </div>
                    </div>

                    <!-- 3. Posisi & Jabatan (Position) -->
                    <div class="group relative flex items-start gap-4 p-4.5 rounded-xl bg-slate-50/70 hover:bg-emerald-50/40 border border-slate-200/70 hover:border-emerald-200 transition-all duration-200">
                        <div class="p-3 rounded-xl bg-emerald-100/70 text-emerald-700 border border-emerald-200/60 shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                            <Briefcase class="w-5 h-5" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Jabatan & Wewenang
                            </p>
                            <h3 class="mt-1 text-base font-bold text-slate-900 truncate" :title="authStore.profile?.position?.name">
                                {{ authStore.profile?.position?.name || '-' }}
                            </h3>
                            <p class="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                {{ authStore.profile?.job_level?.name ? 'Level: ' + authStore.profile.job_level.name : 'Authorized Staff' }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. ERP Modules Section (Modular Launcher) -->
        <div class="mt-10">
            <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
                        ERP Modules
                    </h2>
                    <p class="text-base text-slate-600 mt-1">
                        Pilih modul operasional untuk memulai aktivitas pekerjaan Anda.
                    </p>
                </div>

                <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {{ activeModules.length }} Modul Tersedia
                </span>
            </div>

            <!-- Responsive Grid: 1 col mobile, 2 col tablet, 3 col desktop (equal height stretching) -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                <ModuleCard
                    v-for="moduleItem in activeModules"
                    :key="moduleItem.id"
                    :title="moduleItem.title"
                    :subtitle="moduleItem.subtitle"
                    :description="moduleItem.description"
                    :icon="moduleItem.icon"
                    :to="moduleItem.routeName ? { name: moduleItem.routeName } : null"
                    :color="moduleItem.color"
                    :badge="moduleItem.badge"
                    :badge-variant="moduleItem.badgeVariant || 'default'"
                    :status="moduleItem.status"
                    actionText="Buka Modul"
                />
            </div>
        </div>
    </section>
</template>