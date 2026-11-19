<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Save, Send, ShoppingCart, TriangleAlert } from '@lucide/vue'

import BaseBreadcrumb from '@/components/ui/BaseBreadcrumb.vue'
import { useDirectPurchaseForm } from '@/composables/purchasing/useDirectPurchaseForm.js'

import DPPlanSection from '@/components/purchasing/direct/form/DPPlanSection.vue'
import DPChannelSection from '@/components/purchasing/direct/form/DPChannelSection.vue'
import DPItemsTableSection from '@/components/purchasing/direct/form/DPItemsTableSection.vue'
import DPPaymentInfoSection from '@/components/purchasing/direct/form/DPPaymentInfoSection.vue'
import DPCostSummarySection from '@/components/purchasing/direct/form/DPCostSummarySection.vue'

const {
    route,
    isLoadingPlans,
    isLoadingSuppliers,
    isSubmitting,
    isBulkMode,
    bulkCompany,
    activePlans,
    selectedPlan,
    selectedPlanId,
    formErrorSummary,
    form,
    taxesList,
    currenciesList,
    popularMarketplaces,
    popularBanks,

    // Computeds
    itemsSubtotal,
    grandTotal,
    equivalentIdrGrandTotal,
    planOptions,
    hasExhaustedItems,
    isPlanFullyExhausted,
    uniquePrNumbers,
    supplierOptions,
    selectedTaxName,
    selectedTaxRate,

    // Actions
    fetchActivePlans,
    fetchSuppliers,
    fetchCurrenciesList,
    fetchTaxesList,
    onPlanSelected,
    onTaxChange,
    removeBulkItem,
    cancelBulkMode,
    handleSubmit,
} = useDirectPurchaseForm()

onMounted(() => {
    fetchSuppliers()
    fetchCurrenciesList()
    fetchTaxesList()

    if (route.query.bulk === '1') {
        const rawItems = sessionStorage.getItem('bulk_direct_purchase_items')
        const rawCompany = sessionStorage.getItem('bulk_direct_purchase_company')
        if (rawItems) {
            try {
                const items = JSON.parse(rawItems)
                if (Array.isArray(items) && items.length > 0) {
                    isBulkMode.value = true
                    bulkCompany.value = rawCompany ? JSON.parse(rawCompany) : null
                    form.value.items = items.map(item => {
                        const estPrice = Number(item.estimated_price) || 0
                        const remQty = Number(item.remaining_quantity ?? item.requested_quantity ?? 0)
                        return {
                            purchase_requisition_item_id: item.purchase_requisition_item_id || item.id,
                            pr_id: item.pr_id,
                            pr_number: item.pr_number,
                            item_id: item.item_id || null,
                            unit_id: item.unit_id || item.unit?.id || null,
                            item_name: item.item_name || item.name || 'Item Pengadaan',
                            detail_name: item.detail_name || '',
                            item_code: item.item_code || item.item?.code || '',
                            is_custom_item: item.is_custom_item || !item.item_id,
                            unit_name: item.unit?.code || item.unit_code || item.unit_name || 'Unit',
                            planned_qty: remQty,
                            allocated_qty: remQty,
                            quantity: remQty > 0 ? remQty : 0,
                            unit_price: estPrice > 0 ? estPrice : '',
                            discount_amount: 0,
                            product_url: item.reference_url || item.product_url || '',
                            notes: item.notes || '',
                            error: remQty <= 0 ? 'Sisa kuota item ini sudah habis (0.0000)' : ''
                        }
                    })
                    return
                }
            } catch (err) {
                console.error('Failed to parse bulk items:', err)
            }
        }
    }

    fetchActivePlans()
})
</script>

<template>
    <div class="space-y-5 w-full min-w-0 pb-16">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Direct Purchases', to: { name: 'user.purchasing.direct' } },
                { label: 'Buat Pembelian Langsung' }
            ]" 
        />

        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div class="flex items-center gap-3.5">
                <span class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                    <ShoppingCart class="w-5 h-5" />
                </span>
                <div>
                    <h1 class="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Buat Pembelian Langsung</h1>
                    <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Lengkapi saluran toko, rincian barang, dan tujuan pembayaran transaksi.
                    </p>
                </div>
            </div>

            <RouterLink 
                :to="{ name: 'user.purchasing.direct', query: { tab: 'queue' } }"
                class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shrink-0"
            >
                <ShoppingCart class="w-3.5 h-3.5 text-blue-600" />
                <span>Lihat Antrean Rencana</span>
            </RouterLink>
        </div>

        <div
            v-if="formErrorSummary"
            id="dp-validation-summary"
            role="alert"
            class="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-900"
        >
            <span class="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <TriangleAlert class="w-4 h-4" />
            </span>
            <div>
                <p class="text-sm font-semibold">Periksa isian transaksi</p>
                <p class="text-xs text-rose-700 mt-0.5">{{ formErrorSummary }}</p>
            </div>
        </div>

        <form @submit.prevent="handleSubmit(false)" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <!-- Left Column: Plan Source, Channel & Items -->
            <div class="lg:col-span-8 space-y-5 min-w-0">
                <DPPlanSection
                    :is-bulk-mode="isBulkMode"
                    :bulk-company="bulkCompany"
                    :unique-pr-numbers="uniquePrNumbers"
                    v-model:selected-plan-id="selectedPlanId"
                    :selected-plan="selectedPlan"
                    :plan-options="planOptions"
                    :active-plans="activePlans"
                    :is-loading-plans="isLoadingPlans"
                    :items-count="form.items.length"
                    @plan-selected="onPlanSelected"
                    @cancel-bulk-mode="cancelBulkMode"
                />

                <DPChannelSection
                    :form="form"
                    :popular-marketplaces="popularMarketplaces"
                    :supplier-options="supplierOptions"
                    :is-loading-suppliers="isLoadingSuppliers"
                />

                <DPItemsTableSection
                    :form="form"
                    :is-bulk-mode="isBulkMode"
                    :is-plan-fully-exhausted="isPlanFullyExhausted"
                    :has-exhausted-items="hasExhaustedItems"
                    @remove-bulk-item="removeBulkItem"
                />
            </div>

            <!-- Right Column: Payment Info, Cost Summary & Actions -->
            <div class="lg:col-span-4 space-y-5 lg:sticky lg:top-6 min-w-0">
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

                <!-- Action Buttons Card -->
                <div class="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 space-y-2.5">
                    <button 
                        type="button" 
                        @click="handleSubmit(true)"
                        :disabled="isSubmitting || isLoadingPlans || form.items.length === 0"
                        class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Send class="w-3.5 h-3.5" />
                        <span>{{ isSubmitting ? 'Menyimpan…' : 'Simpan & Ajukan Pembayaran' }}</span>
                    </button>

                    <div class="grid grid-cols-2 gap-2">
                        <button 
                            type="button" 
                            @click="handleSubmit(false)"
                            :disabled="isSubmitting || isLoadingPlans || form.items.length === 0"
                            class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Save class="w-3.5 h-3.5 text-slate-500" />
                            <span>Simpan Draft</span>
                        </button>

                        <RouterLink 
                            :to="{ name: 'user.purchasing.direct' }"
                            class="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors"
                        >
                            Batal
                        </RouterLink>
                    </div>

                    <p class="text-[11px] text-slate-500 text-center pt-1">
                        Draft dapat dilengkapi kembali sebelum diajukan ke Finance.
                    </p>
                </div>
            </div>
        </form>
    </div>
</template>
