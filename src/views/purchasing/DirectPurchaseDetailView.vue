<script setup>
import { useRoute, useRouter } from 'vue-router'
import DirectPurchaseDetailModal from '../../components/purchasing/direct/detail/DirectPurchaseDetailModal.vue'
const route = useRoute()
const router = useRouter()
</script>

<template>
    <DirectPurchaseDetailModal :key="route.params.id" :purchase-id="route.params.id" @close="router.push({ name: 'user.purchasing.direct', query: { tab: 'history' } })" />
</template>
