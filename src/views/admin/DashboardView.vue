<script setup>
import PageHeader from '../../components/ui/PageHeader.vue'
import { LayoutDashboard } from '@lucide/vue'
</script>

<template>
  <div class="space-y-6">
    <PageHeader 
      title="Admin Dashboard"
      description="Selamat datang di Panel Administrasi Padma Soode ERP."
    >
      <template #icon>
        <LayoutDashboard class="w-6 h-6" />
      </template>
    </PageHeader>
  </div>
</template>