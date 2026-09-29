<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Search, Check, X } from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => []
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
        default: 'Select options'
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

const optionCache = ref(new Map())

watch(() => props.options, (newOpts) => {
    newOpts.forEach(opt => {
        optionCache.value.set(opt.value, opt)
    })
}, { immediate: true, deep: true })

const selectedItems = computed(() => {
    return props.modelValue.map(val => {
        return optionCache.value.get(val) || { value: val, label: `Selected (${val})` }
    })
})

let searchTimeout = null

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        emit('search', newValue)
    }, 300)
})

const toggleDropdown = () => {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
        searchQuery.value = ''
        emit('search', '')
    }
}

const selectOption = (option) => {
    const newValue = [...props.modelValue]
    const index = newValue.indexOf(option.value)
    
    if (index === -1) {
        newValue.push(option.value)
    } else {
        newValue.splice(index, 1)
    }
    
    emit('update:modelValue', newValue)
}

const removeOption = (val, e) => {
    e.stopPropagation()
    const newValue = props.modelValue.filter(v => v !== val)
    emit('update:modelValue', newValue)
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
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base flex items-center justify-between cursor-pointer transition-all hover:bg-white focus:bg-white min-h-[50px] shadow-xs"
            :class="[isOpen ? 'ring-2 ring-blue-500/40 border-blue-500 bg-white' : '']"
        >
            <div class="flex flex-wrap gap-2 flex-1 mr-2">
                <span v-if="selectedItems.length === 0" class="text-slate-400">
                    {{ placeholder }}
                </span>
                
                <span 
                    v-for="item in selectedItems" 
                    :key="item.value"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                >
                    {{ item.label }}
                    <button 
                        @click="(e) => removeOption(item.value, e)"
                        class="text-blue-500 hover:text-blue-700 focus:outline-none cursor-pointer"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </span>
            </div>

            <ChevronDown 
                class="w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0"
                :class="isOpen ? 'rotate-180 text-blue-600' : ''"
            />
        </div>

        <div 
            v-if="isOpen"
            class="absolute z-110 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
            <div class="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0">
                <div class="relative">
                    <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        v-model="searchQuery"
                        type="text" 
                        class="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                        placeholder="Ketik untuk mencari..."
                        autofocus
                        @click.stop
                    >
                </div>
            </div>

            <div class="max-h-64 overflow-y-auto p-1.5 space-y-1">
                <div v-if="loading" class="px-4 py-3 text-base text-slate-500 text-center flex items-center justify-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mencari...
                </div>
                
                <div v-else-if="options.length === 0" class="px-4 py-3 text-base text-slate-500 text-center">
                    Tidak ditemukan data yang sesuai.
                </div>
                
                <div 
                    v-for="option in options" 
                    :key="option.value"
                    @click="selectOption(option)"
                    class="flex items-center justify-between px-4 py-3 rounded-xl text-base cursor-pointer transition-colors"
                    :class="modelValue.includes(option.value) ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'"
                >
                    <span>{{ option.label }}</span>
                    <Check v-if="modelValue.includes(option.value)" class="w-5 h-5 text-blue-600" />
                </div>
            </div>
        </div>
    </div>
</template>
