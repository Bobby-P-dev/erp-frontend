<script setup>
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import GlobalAlertDialog from '@/components/ui/GlobalAlertDialog.vue'
</script>

<template>
  <RouterView />
  <GlobalAlertDialog />
  <Toaster position="top-right" :rich-colors="true" :close-button="true" />
</template>