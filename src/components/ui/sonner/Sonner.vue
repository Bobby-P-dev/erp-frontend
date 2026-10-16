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
          toast: 'group toast font-sans rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-lg shadow-slate-900/5 text-slate-800 p-3.5 text-xs',
          title: 'font-semibold text-xs text-slate-900 leading-tight',
          description: 'text-slate-500 text-[11px] leading-relaxed mt-0.5',
          actionButton: 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium px-3 py-1 transition-colors',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium px-3 py-1 transition-colors',
          closeButton: 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-md',
          success: 'group-[.toaster]:border-emerald-200 group-[.toaster]:bg-emerald-50/95 text-emerald-950',
          error: 'group-[.toaster]:border-rose-200 group-[.toaster]:bg-rose-50/95 text-rose-950',
          info: 'group-[.toaster]:border-blue-200 group-[.toaster]:bg-blue-50/95 text-blue-950',
          warning: 'group-[.toaster]:border-amber-200 group-[.toaster]:bg-amber-50/95 text-amber-950',
        },
      }
    "
    v-bind="delegatedProps"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>
