<script setup>
import { RouterLink } from 'vue-router'
import StatusBadge from '../../../ui/StatusBadge.vue'
import {
    ChevronRight,
    ArrowLeft,
    ShoppingCart,
    Store,
    Building2,
    CreditCard,
    Ban,
    Truck,
    Coins,
    Pencil
} from '@lucide/vue'

defineProps({
    dp: { type: Object, required: true },
    formatDate: { type: Function, required: true }
})

const emit = defineEmits([
    'open-submit',
    'open-disburse',
    'open-grn',
    'cancel'
])
</script>

<template>
    <div class="space-y-6">
        <!-- Header Section -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="space-y-2">
                <div class="flex items-center gap-3 flex-wrap">
                    <RouterLink :to="{ name: 'user.purchasing.direct' }" class="text-slate-400 hover:text-slate-600">
                        <ArrowLeft class="w-5 h-5" />
                    </RouterLink>
                    <h2 class="text-2xl font-bold text-slate-900 font-mono">{{ dp.dp_number }}</h2>

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
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all"
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

                <!-- Action: Disburse Payment (If payment request approved & not yet paid) -->
                <button 
                    v-if="dp.payment_request?.status === 'approved' && ['draft', 'ready_for_payment'].includes(dp.status)"
                    @click="emit('open-disburse')"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                >
                    <Coins class="w-4 h-4" />
                    <span>Cairkan Pembayaran (Finance)</span>
                </button>

                <!-- Action: Record Goods Receipt (If paid or partially received) -->
                <button 
                    v-if="['paid', 'partially_received'].includes(dp.status)"
                    @click="emit('open-grn')"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
                >
                    <Truck class="w-4 h-4" />
                    <span>Catat Penerimaan Barang (GRN)</span>
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

        <!-- Lifecycle Progress Stepper Bar -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4">
            <div class="flex items-center justify-between text-xs font-semibold overflow-x-auto gap-4 py-1">
                <!-- Step 1: PR Approved -->
                <div class="flex items-center gap-2 min-w-max text-emerald-700">
                    <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-800">1</span>
                    <span>PR Disetujui</span>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 2: Procurement Plan -->
                <div class="flex items-center gap-2 min-w-max text-emerald-700">
                    <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-800">2</span>
                    <span>Procurement Plan</span>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 3: Direct Purchase Order -->
                <div 
                    class="flex items-center gap-2 min-w-max"
                    :class="dp.status !== 'draft' ? 'text-emerald-700' : 'text-blue-700'"
                >
                    <span 
                        class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                        :class="dp.status !== 'draft' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'"
                    >3</span>
                    <span>Direct Purchase</span>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 4: Tagihan Siap Cair -->
                <div 
                    class="flex items-center gap-2 min-w-max"
                    :class="dp.payment_request?.status === 'approved' || ['paid', 'partially_received', 'completed'].includes(dp.status) ? 'text-emerald-700' : (dp.status === 'ready_for_payment' ? 'text-blue-700' : 'text-gray-400')"
                >
                    <span 
                        class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                        :class="dp.payment_request?.status === 'approved' || ['paid', 'partially_received', 'completed'].includes(dp.status) ? 'bg-emerald-100 text-emerald-800' : (dp.status === 'ready_for_payment' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500')"
                    >4</span>
                    <span>Tagihan Siap Cair</span>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 5: Payment Disbursement -->
                <div 
                    class="flex items-center gap-2 min-w-max"
                    :class="['paid', 'partially_received', 'completed'].includes(dp.status) ? 'text-emerald-700' : 'text-gray-400'"
                >
                    <span 
                        class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                        :class="['paid', 'partially_received', 'completed'].includes(dp.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'"
                    >5</span>
                    <span>Pembayaran (Paid)</span>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 6: Goods Receipt -->
                <div 
                    class="flex items-center gap-2 min-w-max"
                    :class="['partially_received', 'completed'].includes(dp.status) ? 'text-emerald-700' : 'text-gray-400'"
                >
                    <span 
                        class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                        :class="['partially_received', 'completed'].includes(dp.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'"
                    >6</span>
                    <span>Penerimaan Barang</span>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 7: Completed -->
                <div 
                    class="flex items-center gap-2 min-w-max"
                    :class="dp.status === 'completed' ? 'text-emerald-800 font-bold' : 'text-gray-400'"
                >
                    <span 
                        class="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                        :class="dp.status === 'completed' ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100 text-gray-500'"
                    >7</span>
                    <span>Selesai</span>
                </div>
            </div>
        </div>
    </div>
</template>
