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
    <div v-if="pagination.total > 0" class="px-6 py-4.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span class="text-base text-slate-600">
            Menampilkan <span class="font-bold text-slate-900">{{ pagination.from }}</span> sampai <span class="font-bold text-slate-900">{{ pagination.to }}</span> dari total <span class="font-bold text-slate-900">{{ pagination.total }}</span> data
        </span>
        
        <div class="flex items-center gap-1.5">
            <button 
                @click="$emit('change-page', pagination.current_page - 1)"
                :disabled="pagination.current_page === 1"
                class="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                title="Halaman Sebelumnya"
            >
                <ChevronLeft class="w-5 h-5" />
            </button>
            
            <button 
                v-for="page in pagination.last_page" 
                :key="page"
                @click="$emit('change-page', page)"
                :class="[
                    'w-10 h-10 rounded-xl text-base font-bold flex items-center justify-center transition-all cursor-pointer',
                    page === pagination.current_page 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                        : 'text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-transparent'
                ]"
            >
                {{ page }}
            </button>
            
            <button 
                @click="$emit('change-page', pagination.current_page + 1)"
                :disabled="pagination.current_page === pagination.last_page"
                class="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                title="Halaman Selanjutnya"
            >
                <ChevronRight class="w-5 h-5" />
            </button>
        </div>
    </div>
</template>
