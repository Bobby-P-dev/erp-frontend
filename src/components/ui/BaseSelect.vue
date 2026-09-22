<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Check, X } from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: [String, Number, Boolean, Object],
        default: ''
    },
    label: {
        type: String,
        default: ''
    },
    options: {
        type: Array,
        required: true,
        default: () => []
    },
    placeholder: {
        type: String,
        default: 'Pilih opsi'
    },
    required: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    clearable: {
        type: Boolean,
        default: false
    },
    size: {
        type: String,
        default: 'md', // 'sm' | 'md' | 'lg'
        validator: (val) => ['sm', 'md', 'lg'].includes(val)
    },
    error: {
        type: String,
        default: ''
    }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const openUpwards = ref(false)
const containerRef = ref(null)

// Normalize options to support primitive strings/numbers or objects { value, label, subtitle? }
const normalizedOptions = computed(() => {
    return (props.options || []).map(opt => {
        if (typeof opt === 'object' && opt !== null) {
            return {
                value: opt.value ?? opt.id,
                label: opt.label ?? opt.name ?? String(opt.value ?? opt.id),
                subtitle: opt.subtitle || opt.code || '',
                disabled: Boolean(opt.disabled),
                ...opt
            }
        }
        return {
            value: opt,
            label: String(opt),
            subtitle: '',
            disabled: false
        }
    })
})

const selectedOption = computed(() => {
    return normalizedOptions.value.find(opt => String(opt.value) === String(props.modelValue))
})

const selectedLabel = computed(() => {
    return selectedOption.value ? selectedOption.value.label : ''
})

const calculatePlacement = () => {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const estimatedHeight = 240
    openUpwards.value = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
}

const toggleDropdown = () => {
    if (props.disabled) return
    if (!isOpen.value) {
        calculatePlacement()
    }
    isOpen.value = !isOpen.value
}

const selectOption = (option) => {
    if (option.disabled) return
    emit('update:modelValue', option.value)
    emit('change', option.value)
    isOpen.value = false
}

const handleClear = (event) => {
    event.stopPropagation()
    emit('update:modelValue', '')
    emit('change', '')
}

const closeDropdown = (e) => {
    if (containerRef.value && !containerRef.value.contains(e.target)) {
        isOpen.value = false
    }
}

const handleKeydown = (e) => {
    if (e.key === 'Escape' && isOpen.value) {
        isOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', closeDropdown)
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.removeEventListener('click', closeDropdown)
    document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
    <div class="relative w-full" ref="containerRef">
        <!-- Label -->
        <label v-if="label" class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            {{ label }} <span v-if="required" class="text-rose-500">*</span>
        </label>

        <!-- Trigger Button -->
        <div 
            role="button"
            tabindex="0"
            @click="toggleDropdown"
            @keydown.enter.space.prevent="toggleDropdown"
            :class="[
                // Base
                'w-full bg-gray-50 border rounded-xl flex items-center justify-between transition-all select-none',
                // Size variants
                size === 'sm' ? 'px-3 py-2 text-xs' : (size === 'lg' ? 'px-4 py-3 text-base' : 'px-3.5 py-2.5 text-xs sm:text-sm'),
                // Interactive state
                disabled 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed pointer-events-none' 
                    : 'cursor-pointer hover:bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white',
                // Error state
                error ? 'border-rose-300 ring-1 ring-rose-400 bg-rose-50/20' : 'border-gray-200',
                // Open state
                isOpen ? 'ring-2 ring-indigo-500/40 border-indigo-500 bg-white shadow-xs' : ''
            ]"
        >
            <div class="flex items-center gap-2 truncate flex-1 min-w-0 pr-1">
                <span 
                    class="truncate font-medium"
                    :class="selectedOption && modelValue !== '' ? 'text-gray-900' : 'text-gray-400'"
                >
                    {{ selectedLabel || placeholder }}
                </span>
                <span v-if="selectedOption?.subtitle" class="text-[11px] text-gray-400 font-normal truncate shrink-0">
                    ({{ selectedOption.subtitle }})
                </span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0 ml-1">
                <button
                    v-if="clearable && modelValue !== '' && !disabled"
                    type="button"
                    @click="handleClear"
                    class="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Hapus pilihan"
                >
                    <X class="w-3.5 h-3.5" />
                </button>
                <ChevronDown 
                    class="w-4 h-4 text-gray-400 transition-transform duration-200"
                    :class="isOpen ? 'rotate-180 text-indigo-600' : ''"
                />
            </div>
        </div>

        <!-- Error Text -->
        <p v-if="error" class="text-xs text-rose-500 mt-1 font-medium">
            {{ error }}
        </p>

        <!-- Custom Dropdown Menu -->
        <div 
            v-if="isOpen"
            class="absolute z-[120] w-full bg-white rounded-2xl shadow-xl border border-gray-100 ring-1 ring-black/5 p-1.5 transition-all duration-150"
            :class="[
                openUpwards ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
            ]"
        >
            <div class="max-h-60 overflow-y-auto space-y-0.5 overscroll-contain">
                <div 
                    v-if="normalizedOptions.length === 0" 
                    class="px-3 py-4 text-xs text-gray-400 text-center"
                >
                    Tidak ada pilihan tersedia
                </div>

                <div 
                    v-for="option in normalizedOptions" 
                    :key="option.value"
                    role="option"
                    :aria-selected="String(modelValue) === String(option.value)"
                    @click="selectOption(option)"
                    class="flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-colors select-none"
                    :class="[
                        option.disabled ? 'opacity-40 cursor-not-allowed' : '',
                        String(modelValue) === String(option.value)
                            ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    ]"
                >
                    <div class="flex flex-col min-w-0 pr-2">
                        <span class="truncate">{{ option.label }}</span>
                        <span v-if="option.subtitle" class="text-[11px] text-gray-400 font-normal truncate">
                            {{ option.subtitle }}
                        </span>
                    </div>

                    <Check 
                        v-if="String(modelValue) === String(option.value)" 
                        class="w-4 h-4 text-indigo-600 shrink-0" 
                    />
                </div>
            </div>
        </div>
    </div>
</template>
