<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Save, Send, Info } from '@lucide/vue'

import BaseBreadcrumb from '@/components/ui/BaseBreadcrumb.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useDirectPurchaseForm } from '@/composables/purchasing/useDirectPurchaseForm.js'

import DPChannelSection from '@/components/purchasing/direct/form/DPChannelSection.vue'
import DPItemsTableSection from '@/components/purchasing/direct/form/DPItemsTableSection.vue'
import DPPaymentInfoSection from '@/components/purchasing/direct/form/DPPaymentInfoSection.vue'
import DPCostSummarySection from '@/components/purchasing/direct/form/DPCostSummarySection.vue'

const {
    route,
    isLoading,
    isLoadingSuppliers,
    isSubmitting,
    dpData,
    selectedPlan,
    selectedExtraPlanItemId,
    form,
    taxesList,
    currenciesList,
    popularMarketplaces,
    popularBanks,

    // Computeds
    itemsSubtotal,
    grandTotal,
    equivalentIdrGrandTotal,
    supplierOptions,
    selectedTaxName,
    selectedTaxRate,
    extraPlanItemOptions,

    // Actions
    fetchCurrenciesList,
    onTaxChange,
    loadEditDirectPurchase,
    handleAddPlanItem,
    handleRemoveItem,
    handleUpdateSubmit,
} = useDirectPurchaseForm()

const dpId = route.params.id

onMounted(() => {
    fetchCurrenciesList()
    loadEditDirectPurchase(dpId)
})
</script>

<template>
    <div class="space-y-5 w-full pb-16">
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Direct Purchases', to: { name: 'user.purchasing.direct' } },
                { label: dpData?.dp_number || 'Detail', to: { name: 'user.purchasing.direct.detail', params: { id: dpId } } },
                { label: 'Edit Draft' }
            ]" 
        />

        <!-- Loading Skeleton -->
        <div v-if="isLoading" class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center space-y-3">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p class="text-sm font-semibold text-slate-600">Memuat data draft transaksi...</p>
        </div>

        <template v-else>
            <!-- Page Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div class="flex items-center gap-3.5">
                    <RouterLink 
                        :to="{ name: 'user.purchasing.direct.detail', params: { id: dpId } }" 
                        class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft class="w-4 h-4" />
                    </RouterLink>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-lg font-bold text-slate-900 tracking-tight">Edit Draft Direct Purchase</h2>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Draft
                            </span>
                        </div>
                        <p class="text-xs text-slate-500 font-mono mt-0.5">
                            {{ dpData?.dp_number }} • Rencana: {{ selectedPlan?.pp_number || '-' }}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2.5">
                    <button 
                        type="button" 
                        @click="handleUpdateSubmit(dpId, false)"
                        :disabled="isSubmitting || form.items.length === 0"
                        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Save class="w-3.5 h-3.5 text-slate-500" />
                        <span>Simpan Perubahan</span>
                    </button>

                    <button 
                        type="button" 
                        @click="handleUpdateSubmit(dpId, true)"
                        :disabled="isSubmitting || form.items.length === 0"
                        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Send class="w-3.5 h-3.5" />
                        <span>Simpan & Ajukan Pembayaran</span>
                    </button>
                </div>
            </div>

            <!-- Context Banner -->
            <div class="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3">
                <Info class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div class="text-xs text-blue-900 leading-relaxed">
                    <span class="font-bold">Mode Penyuntingan Draft:</span> Anda sedang mengubah rincian barang, harga aktual, saluran pembelian, atau instruksi pembayaran. Kuantitas maksimum yang tersedia telah dihitung dengan mengecualikan alokasi draft ini dari rencana pengadaan.
                </div>
            </div>

            <form @submit.prevent="handleUpdateSubmit(dpId, false)" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <!-- Left Column: Plan Readonly Summary, Channel & Items -->
                <div class="lg:col-span-8 space-y-5">
                    <!-- Readonly Plan Context -->
                    <div class="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
                        <div>
                            <h3 class="text-sm font-bold text-slate-900">Rencana Pengadaan Terkait (Procurement Plan)</h3>
                            <p class="text-xs text-slate-500">Rencana pengadaan yang menjadi dasar alokasi pengadaan langsung ini.</p>
                        </div>
                        <div class="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                                <span class="text-slate-400 font-medium block">Nomor PP</span>
                                <span class="font-bold font-mono text-slate-900">{{ selectedPlan?.pp_number || '-' }}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 font-medium block">Nomor PR</span>
                                <span class="font-bold font-mono text-slate-900">{{ selectedPlan?.purchase_requisition?.pr_number || '-' }}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 font-medium block">Perusahaan</span>
                                <span class="font-semibold text-slate-800">{{ selectedPlan?.purchase_requisition?.company?.name || '-' }}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 font-medium block">Divisi</span>
                                <span class="font-semibold text-slate-800">{{ selectedPlan?.purchase_requisition?.division?.name || '-' }}</span>
                            </div>
                        </div>
                    </div>

                    <DPChannelSection
                        :form="form"
                        :popular-marketplaces="popularMarketplaces"
                        :supplier-options="supplierOptions"
                        :is-loading-suppliers="isLoadingSuppliers"
                    />

                    <DPItemsTableSection
                        :form="form"
                        :allow-remove-item="true"
                        :extra-plan-item-options="extraPlanItemOptions"
                        v-model:selectedExtraPlanItemId="selectedExtraPlanItemId"
                        @remove-item="handleRemoveItem"
                        @add-plan-item="handleAddPlanItem"
                    />
                </div>

                <!-- Right Column: Payment Info & Cost Summary -->
                <div class="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
                    <DPPaymentInfoSection
                        :form="form"
                        :popular-banks="popularBanks"
                    />

                    <DPCostSummarySection
                        :form="form"
                        :currencies-list="currenciesList"
                        :taxes-list="taxesList"
                        :selected-tax-rate="selectedTaxRate"
                        :selected-tax-name="selectedTaxName"
                        :items-subtotal="itemsSubtotal"
                        :grand-total="grandTotal"
                        :equivalent-idr-grand-total="equivalentIdrGrandTotal"
                        @tax-change="onTaxChange"
                    />

                    <div class="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 space-y-2.5">
                        <button 
                            type="button" 
                            @click="handleUpdateSubmit(dpId, true)"
                            :disabled="isSubmitting || form.items.length === 0"
                            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Send class="w-3.5 h-3.5" />
                            <span>Simpan & Ajukan Pembayaran</span>
                        </button>

                        <div class="grid grid-cols-2 gap-2">
                            <button 
                                type="button" 
                                @click="handleUpdateSubmit(dpId, false)"
                                :disabled="isSubmitting || form.items.length === 0"
                                class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Save class="w-3.5 h-3.5 text-slate-500" />
                                <span>Simpan Draft</span>
                            </button>

                            <RouterLink 
                                :to="{ name: 'user.purchasing.direct.detail', params: { id: dpId } }"
                                class="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors"
                            >
                                Batal
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </form>
        </template>
    </div>
</template>
