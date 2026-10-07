<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Search, Check, X } from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: [String, Number],
        default: ''
    },
    label: {
        type: String,
        default: ''
    },
    options: {
        type: Array,
        required: true,
    },
    placeholder: {
        type: String,
        default: 'Pilih opsi'
    },
    searchPlaceholder: {
        type: String,
        default: 'Ketik untuk mencari...'
    },
    required: {
        type: Boolean,
        default: false
    },
    loading: {
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
    searchable: {
        type: Boolean,
        default: true
    },
    error: {
        type: String,
        default: ''
    }
})

const emit = defineEmits(['update:modelValue', 'change', 'search'])

const isOpen = ref(false)
const openUpwards = ref(false)
const searchQuery = ref('')
const containerRef = ref(null)
const searchInputRef = ref(null)

let searchTimeout = null

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        if (props.searchable) {
            emit('search', newValue)
        }
    }, 300)
})

watch(isOpen, async (val) => {
    if (val && props.searchable) {
        await nextTick()
        searchInputRef.value?.focus()
    }
})

const filteredOptions = computed(() => {
    if (!props.searchable || !searchQuery.value) {
        return props.options
    }
    const q = searchQuery.value.toLowerCase().trim()
    return props.options.filter(opt => 
        String(opt.label || '').toLowerCase().includes(q) ||
        String(opt.subtitle || '').toLowerCase().includes(q)
    )
})

const selectedOption = computed(() => {
    return props.options.find(opt => opt.value == props.modelValue)
})

const selectedLabel = computed(() => {
    return selectedOption.value ? selectedOption.value.label : ''
})

const calculatePlacement = () => {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const estimatedHeight = 280
    openUpwards.value = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
}

const toggleDropdown = () => {
    if (props.disabled) return
    if (!isOpen.value) {
        calculatePlacement()
        searchQuery.value = ''
        if (props.searchable) {
            emit('search', '') 
        }
    }
    isOpen.value = !isOpen.value
}

const selectOption = (option) => {
    if (option.disabled) return
    emit('update:modelValue', option.value)
    emit('change', option.value)
    isOpen.value = false
}

const handleClear = (e) => {
    e.stopPropagation()
    emit('update:modelValue', '')
    emit('change', '')  
}

const closeDropdown = (e) => {
    if (containerRef.value && !containerRef.value.contains(e.target)) {
        isOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
    document.removeEventListener('click', closeDropdown)
})
</script>

<template>
    <div class="relative w-full" ref="containerRef">
        <label v-if="label" class="block text-base font-bold text-slate-700 mb-2">
            {{ label }} <span v-if="required" class="text-rose-500">*</span>
        </label>

        <div 
            @click="toggleDropdown"
            class="w-full px-4 py-3 sm:py-3.5 bg-white border rounded-xl text-base flex items-center justify-between transition-all select-none shadow-xs"
            :class="[
                disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'cursor-pointer hover:border-slate-300',
                error ? 'border-rose-300 ring-1 ring-rose-400 bg-rose-50/20' : 'border-slate-300',
                isOpen ? 'ring-2 ring-blue-500/20 border-blue-500 bg-white' : ''
            ]"
        >
            <div class="flex-1 min-w-0 pr-2">
                <span class="truncate block" :class="selectedLabel ? 'text-slate-900 font-semibold' : 'text-slate-400'">
                    {{ selectedLabel || placeholder }}
                </span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
                <button
                    v-if="clearable && modelValue && !disabled"
                    type="button"
                    @click="handleClear"
                    class="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                    title="Hapus pilihan"
                >
                    <X class="w-4 h-4" />
                </button>
                <ChevronDown 
                    class="w-5 h-5 text-slate-400 transition-transform duration-200"
                    :class="isOpen ? 'rotate-180 text-blue-600' : ''"
                />
            </div>
        </div>

        <p v-if="error" class="text-sm text-rose-600 mt-1.5 font-medium">
            {{ error }}
        </p>

        <div 
            v-if="isOpen"
            class="absolute z-[120] w-full bg-white rounded-2xl shadow-xl border border-slate-200 ring-1 ring-black/5 overflow-hidden transition-all duration-150"
            :class="[
                openUpwards ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
            ]"
        >
            <div v-if="searchable" class="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0">
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        ref="searchInputRef"
                        v-model="searchQuery"
                        type="text" 
                        class="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        :placeholder="searchPlaceholder"
                        @click.stop
                    >
                </div>
            </div>

            <div class="max-h-64 overflow-y-auto p-1.5 divide-y divide-slate-50">
                <div v-if="loading" class="px-4 py-3 text-base text-slate-500 text-center flex items-center justify-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Mencari...</span>
                </div>
                
                <div v-else-if="filteredOptions.length === 0" class="px-4 py-3 text-base text-slate-500 text-center">
                    Tidak ditemukan data yang sesuai.
                </div>
                
                <div 
                    v-for="option in filteredOptions" 
                    :key="option.value"
                    @click="selectOption(option)"
                    class="flex items-center justify-between px-4 py-3 rounded-xl text-base transition-colors"
                    :class="[
                        option.disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 select-none' : 'cursor-pointer',
                        modelValue == option.value ? 'bg-blue-50 text-blue-700 font-semibold' : (option.disabled ? '' : 'text-slate-700 hover:bg-slate-50')
                    ]"
                >
                    <div class="flex-1 min-w-0 pr-2">
                        <div class="truncate font-medium">{{ option.label }}</div>
                        <div v-if="option.subtitle" class="text-sm text-slate-500 mt-0.5 truncate">{{ option.subtitle }}</div>
                    </div>
                    <Check v-if="modelValue == option.value" class="w-5 h-5 text-blue-600 shrink-0" />
                </div>
            </div>
        </div>
    </div>
</template>
