<script setup>
import { computed } from 'vue'

const props = defineProps({
    tabs: {
        type: Array,
        required: true,
        // Array of { id: String|Number, label: String, count?: Number|String, icon?: Component, color?: String }
    },
    modelValue: {
        type: [String, Number],
        default: ''
    },
    variant: {
        type: String,
        default: 'pill',
        validator: (v) => ['pill', 'segmented', 'underline'].includes(v)
    },
    size: {
        type: String,
        default: 'sm',
        validator: (v) => ['sm', 'md', 'lg'].includes(v)
    }
})

const emit = defineEmits(['update:modelValue', 'change'])

const selectTab = (id) => {
    emit('update:modelValue', id)
    emit('change', id)
}

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'lg':
            return {
                btn: 'px-4 py-2.5 text-sm',
                badge: 'px-2 py-0.5 text-xs',
                icon: 'w-4 h-4'
            }
        case 'md':
            return {
                btn: 'px-3.5 py-2 text-xs sm:text-sm',
                badge: 'px-2 py-0.5 text-[11px]',
                icon: 'w-4 h-4'
            }
        case 'sm':
        default:
            return {
                btn: 'px-3 py-1.5 text-xs',
                badge: 'px-1.5 py-0.5 text-[10px]',
                icon: 'w-3.5 h-3.5'
            }
    }
})
</script>

<template>
    <!-- Segmented Style -->
    <div
        v-if="variant === 'segmented'"
        class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/90 gap-1 overflow-x-auto max-w-full"
    >
        <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="selectTab(tab.id)"
            :class="[
                'font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
                sizeClasses.btn,
                modelValue === tab.id
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            ]"
        >
            <component :is="tab.icon" v-if="tab.icon" :class="sizeClasses.icon" />
            <span>{{ tab.label }}</span>
            <span
                v-if="tab.count !== undefined && tab.count !== null"
                :class="[
                    'rounded-full font-mono font-bold leading-none',
                    sizeClasses.badge,
                    modelValue === tab.id
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                ]"
            >
                {{ tab.count }}
            </span>
        </button>
    </div>

    <!-- Underline Style (tabs over container border) -->
    <div
        v-else-if="variant === 'underline'"
        class="flex items-center gap-1 overflow-x-auto border-b border-slate-200 -mb-px"
    >
        <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="selectTab(tab.id)"
            :class="[
                'border-b-2 font-semibold transition-all flex items-center gap-2 whitespace-nowrap rounded-t-lg cursor-pointer',
                sizeClasses.btn,
                modelValue === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white shadow-2xs font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium'
            ]"
        >
            <component :is="tab.icon" v-if="tab.icon" :class="sizeClasses.icon" />
            <span>{{ tab.label }}</span>
            <span
                v-if="tab.count !== undefined && tab.count !== null"
                :class="[
                    'rounded-full font-mono font-bold leading-none',
                    sizeClasses.badge,
                    modelValue === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                ]"
            >
                {{ tab.count }}
            </span>
        </button>
    </div>

    <!-- Pill Style (Default) -->
    <div
        v-else
        class="flex items-center gap-1.5 overflow-x-auto py-1"
    >
        <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="selectTab(tab.id)"
            :class="[
                'rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                sizeClasses.btn,
                modelValue === tab.id
                    ? (tab.color === 'emerald' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs')
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            ]"
        >
            <component :is="tab.icon" v-if="tab.icon" :class="sizeClasses.icon" />
            <span>{{ tab.label }}</span>
            <span
                v-if="tab.count !== undefined && tab.count !== null"
                :class="[
                    'rounded-full font-mono font-bold leading-none',
                    sizeClasses.badge,
                    modelValue === tab.id
                        ? (tab.color === 'emerald' ? 'bg-emerald-700 text-white' : 'bg-blue-700/80 text-white')
                        : 'bg-slate-200 text-slate-700'
                ]"
            >
                {{ tab.count }}
            </span>
        </button>
    </div>
</template>
