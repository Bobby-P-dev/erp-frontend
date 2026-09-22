<script setup>
import { RouterLink } from 'vue-router'
import { 
    Home, 
    ChevronRight, 
    ArrowLeft, 
    Construction, 
    Clock, 
    Info 
} from '@lucide/vue'

defineProps({
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    stageName: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: [Object, Function],
        default: null
    },
    backRoute: {
        type: [Object, String],
        default: () => ({ name: 'user.purchasing' })
    },
    backText: {
        type: String,
        default: 'Kembali ke Menu Purchasing'
    }
})
</script>

<template>
    <div class="space-y-6">
        <!-- 1. Breadcrumb -->
        <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm text-gray-500">
            <RouterLink 
                :to="{ name: 'user.dashboard' }" 
                class="hover:text-indigo-600 font-medium transition-colors flex items-center gap-1.5"
            >
                <Home class="w-4 h-4" />
                <span>Dashboard</span>
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
            <RouterLink 
                :to="{ name: 'user.purchasing' }" 
                class="hover:text-indigo-600 font-medium transition-colors"
            >
                Purchasing
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
            <span class="font-semibold text-gray-900 truncate" aria-current="page">{{ title }}</span>
        </nav>

        <!-- 2. Main Placeholder Container -->
        <div class="bg-white rounded-3xl border border-gray-200/80 p-8 sm:p-12 shadow-2xs text-center max-w-2xl mx-auto space-y-6">
            <!-- Icon Badge -->
            <div class="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
                <component :is="icon || Construction" class="w-10 h-10" />
            </div>

            <!-- Stage & Title -->
            <div>
                <span 
                    v-if="stageName" 
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 mb-3"
                >
                    <Clock class="w-3.5 h-3.5" />
                    {{ stageName }}
                </span>

                <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
                    {{ title }}
                </h1>

                <p v-if="subtitle" class="text-sm font-semibold text-indigo-600 mt-1">
                    {{ subtitle }}
                </p>

                <p class="mt-3 text-sm sm:text-base text-gray-500 leading-relaxed max-w-lg mx-auto">
                    {{ description }}
                </p>
            </div>

            <!-- ERP Context Notice -->
            <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left flex items-start gap-3 text-xs sm:text-sm text-slate-600">
                <Info class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div class="space-y-1">
                    <p class="font-bold text-slate-800">
                        Status Modul Operasional: Dalam Pengembangan Frontend
                    </p>
                    <p class="text-slate-500 leading-relaxed">
                        Fitur bisnis halaman ini telah terdaftar dalam arsitektur navigasi modular ERP. Antarmuka dan integrasi endpoint backend sedang dalam proses pengerjaan.
                    </p>
                </div>
            </div>

            <!-- Action Button -->
            <div class="pt-4">
                <RouterLink
                    :to="backRoute"
                    class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                >
                    <ArrowLeft class="w-4 h-4" />
                    <span>{{ backText }}</span>
                </RouterLink>
            </div>
        </div>
    </div>
</template>
