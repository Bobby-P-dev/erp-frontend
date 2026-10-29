<script setup>
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<template>
    <footer class="w-full bg-white border-t border-[#E5EAF1] mt-auto">
        <div class="px-4 sm:px-8 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between text-[13px] text-[#667085] w-full mx-auto gap-2 sm:gap-0">
            <div>
                &copy; {{ currentYear }} <strong class="font-semibold text-[#111827]">Padma Soode ERP Sistem</strong> &mdash; PT Padma Soode Indonesia. All rights reserved.
            </div>
            <div class="text-[13px] text-[#667085]">
                <span>PT Padma Soode Indonesia</span>
            </div>
        </div>
    </footer>
</template>