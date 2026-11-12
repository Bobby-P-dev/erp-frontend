<script setup>
import DocumentDetailModal from '../../ui/DocumentDetailModal.vue'
import PurchaseOrderDetail from './PurchaseOrderDetail.vue'
defineProps({ orderId: { type: [Number, String], required: true } })
defineEmits(['close', 'changed'])
</script>

<template>
    <DocumentDetailModal title="Detail pesanan pembelian" @close="$emit('close')">
        <PurchaseOrderDetail :order-id="orderId" @changed="$emit('changed')" />
    </DocumentDetailModal>
</template>
