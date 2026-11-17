<script setup>
import { computed } from 'vue'
import { Info } from '@lucide/vue'
import { rfqPurchaseBlockReason } from '@/utils/rfqSource.js'
const props = defineProps({ rfq: { type: Object, default: null } })
const reason = computed(() => rfqPurchaseBlockReason(props.rfq))
</script>

<template>
    <div v-if="reason" role="status" class="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
        <Info class="mt-0.5 size-5 shrink-0 text-blue-700" />
        <div class="text-sm leading-relaxed text-blue-950">
            <p class="font-semibold">Permintaan harga sebelum PR</p>
            <p class="mt-1">{{ reason }}</p>
            <p class="mt-2 text-blue-800">Pilih penawaran dan buat draft PR melalui Perbandingan penawaran. Periksa dan ajukan persetujuan dari daftar PR.</p>
        </div>
    </div>
</template>
