<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Save, Send, ShoppingCart } from '@lucide/vue'

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
    <div class="dp-create space-y-6 w-full min-w-0 pb-8">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Pembelian langsung', to: { name: 'user.purchasing.direct' } },
                { label: 'Buat pembelian' }
            ]" 
        />

        <!-- Page Header -->
        <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
                <div>
                    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Buat pembelian langsung</h1>
                    <p class="text-sm text-slate-500 mt-2 leading-relaxed">
                        Lengkapi toko, barang, dan tujuan pembayaran. Anda bisa menyimpannya sebagai draft terlebih dahulu.
                    </p>
                </div>
            </div>

            <RouterLink 
                :to="{ name: 'user.purchasing.direct', query: { tab: 'queue' } }"
                class="dp-action dp-cancel"
            >
                <ShoppingCart class="w-4 h-4 text-blue-600" />
                <span>Lihat antrean rencana</span>
            </RouterLink>
        </div>

        <form @submit.prevent="handleSubmit(false)" class="dp-form w-full min-w-0 space-y-6">
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

            <div class="space-y-6">
                <div class="space-y-6">
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

                <div class="space-y-6">
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
                    <div class="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p class="text-xs text-slate-500">Draft dapat dilengkapi sebelum diajukan ke Finance.</p>
                        <div class="dp-actions">
                            <RouterLink :to="{ name: 'user.purchasing.direct' }" class="dp-action dp-cancel">Batal</RouterLink>
                        <button 
                            type="button" 
                            @click="handleSubmit(true)"
                            :disabled="isSubmitting || isLoadingPlans || form.items.length === 0"
                            class="dp-action dp-primary order-3"
                        >
                            <Send class="w-4 h-4" />
                            <span>{{ isSubmitting ? 'Menyimpan…' : 'Simpan & ajukan pembayaran' }}</span>
                        </button>

                            <button 
                                type="button" 
                                @click="handleSubmit(false)"
                                :disabled="isSubmitting || isLoadingPlans || form.items.length === 0"
                                class="dp-action dp-draft order-2"
                            >
                                <Save class="w-3.5 h-3.5 text-slate-500" />
                                <span>Simpan draft</span>
                            </button>

                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>

<style scoped>
.dp-create :deep(.dp-section) { border-radius: 16px; padding: 28px; box-shadow: none; min-width: 0; }
.dp-create :deep(.dp-section h3) { font-size: 16px; font-weight: 600; letter-spacing: -.015em; }
.dp-create :deep(.dp-section input:not([type=radio])), .dp-create :deep(.dp-section select), .dp-create :deep(.dp-section textarea) { min-height: 42px; font-size: 14px; font-weight: 400; }
.dp-create :deep(.dp-section input), .dp-create :deep(.dp-section select), .dp-create :deep(.dp-section textarea) { max-width: 100%; }
.dp-create :deep(.dp-section label) { font-weight: 500; }
.dp-create :deep(button:focus-visible), .dp-create :deep(a:focus-visible) { outline: 2px solid #014baa; outline-offset: 3px; }
.dp-action { display: inline-flex; justify-content: center; align-items: center; gap: 8px; padding: 11px 16px; border: 1px solid; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; }
.dp-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.dp-cancel { color: #475569; background: white; border-color: #cbd5e1; }
.dp-draft { color: #014baa; background: white; border-color: #b5cbea; }
.dp-primary { color: white; background: #014baa; border-color: #014baa; }
.dp-primary:hover { background: #003d8c; }
.dp-cancel:hover, .dp-draft:hover { background: #f8fafc; }
.dp-action:disabled { opacity: .5; cursor: not-allowed; }
@media(max-width: 640px) { .dp-create :deep(.dp-section) { padding: 20px 16px; } .dp-actions, .dp-action { width: 100%; } }
</style>
