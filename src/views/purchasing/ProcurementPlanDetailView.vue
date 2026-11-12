<script setup>
import { useRoute } from 'vue-router'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import ProcurementPlanDetail from '../../components/purchasing/plan/ProcurementPlanDetail.vue'
const route = useRoute()
</script>

<template>
    <div class="w-full min-w-0 space-y-6 pb-8">
        <BaseBreadcrumb :items="[{ label: 'Purchasing', to: { name: 'user.purchasing' } }, { label: 'Rencana Pengadaan', to: { name: 'user.purchasing.plans' } }, { label: 'Detail rencana' }]" />
        <div class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
            <ProcurementPlanDetail :plan-id="route.params.id" />
        </div>
    </div>
</template>
