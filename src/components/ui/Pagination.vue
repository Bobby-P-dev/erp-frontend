<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = defineProps({
    pagination: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['change-page', 'page-change'])

const emitPage = (page) => {
    if (page < 1 || page > (props.pagination.last_page || 1)) return
    emit('change-page', page)
    emit('page-change', page)
}

const resolvedFrom = computed(() => {
    if (props.pagination.from !== undefined && props.pagination.from !== null && props.pagination.from > 0) {
        return props.pagination.from
    }
    const total = Number(props.pagination.total || 0)
    if (total === 0) return 0
    const current = Number(props.pagination.current_page || 1)
    const perPage = Number(props.pagination.per_page || 10)
    return (current - 1) * perPage + 1
})

const resolvedTo = computed(() => {
    if (props.pagination.to !== undefined && props.pagination.to !== null && props.pagination.to > 0) {
        return props.pagination.to
    }
    const total = Number(props.pagination.total || 0)
    if (total === 0) return 0
    const current = Number(props.pagination.current_page || 1)
    const perPage = Number(props.pagination.per_page || 10)
    return Math.min(current * perPage, total)
})

const visiblePages = computed(() => {
    const last = Number(props.pagination.last_page || 1)
    const current = Number(props.pagination.current_page || 1)
    if (last <= 7) {
        return Array.from({ length: last }, (_, i) => i + 1)
    }
    const pages = new Set([1, last, current, current - 1, current + 1])
    return Array.from(pages)
        .filter(p => p >= 1 && p <= last)
        .sort((a, b) => a - b)
})
</script>

<template>
    <div v-if="pagination.total > 0" class="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span class="text-xs sm:text-sm text-slate-600">
            Menampilkan <span class="font-bold text-slate-900 font-mono">{{ resolvedFrom }}</span> sampai <span class="font-bold text-slate-900 font-mono">{{ resolvedTo }}</span> dari total <span class="font-bold text-slate-900 font-mono">{{ pagination.total }}</span> data
        </span>
        
        <div class="flex items-center gap-1.5">
            <button 
                type="button"
                @click="emitPage(pagination.current_page - 1)"
                :disabled="pagination.current_page === 1"
                class="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                title="Halaman Sebelumnya"
            >
                <ChevronLeft class="w-4 h-4" />
            </button>
            
            <button 
                v-for="page in visiblePages" 
                :key="page"
                type="button"
                @click="emitPage(page)"
                :class="[
                    'w-9 h-9 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all cursor-pointer font-mono',
                    page === pagination.current_page 
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' 
                        : 'text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-transparent'
                ]"
            >
                {{ page }}
            </button>
            
            <button 
                type="button"
                @click="emitPage(pagination.current_page + 1)"
                :disabled="pagination.current_page === pagination.last_page"
                class="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                title="Halaman Selanjutnya"
            >
                <ChevronRight class="w-4 h-4" />
            </button>
        </div>
    </div>
</template>
