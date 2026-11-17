<script setup>
import RfqQuotationItemEditor from '@/components/purchasing/rfq/RfqQuotationItemEditor.vue'
import { previewPortalQuotationPricing } from '@/services/rfqServices.js'
import { offeredQuotationItems } from '@/utils/quotationPricing.js'

const props = defineProps({
    token: { type: String, required: true },
    currency: { type: String, default: 'IDR' },
    items: {
        type: Array,
        required: true,
    },
})
const preview = payload => previewPortalQuotationPricing(props.token, payload)
</script>

<template>
    <div class="bg-white rounded-2xl border border-[#E5EAF1] shadow-xs overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#EAF2FF] text-[#014BAA] font-bold text-xs flex items-center justify-center">1</span>
                    <h3 class="text-base font-bold text-slate-900">
                        Jumlah & harga barang
                    </h3>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                    Tawarkan barang yang tersedia saja. Nonaktifkan barang yang tidak dapat Anda sediakan; tidak perlu mengisi harga nol.
                </p>
            </div>
            <span class="text-xs font-semibold text-[#014BAA] bg-[#EAF2FF] px-3 py-1 rounded-lg border border-blue-200/80 self-start sm:self-auto">
                {{ offeredQuotationItems(items).length }} dari {{ items.length }} barang ditawarkan
            </span>
        </div>

        <div class="p-4 sm:p-6 space-y-4">
            <RfqQuotationItemEditor v-for="it in items" :key="it.rfq_item_id" :item="it" :preview="preview" :currency="currency" selectable />
        </div>
    </div>
</template>
