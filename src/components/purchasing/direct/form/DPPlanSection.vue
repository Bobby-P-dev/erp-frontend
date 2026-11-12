<script setup>
import { ref, computed } from 'vue'
import { ShoppingCart, Building2, FileText, AlertCircle, Calendar, Layers, RefreshCw } from '@lucide/vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'

const props = defineProps({
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

const isChangingPlan = ref(false)
const showCompactPlanHeader = computed(() => Boolean(props.selectedPlan && !isChangingPlan.value))
</script>

<template>
    <div class="dp-section bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5">
        <h3 class="text-sm font-semibold text-slate-900 mb-5">Sumber kebutuhan</h3>
        <!-- If Bulk Mode Active Banner -->
        <div v-if="isBulkMode" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-start gap-3.5">
                <div class="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                    <ShoppingCart class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            Fast-Track Multi-PR
                        </span>
                        <span class="text-xs font-semibold text-slate-600">
                            {{ itemsCount }} Item Terpilih
                        </span>
                    </div>
                    <h3 class="text-sm font-bold text-slate-900 mt-1">Konsolidasi Pembelian Lintas PR</h3>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span v-if="bulkCompany" class="inline-flex items-center gap-1">
                            <Building2 class="w-3.5 h-3.5 text-slate-400" />
                            <strong class="text-slate-700">{{ bulkCompany.name }}</strong>
                        </span>
                        <span class="inline-flex items-center gap-1">
                            <FileText class="w-3.5 h-3.5 text-slate-400" />
                            <span>PR: <strong class="text-slate-700 font-mono">{{ uniquePrNumbers.join(', ') || '-' }}</strong></span>
                        </span>
                    </div>
                </div>
            </div>
            <button
                type="button"
                @click="$emit('cancel-bulk-mode')"
                class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
            >
                Ganti ke Mode Reguler
            </button>
        </div>

        <!-- Normal Mode: Compact Context Banner when Plan is already selected (e.g., ?plan_id=10) -->
        <div v-else-if="showCompactPlanHeader" class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div class="flex items-start gap-3.5">
                <div class="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    PP
                </div>
                <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                            {{ selectedPlan.pp_number || selectedPlan.plan_number || `PP #${selectedPlan.id}` }}
                        </span>
                        <span class="text-xs text-slate-400">•</span>
                        <span class="text-xs font-semibold text-slate-700 font-mono">
                            PR: {{ selectedPlan.purchase_requisition?.pr_number || '-' }}
                        </span>
                        <span class="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                            {{ itemsCount }} Item Dialokasikan
                        </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 pt-0.5">
                        <span class="inline-flex items-center gap-1.5">
                            <Building2 class="w-3.5 h-3.5 text-slate-400" />
                            <strong class="text-slate-800">{{ selectedPlan.purchase_requisition?.company?.name || '-' }}</strong>
                        </span>
                        <span class="inline-flex items-center gap-1.5">
                            <Layers class="w-3.5 h-3.5 text-slate-400" />
                            <span>Divisi: <strong class="text-slate-700">{{ selectedPlan.purchase_requisition?.division?.name || '-' }}</strong></span>
                        </span>
                        <span class="inline-flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5 text-amber-500" />
                            <span>Target: <strong class="text-amber-700">{{ selectedPlan.purchase_requisition?.required_date || '-' }}</strong></span>
                        </span>
                    </div>
                </div>
            </div>

            <button
                type="button"
                @click="isChangingPlan = true"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer shrink-0 self-start lg:self-center"
            >
                <RefreshCw class="w-3.5 h-3.5" />
                <span>Ganti Rencana</span>
            </button>
        </div>

        <!-- Selector Mode (When no plan selected yet OR user clicked 'Ganti Rencana') -->
        <div v-else class="space-y-3">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                    <span class="w-6 h-6 rounded-md bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">1</span>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Pilih Rencana Pengadaan (Procurement Plan)</h3>
                    </div>
                </div>
                <button
                    v-if="selectedPlan"
                    type="button"
                    @click="isChangingPlan = false"
                    class="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                    Selesai Pilih
                </button>
            </div>

            <div>
                <SearchableSelect
                    :model-value="selectedPlanId"
                    @update:model-value="(val) => $emit('update:selectedPlanId', val)"
                    label="Nomor Rencana Pengadaan Aktif"
                    :options="planOptions"
                    placeholder="-- Cari atau Pilih Rencana Pengadaan Aktif --"
                    searchPlaceholder="Ketik nomor PP, nomor PR, atau nama divisi..."
                    required
                    :disabled="isLoadingPlans"
                    :loading="isLoadingPlans"
                    @change="() => { isChangingPlan = false; $emit('plan-selected') }"
                />

                <p v-if="activePlans.length === 0 && !isLoadingPlans" class="text-xs text-amber-700 font-medium mt-2 flex items-center gap-1.5 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <AlertCircle class="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Tidak ada Rencana Pengadaan Direct Purchase yang aktif saat ini. Buat dan aktifkan rencana pengadaan terlebih dahulu.</span>
                </p>
            </div>
        </div>
    </div>
</template>
