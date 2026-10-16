<script setup>
import { ShoppingCart, Building2, FileText, AlertCircle } from '@lucide/vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'

defineProps({
    isBulkMode: {
        type: Boolean,
        default: false,
    },
    bulkCompany: {
        type: Object,
        default: null,
    },
    uniquePrNumbers: {
        type: Array,
        default: () => [],
    },
    selectedPlanId: {
        type: [String, Number],
        default: '',
    },
    selectedPlan: {
        type: Object,
        default: null,
    },
    planOptions: {
        type: Array,
        required: true,
    },
    activePlans: {
        type: Array,
        required: true,
    },
    isLoadingPlans: {
        type: Boolean,
        default: false,
    },
    itemsCount: {
        type: Number,
        default: 0,
    },
})

defineEmits(['update:selectedPlanId', 'plan-selected', 'cancel-bulk-mode'])
</script>

<template>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                1
            </div>
            <div>
                <h3 class="text-base font-bold text-gray-900">
                    {{ isBulkMode ? 'Konsolidasi Pembelian (Fast-Track Multi-PR)' : 'Pilih Rencana Pengadaan (Procurement Plan)' }}
                </h3>
                <p class="text-xs text-gray-500">
                    {{ isBulkMode ? 'Mode cepat: Menggabungkan beberapa PR sekaligus dalam 1 transaksi Direct Purchase.' : 'Pilih rencana pengadaan bertipe Direct Purchase yang sedang berstatus Aktif.' }}
                </p>
            </div>
        </div>

        <!-- If Bulk Mode Active Banner -->
        <div v-if="isBulkMode" class="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md relative overflow-hidden">
            <div class="flex items-start justify-between relative z-10 gap-4">
                <div class="flex items-start gap-3.5">
                    <div class="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-white shrink-0">
                        <ShoppingCart class="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                                ⚡ Fast-Track Bulk Direct Purchase
                            </span>
                            <span class="text-xs font-semibold text-blue-200">
                                {{ itemsCount }} Item Terpilih
                            </span>
                        </div>
                        <h4 class="text-base font-bold text-white mt-1">Pembelian Sekaligus Lintas PR</h4>
                        <p class="text-xs text-blue-200/80 mt-0.5 leading-relaxed">
                            Rencana pengadaan konsolidasi akan otomatis dibentuk di background. Transaksi ini akan menghasilkan 1 Payment Request di Finance sehingga kasir cukup mentransfer 1 kali.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    @click="$emit('cancel-bulk-mode')"
                    class="text-xs text-slate-300 hover:text-white underline cursor-pointer shrink-0"
                >
                    Batal Mode Bulk
                </button>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <div v-if="bulkCompany" class="flex items-center gap-1.5">
                    <Building2 class="w-3.5 h-3.5 text-blue-400" />
                    <span class="text-slate-400">Perusahaan:</span>
                    <strong class="text-white">{{ bulkCompany.name }}</strong>
                </div>
                <div class="flex items-center gap-1.5">
                    <FileText class="w-3.5 h-3.5 text-blue-400" />
                    <span class="text-slate-400">Dokumen PR Terlibat:</span>
                    <strong class="text-white">{{ uniquePrNumbers.join(', ') || '-' }}</strong>
                </div>
            </div>
        </div>

        <!-- If Normal Mode: SearchableSelect -->
        <template v-else>
            <div>
                <SearchableSelect
                    :model-value="selectedPlanId"
                    @update:model-value="(val) => $emit('update:selectedPlanId', val)"
                    label="Nomor Rencana Pengadaan"
                    :options="planOptions"
                    placeholder="-- Cari atau Pilih Rencana Pengadaan Aktif --"
                    searchPlaceholder="Ketik nomor PP, nomor PR, atau nama divisi..."
                    required
                    :disabled="isLoadingPlans"
                    :loading="isLoadingPlans"
                    @change="$emit('plan-selected')"
                />

                <p v-if="activePlans.length === 0 && !isLoadingPlans" class="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                    <AlertCircle class="w-4 h-4 shrink-0" />
                    <span>Tidak ada Rencana Pengadaan Direct Purchase yang aktif saat ini. Buat dan aktifkan rencana pengadaan terlebih dahulu.</span>
                </p>
            </div>

            <!-- Preview Selected Plan Info -->
            <div v-if="selectedPlan" class="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                    <span class="text-gray-400 font-medium block">Nomor PR:</span>
                    <span class="font-bold text-gray-900">{{ selectedPlan.purchase_requisition?.pr_number || '-' }}</span>
                </div>
                <div>
                    <span class="text-gray-400 font-medium block">Perusahaan:</span>
                    <span class="font-semibold text-gray-800">{{ selectedPlan.purchase_requisition?.company?.name || '-' }}</span>
                </div>
                <div>
                    <span class="text-gray-400 font-medium block">Divisi:</span>
                    <span class="font-semibold text-gray-800">{{ selectedPlan.purchase_requisition?.division?.name || '-' }}</span>
                </div>
                <div>
                    <span class="text-gray-400 font-medium block">Target Kebutuhan:</span>
                    <span class="font-bold text-amber-700">{{ selectedPlan.purchase_requisition?.required_date || '-' }}</span>
                </div>
            </div>
        </template>
    </div>
</template>
