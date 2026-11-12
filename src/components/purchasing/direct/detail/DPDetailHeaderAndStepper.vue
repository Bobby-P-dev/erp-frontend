<script setup>
import { RouterLink } from 'vue-router'
import StatusBadge from '../../../ui/StatusBadge.vue'
import {
    ShoppingCart,
    Store,
    Building2,
    CreditCard,
    Ban,
    Truck,
    Pencil
} from '@lucide/vue'

defineProps({
    dp: { type: Object, required: true },
    formatDate: { type: Function, required: true }
})

const emit = defineEmits([
    'open-submit',
    'open-grn',
    'cancel'
])
</script>

<template>
    <div class="space-y-3">
        <!-- Header Section -->
        <div class="bg-slate-50/70 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="space-y-2">
                <div class="flex items-center gap-3 flex-wrap">
                    <h2 class="text-xl font-semibold text-slate-900 tracking-tight">{{ dp.dp_number }}</h2>

                    <!-- Status Badge -->
                    <StatusBadge :status="dp.status" size="md" />

                    <!-- Channel Badge -->
                    <span 
                        v-if="dp.purchase_channel === 'marketplace'"
                        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200"
                    >
                        <Store class="w-3.5 h-3.5" />
                        {{ dp.marketplace_name || 'Marketplace' }}
                    </span>
                    <span 
                        v-else-if="dp.purchase_channel === 'direct_supplier'"
                        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
                    >
                        <Building2 class="w-3.5 h-3.5" />
                        Supplier Resmi
                    </span>
                    <span 
                        v-else-if="dp.purchase_channel === 'retail_store'"
                        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                        <ShoppingCart class="w-3.5 h-3.5" />
                        Toko Retail
                    </span>
                </div>

                <p class="text-xs text-slate-500">
                    Dibuat pada {{ formatDate(dp.created_at) }} oleh 
                    <strong class="text-slate-700 font-semibold">{{ dp.created_by_user?.name || 'Staff Purchasing' }}</strong>
                </p>
            </div>

            <!-- Header Actions -->
            <div class="flex items-center gap-2.5 flex-wrap">
                <!-- Action: Edit Draft (Draft only) -->
                <RouterLink 
                    v-if="dp.status === 'draft'"
                    :to="{ name: 'user.purchasing.direct.edit', params: { id: dp.id } }"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-all"
                >
                    <Pencil class="w-4 h-4" />
                    <span>Edit Draft</span>
                </RouterLink>

                <!-- Action: Submit for Payment (Draft only) -->
                <button 
                    v-if="dp.status === 'draft'"
                    @click="emit('open-submit')"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
                >
                    <CreditCard class="w-4 h-4" />
                    <span>Ajukan Pembayaran</span>
                </button>

                <!-- Action: Record Goods Receipt (If paid or partially received) -->
                <button 
                    v-if="['paid', 'partially_received'].includes(dp.status)"
                    @click="emit('open-grn')"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
                >
                    <Truck class="w-4 h-4" />
                    <span>Catat penerimaan</span>
                </button>

                <!-- Action: Cancel (Draft & Ready for payment only) -->
                <button 
                    v-if="['draft', 'ready_for_payment'].includes(dp.status)"
                    @click="emit('cancel')"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-2xs transition-all cursor-pointer"
                >
                    <Ban class="w-4 h-4" />
                    <span>Batalkan Pembelian</span>
                </button>
            </div>
        </div>
        <p v-if="dp.status === 'ready_for_payment'" class="flex items-start gap-2 rounded-xl bg-blue-50/70 px-4 py-3 text-sm text-slate-600">
            <CreditCard class="mt-0.5 size-4 shrink-0 text-blue-600" />
            <span>Pengajuan pembayaran sudah diteruskan. Pencairan diproses oleh tim Finance melalui modul Finance.</span>
        </p>
    </div>
</template>
