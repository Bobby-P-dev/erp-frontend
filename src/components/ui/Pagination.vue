<script setup>
import { ChevronLeft, ChevronRight } from '@lucide/vue'

defineProps({
    pagination: {
        type: Object,
        required: true
    }
})

defineEmits(['change-page'])
</script>

<template>
    <div v-if="pagination.total > 0" class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span class="text-sm text-gray-500">
            Showing <span class="font-bold text-gray-900">{{ pagination.from }}</span> to <span class="font-bold text-gray-900">{{ pagination.to }}</span> of <span class="font-bold text-gray-900">{{ pagination.total }}</span> results
        </span>
        
        <div class="flex items-center gap-1">
            <button 
                @click="$emit('change-page', pagination.current_page - 1)"
                :disabled="pagination.current_page === 1"
                class="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 transition-all disabled:opacity-50 shadow-sm-hover"
            >
                <ChevronLeft class="w-5 h-5" />
            </button>
            
            <button 
                v-for="page in pagination.last_page" 
                :key="page"
                @click="$emit('change-page', page)"
                :class="[
                    'w-9 h-9 rounded-xl text-sm font-bold flex items-center justify-center transition-all',
                    page === pagination.current_page 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent'
                ]"
            >
                {{ page }}
            </button>
            
            <button 
                @click="$emit('change-page', pagination.current_page + 1)"
                :disabled="pagination.current_page === pagination.last_page"
                class="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 transition-all disabled:opacity-50 shadow-sm-hover"
            >
                <ChevronRight class="w-5 h-5" />
            </button>
        </div>
    </div>
</template>
