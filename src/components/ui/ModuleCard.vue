<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Lock, ShieldAlert } from '@lucide/vue'

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    icon: {
        type: [Object, Function],
        default: null
    },
    to: {
        type: [Object, String],
        default: null
    },
    color: {
        type: String,
        default: 'blue'
    },
    badge: {
        type: String,
        default: ''
    },
    badgeVariant: {
        type: String,
        default: 'default', // default | emerald | amber | blue | slate | neutral
    },
    status: {
        type: String,
        default: 'active', // active | coming_soon | disabled
        validator: val => ['active', 'coming_soon', 'disabled'].includes(val)
    },
    actionText: {
        type: String,
        default: 'Buka Modul'
    },
    restricted: {
        type: Boolean,
        default: false
    },
    restrictedMessage: {
        type: String,
        default: 'Akses khusus divisi terkait'
    }
})

const isInteractive = computed(() => {
    return props.status === 'active' && !props.restricted && Boolean(props.to)
})

// Badge styles mapping
const badgeClass = computed(() => {
    if (props.restricted) {
        return 'bg-slate-100 text-slate-500 border border-slate-200'
    }
    if (props.status === 'coming_soon') {
        return 'bg-slate-100 text-slate-600 border border-slate-200'
    }

    switch (props.badgeVariant) {
        case 'emerald':
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        case 'amber':
            return 'bg-amber-50 text-amber-800 border border-amber-200'
        case 'blue':
            return 'bg-blue-50 text-blue-700 border border-blue-200'
        case 'neutral':
            return 'bg-gray-100 text-gray-600 border border-gray-200'
        case 'slate':
            return 'bg-slate-100 text-slate-600 border border-slate-200'
        default:
            return 'bg-blue-50 text-blue-700 border border-blue-200'
    }
})
</script>

<template>
    <!-- Interactive Active Minimalist Card (Matching Reference Layout) -->
    <RouterLink
        v-if="isInteractive"
        :to="to"
        class="group relative bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between focus-visible:ring-2 focus-visible:ring-blue-600 outline-none select-none cursor-pointer"
    >
        <div class="flex items-center gap-4 min-w-0 pr-2">
            <!-- Icon Box -->
            <div 
                class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0 bg-blue-50/90 text-blue-600 border border-blue-100/70 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xs group-hover:scale-105"
            >
                <component :is="icon" class="w-6 h-6 transition-colors" />
            </div>

            <!-- Title & Subtitle Group -->
            <div class="min-w-0 flex flex-col justify-center">
                <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight truncate">
                        {{ title }}
                    </h3>
                    <span 
                        v-if="badge"
                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide shrink-0"
                        :class="badgeClass"
                    >
                        <span 
                            v-if="badgeVariant === 'amber' || badgeVariant === 'emerald'" 
                            class="w-1.5 h-1.5 rounded-full"
                            :class="badgeVariant === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'"
                        ></span>
                        {{ badge }}
                    </span>
                </div>
                <p v-if="subtitle" class="text-xs text-slate-500 font-normal mt-1 truncate">
                    {{ subtitle }}
                </p>
            </div>
        </div>

        <!-- Right Arrow Navigation Icon -->
        <div class="shrink-0 pl-2">
            <ArrowRight class="w-4 h-4 text-blue-600 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
    </RouterLink>

    <!-- Coming Soon State -->
    <div
        v-else-if="status === 'coming_soon'"
        class="bg-slate-50/60 border border-dashed border-slate-200/90 rounded-2xl p-5 sm:p-6 relative cursor-not-allowed select-none opacity-80 flex items-center justify-between"
        aria-disabled="true"
    >
        <div class="flex items-center gap-4 min-w-0 pr-2">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/80 flex items-center justify-center shrink-0">
                <component :is="icon" class="w-6 h-6 text-slate-400" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
                <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-slate-700 leading-tight truncate">
                        {{ title }}
                    </h3>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                        {{ badge || 'Segera Hadir' }}
                    </span>
                </div>
                <p v-if="subtitle" class="text-xs text-slate-400 font-normal mt-1 truncate">
                    {{ subtitle }}
                </p>
            </div>
        </div>
        <div class="shrink-0 pl-2">
            <Lock class="w-4 h-4 text-slate-400" />
        </div>
    </div>

    <!-- Restricted / No Permission State -->
    <div
        v-else-if="restricted"
        class="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 sm:p-6 relative cursor-not-allowed select-none opacity-75 flex items-center justify-between"
        aria-disabled="true"
    >
        <div class="flex items-center gap-4 min-w-0 pr-2">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/80 flex items-center justify-center shrink-0">
                <component :is="icon" class="w-6 h-6 text-slate-400" />
            </div>
            <div class="min-w-0 flex flex-col justify-center">
                <h3 class="text-base font-bold text-slate-700 leading-tight truncate">
                    {{ title }}
                </h3>
                <p class="text-xs text-slate-400 font-normal mt-1 truncate">
                    {{ restrictedMessage }}
                </p>
            </div>
        </div>
        <div class="shrink-0 pl-2">
            <Lock class="w-4 h-4 text-slate-400" />
        </div>
    </div>

    <!-- Fallback Disabled State -->
    <div
        v-else
        class="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 sm:p-6 opacity-75 flex items-center justify-between select-none"
        aria-disabled="true"
    >
        <div class="flex items-center gap-4 min-w-0 pr-2">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                <component :is="icon" class="w-6 h-6 text-slate-400" />
            </div>
            <div class="min-w-0">
                <h3 class="text-base font-bold text-slate-700 leading-tight truncate">{{ title }}</h3>
                <p v-if="subtitle" class="text-xs text-slate-400 mt-1 truncate">{{ subtitle }}</p>
            </div>
        </div>
        <div class="text-xs text-slate-400">
            Tidak aktif
        </div>
    </div>
</template>
