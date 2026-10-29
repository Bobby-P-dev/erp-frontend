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
            return 'bg-[#EAF2FF] text-[#014BAA] border border-[#014BAA]/20'
        case 'neutral':
            return 'bg-gray-100 text-gray-600 border border-gray-200'
        case 'slate':
            return 'bg-slate-100 text-slate-600 border border-slate-200'
        default:
            return 'bg-[#EAF2FF] text-[#014BAA] border border-[#014BAA]/20'
    }
})
</script>

<template>
    <!-- Interactive Active Minimalist Card (SAP Fiori Launchpad Pattern) -->
    <RouterLink
        v-if="isInteractive"
        :to="to"
        class="group relative bg-white rounded-[14px] border border-[#E5EAF1] p-6 hover:border-[#014BAA]/45 hover:shadow-xs transition-all duration-150 motion-reduce:transition-none flex flex-col justify-between h-full focus-visible:ring-2 focus-visible:ring-[#014BAA] focus-visible:ring-offset-2 outline-none select-none cursor-pointer"
    >
        <div class="space-y-4">
            <!-- Top Row: Icon & Meaningful Status Badge (if any) -->
            <div class="flex items-start justify-between gap-3">
                <div 
                    class="w-11 h-11 rounded-[10px] flex items-center justify-center transition-colors duration-150 shrink-0 bg-[#EAF2FF] text-[#014BAA] group-hover:bg-[#014BAA] group-hover:text-white"
                >
                    <component :is="icon" class="w-5 h-5 transition-colors" />
                </div>

                <span 
                    v-if="badge"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium shrink-0"
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

            <!-- Title, Subtitle & Description -->
            <div class="space-y-1.5">
                <div>
                    <h3 class="text-[16px] sm:text-[17px] font-semibold text-[#111827] group-hover:text-[#014BAA] transition-colors leading-snug">
                        {{ title }}
                    </h3>
                    <p v-if="subtitle" class="text-[13px] font-medium text-[#667085] mt-0.5">
                        {{ subtitle }}
                    </p>
                </div>

                <p v-if="description" class="text-[14px] text-[#667085] leading-relaxed line-clamp-2 pt-1">
                    {{ description }}
                </p>
            </div>
        </div>

        <!-- Footer CTA -->
        <div class="mt-6 pt-4 border-t border-[#E5EAF1]/80 flex items-center justify-between text-[13px] font-semibold text-[#014BAA] group-hover:text-[#013E8C] transition-colors min-h-[28px]">
            <span>{{ actionText }}</span>
            <ArrowRight class="w-4 h-4 transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-1" />
        </div>
    </RouterLink>

    <!-- Coming Soon State -->
    <div
        v-else-if="status === 'coming_soon'"
        class="bg-slate-50/70 border border-dashed border-[#E5EAF1] rounded-[14px] p-6 relative cursor-not-allowed select-none flex flex-col justify-between h-full"
        aria-disabled="true"
    >
        <div class="space-y-4">
            <div class="flex items-start justify-between gap-3">
                <div class="w-11 h-11 rounded-[10px] bg-slate-100 text-slate-400 border border-slate-200/80 flex items-center justify-center shrink-0">
                    <component :is="icon" class="w-5 h-5 text-slate-400" />
                </div>
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    {{ badge || 'Segera Hadir' }}
                </span>
            </div>
            <div class="space-y-1.5">
                <div>
                    <h3 class="text-[16px] sm:text-[17px] font-semibold text-slate-600 leading-snug">
                        {{ title }}
                    </h3>
                    <p v-if="subtitle" class="text-[13px] font-medium text-slate-400 mt-0.5">
                        {{ subtitle }}
                    </p>
                </div>
                <p v-if="description" class="text-[14px] text-slate-400 leading-relaxed line-clamp-2 pt-1">
                    {{ description }}
                </p>
            </div>
        </div>
        <div class="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-[13px] font-medium text-slate-400 min-h-[28px]">
            <span>Belum Tersedia</span>
            <Lock class="w-4 h-4 text-slate-400" />
        </div>
    </div>

    <!-- Restricted / No Permission State -->
    <div
        v-else-if="restricted"
        class="bg-slate-50/70 border border-[#E5EAF1] rounded-[14px] p-6 relative cursor-not-allowed select-none flex flex-col justify-between h-full"
        aria-disabled="true"
    >
        <div class="space-y-4">
            <div class="flex items-start justify-between gap-3">
                <div class="w-11 h-11 rounded-[10px] bg-slate-100 text-slate-400 border border-slate-200/80 flex items-center justify-center shrink-0">
                    <component :is="icon" class="w-5 h-5 text-slate-400" />
                </div>
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                    Akses Terbatas
                </span>
            </div>
            <div class="space-y-1.5">
                <div>
                    <h3 class="text-[16px] sm:text-[17px] font-semibold text-slate-600 leading-snug">
                        {{ title }}
                    </h3>
                    <p v-if="subtitle" class="text-[13px] font-medium text-slate-400 mt-0.5">
                        {{ subtitle }}
                    </p>
                </div>
                <p class="text-[14px] text-slate-400 leading-relaxed line-clamp-2 pt-1">
                    {{ restrictedMessage }}
                </p>
            </div>
        </div>
        <div class="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-[13px] font-medium text-slate-400 min-h-[28px]">
            <span>Tidak Diizinkan</span>
            <Lock class="w-4 h-4 text-slate-400" />
        </div>
    </div>

    <!-- Fallback Disabled State -->
    <div
        v-else
        class="bg-slate-50/70 border border-[#E5EAF1] rounded-[14px] p-6 select-none flex flex-col justify-between h-full cursor-not-allowed"
        aria-disabled="true"
    >
        <div class="space-y-4">
            <div class="w-11 h-11 rounded-[10px] bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                <component :is="icon" class="w-5 h-5 text-slate-400" />
            </div>
            <div class="space-y-1.5">
                <h3 class="text-[16px] sm:text-[17px] font-semibold text-slate-600 leading-snug">{{ title }}</h3>
                <p v-if="subtitle" class="text-[13px] text-slate-400 mt-0.5">{{ subtitle }}</p>
                <p v-if="description" class="text-[14px] text-slate-400 leading-relaxed line-clamp-2 pt-1">{{ description }}</p>
            </div>
        </div>
        <div class="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-[13px] font-medium text-slate-400 min-h-[28px]">
            <span>Tidak Aktif</span>
            <Lock class="w-4 h-4 text-slate-400" />
        </div>
    </div>
</template>
