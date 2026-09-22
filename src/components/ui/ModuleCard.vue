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
        required: true
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
        default: 'indigo', // indigo | amber | blue | emerald | slate
        validator: val => ['indigo', 'amber', 'blue', 'emerald', 'slate', 'purple'].includes(val)
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

// Color styles mapping for icon container
const colorStyles = computed(() => {
    if (props.status === 'coming_soon' || props.restricted) {
        return {
            container: 'bg-slate-100 text-slate-400',
            accent: 'text-slate-400'
        }
    }

    switch (props.color) {
        case 'amber':
            return {
                container: 'bg-amber-50 text-amber-600 border border-amber-100/60 group-hover:bg-amber-600 group-hover:text-white',
                accent: 'text-amber-600 group-hover:text-amber-700'
            }
        case 'blue':
            return {
                container: 'bg-blue-50 text-blue-600 border border-blue-100/60 group-hover:bg-blue-600 group-hover:text-white',
                accent: 'text-blue-600 group-hover:text-blue-700'
            }
        case 'emerald':
            return {
                container: 'bg-emerald-50 text-emerald-600 border border-emerald-100/60 group-hover:bg-emerald-600 group-hover:text-white',
                accent: 'text-emerald-600 group-hover:text-emerald-700'
            }
        case 'purple':
            return {
                container: 'bg-purple-50 text-purple-600 border border-purple-100/60 group-hover:bg-purple-600 group-hover:text-white',
                accent: 'text-purple-600 group-hover:text-purple-700'
            }
        case 'indigo':
        default:
            return {
                container: 'bg-indigo-50 text-indigo-600 border border-indigo-100/60 group-hover:bg-indigo-600 group-hover:text-white',
                accent: 'text-indigo-600 group-hover:text-indigo-700'
            }
    }
})

// Badge styles mapping
const badgeClass = computed(() => {
    if (props.restricted) {
        return 'bg-gray-100 text-gray-500 border border-gray-200'
    }
    if (props.status === 'coming_soon') {
        return 'bg-slate-200/80 text-slate-600 border border-slate-300/60'
    }

    switch (props.badgeVariant) {
        case 'emerald':
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        case 'amber':
            return 'bg-amber-50 text-amber-800 border border-amber-200'
        case 'blue':
            return 'bg-blue-50 text-blue-700 border border-blue-200'
        case 'neutral':
            return 'bg-gray-100 text-gray-600 border border-gray-200/80'
        case 'slate':
            return 'bg-slate-100 text-slate-600 border border-slate-200'
        default:
            return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    }
})
</script>

<template>
    <!-- Interactive Active Card -->
    <RouterLink
        v-if="isInteractive"
        :to="to"
        class="group h-full bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
    >
        <div class="flex-1 flex flex-col">
            <!-- Top Bar: Icon & Badge -->
            <div class="flex items-center justify-between gap-3">
                <div 
                    class="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 shrink-0"
                    :class="colorStyles.container"
                >
                    <component :is="icon" class="w-6 h-6" />
                </div>

                <span 
                    v-if="badge"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide shrink-0"
                    :class="badgeClass"
                >
                    <span 
                        v-if="badgeVariant === 'emerald' || badge === 'Aktif'" 
                        class="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    ></span>
                    {{ badge }}
                </span>
            </div>

            <!-- Subtitle / Lifecycle Stage -->
            <p v-if="subtitle" class="mt-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                {{ subtitle }}
            </p>

            <!-- Title -->
            <h3 
                class="text-base sm:text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors"
                :class="{ 'mt-1': subtitle, 'mt-4': !subtitle }"
            >
                {{ title }}
            </h3>

            <!-- Description -->
            <p class="mt-1.5 text-sm text-gray-500 leading-relaxed line-clamp-3 min-h-[4.25rem]">
                {{ description }}
            </p>
        </div>

        <!-- Bottom Action CTA -->
        <div class="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-sm font-semibold transition-colors mt-auto shrink-0" :class="colorStyles.accent">
            <span>{{ actionText }}</span>
            <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
    </RouterLink>

    <!-- Coming Soon State -->
    <div
        v-else-if="status === 'coming_soon'"
        class="h-full bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl p-6 relative cursor-not-allowed select-none opacity-90 flex flex-col justify-between"
        aria-disabled="true"
    >
        <div class="flex-1 flex flex-col">
            <div class="flex items-center justify-between gap-3">
                <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <component :is="icon" class="w-6 h-6" />
                </div>
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase shrink-0" :class="badgeClass">
                    {{ badge || 'Coming Soon' }}
                </span>
            </div>

            <p v-if="subtitle" class="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                {{ subtitle }}
            </p>

            <h3 
                class="text-base sm:text-lg font-bold text-slate-700"
                :class="{ 'mt-1': subtitle, 'mt-4': !subtitle }"
            >
                {{ title }}
            </h3>

            <p class="mt-1.5 text-sm text-slate-500 leading-relaxed line-clamp-3 min-h-[4.25rem]">
                {{ description }}
            </p>
        </div>

        <div class="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-400 mt-auto shrink-0">
            <span>{{ actionText || 'Segera Hadir' }}</span>
            <Lock class="w-3.5 h-3.5" />
        </div>
    </div>

    <!-- Restricted / No Permission State -->
    <div
        v-else-if="restricted"
        class="h-full bg-gray-50/70 border border-gray-200/70 rounded-2xl p-6 relative cursor-not-allowed select-none opacity-80 flex flex-col justify-between"
        aria-disabled="true"
    >
        <div class="flex-1 flex flex-col">
            <div class="flex items-center justify-between gap-3">
                <div class="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                    <component :is="icon" class="w-6 h-6" />
                </div>
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-gray-100 text-gray-500 border border-gray-200 shrink-0">
                    Akses Terbatas
                </span>
            </div>

            <p v-if="subtitle" class="mt-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                {{ subtitle }}
            </p>

            <h3 
                class="text-base sm:text-lg font-bold text-gray-700"
                :class="{ 'mt-1': subtitle, 'mt-4': !subtitle }"
            >
                {{ title }}
            </h3>

            <p class="mt-1.5 text-sm text-gray-500 leading-relaxed line-clamp-3 min-h-[4.25rem]">
                {{ description }}
            </p>
        </div>

        <div class="mt-6 pt-4 border-t border-gray-200/60 flex items-center justify-between text-xs font-medium text-amber-700 mt-auto shrink-0">
            <span class="flex items-center gap-1.5">
                <ShieldAlert class="w-3.5 h-3.5" />
                {{ restrictedMessage }}
            </span>
            <span class="font-bold text-gray-400">Terkunci</span>
        </div>
    </div>

    <!-- Fallback Disabled State -->
    <div
        v-else
        class="h-full bg-gray-50 border border-gray-200/60 rounded-2xl p-6 opacity-75 flex flex-col justify-between"
        aria-disabled="true"
    >
        <div class="flex-1 flex flex-col">
            <div class="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                <component :is="icon" class="w-6 h-6" />
            </div>
            <h3 class="mt-4 text-base sm:text-lg font-bold text-gray-700">{{ title }}</h3>
            <p class="mt-1.5 text-sm text-gray-400 line-clamp-3 min-h-[4.25rem]">{{ description }}</p>
        </div>
        <div class="mt-6 pt-4 border-t border-gray-200/60 text-xs text-gray-400 mt-auto shrink-0">
            Tidak aktif
        </div>
    </div>
</template>
