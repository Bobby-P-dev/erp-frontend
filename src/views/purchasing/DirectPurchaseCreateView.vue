<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Save, Send } from '@lucide/vue'

import BaseBreadcrumb from '@/components/ui/BaseBreadcrumb.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
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
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <RouterLink :to="{ name: 'user.purchasing.direct' }" class="text-gray-400 hover:text-gray-600">
                    <ArrowLeft class="w-6 h-6" />
                </RouterLink>
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">Buat Transaksi Direct Purchase</h2>
                    <p class="text-xs text-gray-500 mt-1">
                        Eksekusi pembelian barang langsung untuk rencana pengadaan yang telah disetujui.
                    </p>
                </div>
            </div>
        </div>

        <form @submit.prevent="handleSubmit(false)" class="space-y-6">
            <!-- SECTION 1: Pilih Rencana Pengadaan -->
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

            <!-- SECTION 2: Saluran & Informasi Toko / Supplier -->
            <DPChannelSection
                :form="form"
                :popular-marketplaces="popularMarketplaces"
                :supplier-options="supplierOptions"
                :is-loading-suppliers="isLoadingSuppliers"
            />

            <!-- SECTION 3: Rincian Barang & Realisasi Harga -->
            <DPItemsTableSection
                :form="form"
                :is-bulk-mode="isBulkMode"
                :is-plan-fully-exhausted="isPlanFullyExhausted"
                :has-exhausted-items="hasExhaustedItems"
                @remove-bulk-item="removeBulkItem"
            />

            <!-- SECTION 4: Informasi Pembayaran & Rekening Tujuan (Finance) -->
            <DPPaymentInfoSection
                :form="form"
                :popular-banks="popularBanks"
            />

            <!-- SECTION 5: Komponen Biaya Tambahan & Total Transaksi -->
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

            <!-- Footer Buttons -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <RouterLink :to="{ name: 'user.purchasing.direct' }">
                    <BaseButton variant="secondary">
                        <span>Batal</span>
                    </BaseButton>
                </RouterLink>

                <div class="flex items-center gap-3">
                    <button 
                        type="button" 
                        @click="handleSubmit(false)"
                        :disabled="isSubmitting || form.items.length === 0"
                        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Save class="w-4 h-4 text-gray-500" />
                        <span>Simpan sebagai Draft</span>
                    </button>

                    <button 
                        type="button" 
                        @click="handleSubmit(true)"
                        :disabled="isSubmitting || form.items.length === 0"
                        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Send class="w-4 h-4" />
                        <span>Simpan & Ajukan Pembayaran</span>
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>
