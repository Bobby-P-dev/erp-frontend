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
      '--normal-bg': '#ffffff',
      '--normal-text': '#0f172a',
      '--normal-border': '#e2e8f0',
      '--border-radius': '14px',
      '--width': '390px',
      '--gray2': '#f1f5f9',
      '--gray4': '#cbd5e1',
      '--gray5': '#94a3b8',
      '--gray12': '#0f172a',
    }"
    :toast-options="
      props.toastOptions ?? {
        classes: {
          toast: 'erp-toast group toast font-sans rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-[0_14px_38px_-10px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.06)] will-change-transform',
          title: 'font-semibold text-sm text-slate-900 leading-snug',
          description: 'text-slate-600 text-xs leading-relaxed',
          actionButton: 'shrink-0 cursor-pointer',
          cancelButton: 'shrink-0 cursor-pointer',
          closeButton: 'transition-all',
          success: 'border-l-4 border-l-emerald-500 border-emerald-200/70 bg-white text-slate-900',
          error: 'border-l-4 border-l-rose-500 border-rose-200/70 bg-white text-slate-900',
          info: 'border-l-4 border-l-blue-600 border-blue-200/70 bg-white text-slate-900',
          warning: 'border-l-4 border-l-amber-500 border-amber-200/70 bg-white text-slate-900',
        },
      }
    "
    v-bind="delegatedProps"
  >
    <template #success-icon>
      <div class="size-8 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
        <CircleCheckIcon class="size-4" />
      </div>
    </template>
    <template #info-icon>
      <div class="size-8 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
        <InfoIcon class="size-4" />
      </div>
    </template>
    <template #warning-icon>
      <div class="size-8 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
        <TriangleAlertIcon class="size-4" />
      </div>
    </template>
    <template #error-icon>
      <div class="size-8 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
        <OctagonXIcon class="size-4" />
      </div>
    </template>
    <template #loading-icon>
      <div class="size-8 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-3.5" />
    </template>
  </Sonner>
</template>

<style>
@keyframes erp-toast-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

[data-sonner-toast].erp-toast[data-styled='true'] {
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, box-shadow 220ms ease, height 300ms ease;
}

[data-sonner-toast].erp-toast[data-styled='true']:hover {
  box-shadow: 0 20px 44px -12px rgba(15, 23, 42, 0.22), 0 6px 14px -4px rgba(15, 23, 42, 0.08);
}

/* Override vue-sonner's default 16x16 [data-icon] clamp so 32x32 badge never overlaps text */
[data-sonner-toast].erp-toast[data-styled='true'] [data-icon] {
  width: 32px;
  height: 32px;
  margin: 0;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-content] {
  flex: 1 1 auto;
  min-width: 0;
  gap: 3px;
  padding-top: 1px;
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-title] {
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.35;
  color: #0f172a;
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-description] {
  font-size: 0.75rem;
  line-height: 1.45;
  color: #475569;
  margin: 0;
}

/* Override vue-sonner's default black [data-button] with interactive Royal Blue action button */
[data-sonner-toast].erp-toast[data-styled='true'] [data-button] {
  align-self: center;
  height: auto;
  min-height: 30px;
  padding: 6px 12px;
  border-radius: 8px;
  background: #014baa;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  margin: 0 0 0 6px;
  box-shadow: 0 1px 2px rgba(1, 75, 170, 0.24);
  transition: background-color 150ms ease, transform 120ms ease, box-shadow 150ms ease;
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-button]:hover {
  background: #013c89;
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-button]:active {
  transform: scale(0.97);
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-button]:focus-visible {
  outline: 2px solid #014baa;
  outline-offset: 2px;
  box-shadow: none;
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-cancel] {
  align-self: center;
  height: auto;
  min-height: 30px;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0 0 0 6px;
  box-shadow: none;
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-cancel]:hover {
  background: #e2e8f0;
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-close-button] {
  width: 22px;
  height: 22px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  opacity: 0.9;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

[data-sonner-toast].erp-toast[data-styled='true'] [data-close-button]:hover {
  opacity: 1;
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

/* Progress bar countdown at bottom edge matching duration per type (pauses cleanly on hover) */
[data-sonner-toast].erp-toast[data-type='success'] { --toast-duration: 4500ms; }
[data-sonner-toast].erp-toast[data-type='error'] { --toast-duration: 6000ms; }
[data-sonner-toast].erp-toast[data-type='warning'] { --toast-duration: 5000ms; }
[data-sonner-toast].erp-toast[data-type='info'] { --toast-duration: 4000ms; }

[data-sonner-toast].erp-toast:not([data-type='loading'])::after {
  content: '';
  position: absolute;
  top: auto;
  left: 14px;
  right: 14px;
  bottom: 0;
  width: auto;
  height: 2.5px;
  border-radius: 9999px;
  background: #cbd5e1;
  transform-origin: left center;
  animation: erp-toast-progress var(--toast-duration, 4500ms) linear forwards;
  pointer-events: none;
}

[data-sonner-toast].erp-toast[data-type='success']::after { background: #10b981; }
[data-sonner-toast].erp-toast[data-type='error']::after { background: #f43f5e; }
[data-sonner-toast].erp-toast[data-type='warning']::after { background: #f59e0b; }
[data-sonner-toast].erp-toast[data-type='info']::after { background: #2563eb; }

[data-sonner-toaster]:hover [data-sonner-toast].erp-toast::after,
[data-sonner-toast].erp-toast:hover::after,
[data-sonner-toast].erp-toast:focus-within::after {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  [data-sonner-toast].erp-toast,
  [data-sonner-toast].erp-toast::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
