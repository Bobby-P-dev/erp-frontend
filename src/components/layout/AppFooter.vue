<script setup>
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<template>
    <footer class="w-full bg-white border-t border-slate-200/80 mt-auto">
        <div class="px-6 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between text-sm sm:text-base text-slate-600 w-full mx-auto transition-all gap-3 sm:gap-0">
            <div class="font-medium text-slate-600">
                &copy; {{ currentYear }} <strong class="font-bold text-slate-800">Padma Soode ERP Sistem</strong> &mdash; PT Padma Soode Indonesia. All rights reserved.
            </div>
            <div class="flex gap-6 text-sm text-slate-500">
                <span class="hover:text-blue-600 transition-colors duration-200">PT Padma Soode Indonesia</span>
            </div>
        </div>
    </footer>
</template>