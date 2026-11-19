<script setup>
import { Loader2 } from '@lucide/vue'
import { useAppLoader } from '@/composables/useAppLoader.js'

const { isAppLoading, showRoutePill, routeLoadingLabel } = useAppLoader()
</script>

<template>
  <div class="fixed top-0 inset-x-0 z-[200] pointer-events-none" aria-live="polite" aria-atomic="true">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      leave-active-class="transition-opacity duration-200 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isAppLoading"
        class="h-[3px] w-full overflow-hidden bg-blue-100/80"
        role="progressbar"
        aria-label="Memuat halaman atau data"
      >
        <div class="erp-top-progress h-full w-2/5 rounded-full bg-gradient-to-r from-[#014BAA] via-sky-500 to-[#014BAA]" />
      </div>
    </Transition>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      leave-active-class="transition duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      leave-to-class="opacity-0 -translate-y-2 scale-95"
    >
      <div
        v-if="showRoutePill"
        class="fixed top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg"
      >
        <Loader2 class="h-3.5 w-3.5 shrink-0 animate-spin text-sky-400" />
        <span>{{ routeLoadingLabel }}</span>
      </div>
    </Transition>
  </div>
</template>
