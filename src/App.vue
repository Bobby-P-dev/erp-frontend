<script setup>
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import GlobalAlertDialog from '@/components/ui/GlobalAlertDialog.vue'
import GlobalLoadingBar from '@/components/ui/GlobalLoadingBar.vue'
</script>

<template>
  <GlobalLoadingBar />
  <RouterView />
  <GlobalAlertDialog />
  <Toaster
    position="top-right"
    :rich-colors="false"
    :expand="false"
    :visible-toasts="4"
    :gap="10"
    :duration="4500"
    :close-button="true"
    close-button-position="top-right"
    :swipe-directions="['right', 'top']"
  />
</template>