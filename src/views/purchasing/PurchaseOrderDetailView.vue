<script setup>
import { useRoute, useRouter } from 'vue-router'
import PurchaseOrderDetailModal from '../../components/purchasing/order/PurchaseOrderDetailModal.vue'
const route = useRoute()
const router = useRouter()
</script>

<template>
    <PurchaseOrderDetailModal :key="route.params.id" :order-id="route.params.id" @close="router.push({ name: 'user.purchasing.orders' })" />
</template>
