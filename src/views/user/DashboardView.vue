<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useApprovalStore } from '../../stores/approvalStore'
import { getActiveModules } from '../../config/modules'
import ModuleCard from '../../components/ui/ModuleCard.vue'

const authStore = useAuthStore()
const approvalStore = useApprovalStore()

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
    <section>
        <!-- 1. User Greeting & Identity Section (Existing Visual Baseline) -->
        <div class="mb-8">
            <p class="text-sm text-gray-500">
                User Portal
            </p>

            <h1 class="mt-1 text-3xl font-bold text-gray-900">
                Welcome, {{ authStore.profile?.name || 'User' }}
            </h1>

            <p class="mt-2 text-gray-600">
                Selamat datang di ERP System.
            </p>
        </div>

        <!-- 2. Identity Cards: Company, Division, Position -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white border border-gray-200/80 rounded-xl p-6 shadow-2xs">
                <p class="text-sm text-gray-500">
                    Company
                </p>
                <p class="mt-2 font-semibold text-gray-900">
                    {{ authStore.profile?.company?.name || '-' }}
                </p>
            </div>

            <div class="bg-white border border-gray-200/80 rounded-xl p-6 shadow-2xs">
                <p class="text-sm text-gray-500">
                    Division
                </p>
                <p class="mt-2 font-semibold text-gray-900">
                    {{ authStore.profile?.division?.name || '-' }}
                </p>
            </div>

            <div class="bg-white border border-gray-200/80 rounded-xl p-6 shadow-2xs">
                <p class="text-sm text-gray-500">
                    Position
                </p>
                <p class="mt-2 font-semibold text-gray-900">
                    {{ authStore.profile?.position?.name || '-' }}
                </p>
            </div>
        </div>

        <!-- 3. ERP Modules Section (Modular Launcher) -->
        <div class="mt-10">
            <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h2 class="text-xl font-bold text-gray-900">
                        ERP Modules
                    </h2>
                    <p class="text-sm text-gray-500 mt-1">
                        Pilih modul operasional untuk memulai aktivitas pekerjaan Anda.
                    </p>
                </div>

                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 self-start sm:self-auto">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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