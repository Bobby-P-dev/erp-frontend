<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Search, Check } from '@lucide/vue'

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
        // format: [{ value: 1, label: 'Option 1' }]
    },
    placeholder: {
        type: String,
        default: 'Select an option'
    },
    required: {
        type: Boolean,
        default: false
    },
    loading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue', 'search'])

const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref(null)

let searchTimeout = null

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        emit('search', newValue)
    }, 300)
})

const selectedLabel = computed(() => {
    const selected = props.options.find(opt => opt.value == props.modelValue)
    return selected ? selected.label : ''
})

const toggleDropdown = () => {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
        searchQuery.value = ''
        emit('search', '') // Reset search when opening
    }
}

const selectOption = (option) => {
    emit('update:modelValue', option.value)
    isOpen.value = false
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
        <!-- Label -->
        <label v-if="label" class="block text-sm font-bold text-gray-700 mb-1.5">
            {{ label }} <span v-if="required" class="text-rose-500">*</span>
        </label>

        <!-- Selected Box (Trigger) -->
        <div 
            @click="toggleDropdown"
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between cursor-pointer transition-all hover:bg-white focus:bg-white"
            :class="[isOpen ? 'ring-2 ring-indigo-500/50 border-indigo-500 bg-white' : '']"
        >
            <span :class="selectedLabel ? 'text-gray-900 font-medium' : 'text-gray-400'">
                {{ selectedLabel || placeholder }}
            </span>
            <ChevronDown 
                class="w-4 h-4 text-gray-400 transition-transform duration-200"
                :class="isOpen ? 'rotate-180' : ''"
            />
        </div>

        <!-- Dropdown Panel -->
        <div 
            v-if="isOpen"
            class="absolute z-[110] w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
            <!-- Search Input -->
            <div class="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0">
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        v-model="searchQuery"
                        type="text" 
                        class="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
                        placeholder="Type to search..."
                        autofocus
                        @click.stop
                    >
                </div>
            </div>

            <!-- Options List -->
            <div class="max-h-60 overflow-y-auto p-1">
                <div v-if="loading" class="px-4 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                </div>
                
                <div v-else-if="options.length === 0" class="px-4 py-3 text-sm text-gray-500 text-center">
                    No results found.
                </div>
                
                <div 
                    v-for="option in options" 
                    :key="option.value"
                    @click="selectOption(option)"
                    class="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors"
                    :class="modelValue == option.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'"
                >
                    <span>{{ option.label }}</span>
                    <Check v-if="modelValue == option.value" class="w-4 h-4 text-indigo-600" />
                </div>
            </div>
        </div>
    </div>
</template>
