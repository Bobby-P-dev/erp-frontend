<script setup>
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "@lucide/vue";
import { reactiveOmit } from "@vueuse/core";
import { cn } from "cn";
import { Toaster as Sonner } from "vue-sonner";

const props = defineProps({
  id: { type: String, required: false },
  invert: { type: Boolean, required: false },
  theme: { type: String, required: false },
  position: { type: String, required: false },
  closeButtonPosition: { type: String, required: false },
  hotkey: { type: Array, required: false },
  richColors: { type: Boolean, required: false },
  expand: { type: Boolean, required: false },
  duration: { type: Number, required: false },
  gap: { type: Number, required: false },
  visibleToasts: { type: Number, required: false },
  closeButton: { type: Boolean, required: false },
  toastOptions: { type: Object, required: false },
  class: { type: String, required: false },
  style: { type: Object, required: false },
  offset: { type: [Object, String, Number], required: false },
  mobileOffset: { type: [Object, String, Number], required: false },
  dir: { type: String, required: false },
  swipeDirections: { type: Array, required: false },
  icons: { type: Object, required: false },
  containerAriaLabel: { type: String, required: false },
});
const delegatedProps = reactiveOmit(props, "class", "toastOptions");
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
      '--gray2': 'hsl(var(--popover) / 0.9)',
      '--gray3': 'var(--border)',
      '--gray4': 'var(--border)',
      '--gray5': 'var(--border)',
      '--gray12': 'var(--popover-foreground)',
    }"
    :toast-options="
      props.toastOptions ?? {
        classes: {
          toast: 'group toast font-sans rounded-[14px] border border-[#E2E8F0] bg-white text-[#0F172A] shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] p-4 text-xs gap-3 will-change-transform',
          title: 'font-semibold text-sm text-[#0F172A] leading-snug',
          description: 'text-[#64748B] text-[13px] leading-relaxed mt-0.5',
          actionButton: 'bg-[#0F172A] hover:bg-[#2563EB] text-white rounded-[10px] text-xs font-semibold px-3.5 py-1.5 transition-all shadow-2xs cursor-pointer',
          cancelButton: 'bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B] rounded-[10px] text-xs font-medium px-3.5 py-1.5 transition-colors cursor-pointer',
          closeButton: 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-md',
          success: 'group-[.toaster]:border-[#DCFCE7] group-[.toaster]:bg-white text-[#0F172A]',
          error: 'group-[.toaster]:border-[#FEE2E2] group-[.toaster]:bg-white text-[#0F172A]',
          info: 'group-[.toaster]:border-[#BFDBFE] group-[.toaster]:bg-white text-[#0F172A]',
          warning: 'group-[.toaster]:border-[#FEF3C7] group-[.toaster]:bg-white text-[#0F172A]',
        },
      }
    "
    v-bind="delegatedProps"
  >
    <template #success-icon>
      <div class="size-6 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
        <CircleCheckIcon class="size-3.5" />
      </div>
    </template>
    <template #info-icon>
      <div class="size-6 rounded-full bg-[#BFDBFE] text-[#2563EB] flex items-center justify-center shrink-0">
        <InfoIcon class="size-3.5" />
      </div>
    </template>
    <template #warning-icon>
      <div class="size-6 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
        <TriangleAlertIcon class="size-3.5" />
      </div>
    </template>
    <template #error-icon>
      <div class="size-6 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
        <OctagonXIcon class="size-3.5" />
      </div>
    </template>
    <template #loading-icon>
      <div class="size-6 rounded-full bg-[#BFDBFE] text-[#2563EB] flex items-center justify-center shrink-0">
        <Loader2Icon class="size-3.5 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4 text-slate-400 hover:text-slate-700 transition-colors" />
    </template>
  </Sonner>
</template>
