<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Save, Send, ShoppingCart } from '@lucide/vue'

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
    <div class="space-y-6 w-full pb-16">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Direct Purchases', to: { name: 'user.purchasing.direct' } },
                { label: 'Buat Transaksi' }
            ]" 
        />

        <!-- Page Header -->
        <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
                <RouterLink :to="{ name: 'user.purchasing.direct' }" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft class="w-6 h-6" />
                </RouterLink>
                <div>
                    <h2 class="text-2xl font-bold text-slate-900">Buat Transaksi Direct Purchase</h2>
                    <p class="text-xs text-slate-500 mt-1">
                        Eksekusi pembelian barang langsung untuk rencana pengadaan yang telah disetujui.
                    </p>
                </div>
            </div>

            <RouterLink 
                :to="{ name: 'user.purchasing.direct', query: { tab: 'queue' } }"
                class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 shadow-2xs transition-all cursor-pointer"
            >
                <ShoppingCart class="w-4 h-4 text-blue-600" />
                <span>Pilih dari Antrean Rencana Siap Eksekusi</span>
            </RouterLink>
        </div>

        <form @submit.prevent="handleSubmit(false)" class="space-y-5">
            <!-- CONTEXT HEADER: Rencana Pengadaan / Bulk Mode -->
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

            <!-- TWO-COLUMN WORKSPACE: Left (Channel & Items) | Right Sticky (Payment & Cost Summary) -->
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                <!-- LEFT MAIN WORKSPACE (8 Cols) -->
                <div class="xl:col-span-8 space-y-5">
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

                <!-- RIGHT STICKY SIDEBAR (4 Cols): Finance, Cost Summary & Actions -->
                <div class="xl:col-span-4 space-y-5 xl:sticky xl:top-6">
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
                            :disabled="isSubmitting || form.items.length === 0"
                            class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Send class="w-4 h-4" />
                            <span>Simpan & Ajukan Pembayaran</span>
                        </button>

                        <div class="grid grid-cols-2 gap-2">
                            <button 
                                type="button" 
                                @click="handleSubmit(false)"
                                :disabled="isSubmitting || form.items.length === 0"
                                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <Save class="w-3.5 h-3.5 text-slate-500" />
                                <span>Simpan Draft</span>
                            </button>

                            <RouterLink
                                :to="{ name: 'user.purchasing.direct' }"
                                class="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent transition-colors"
                            >
                                Batal
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
