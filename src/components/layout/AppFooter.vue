<script setup>
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<template>
    <footer class="w-full bg-white border-t border-gray-100 mt-auto">
        <div class="px-6 py-5 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-400 w-full mx-auto transition-all">
            <div class="font-medium">
                &copy; {{ currentYear }} ERP System. All rights reserved.
            </div>
            <div class="mt-3 sm:mt-0 flex gap-6">
                <a href="#" class="hover:text-indigo-600 transition-colors duration-200">Privacy</a>
                <a href="#" class="hover:text-indigo-600 transition-colors duration-200">Terms</a>
            </div>
        </div>
    </footer>
</template>