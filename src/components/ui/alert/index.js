import { cva } from "class-variance-authority";

export { default as Alert } from "./Alert.vue";
export { default as AlertAction } from "./AlertAction.vue";
export { default as AlertDescription } from "./AlertDescription.vue";
export { default as AlertTitle } from "./AlertTitle.vue";

export const alertVariants = cva(
  "grid gap-0.5 rounded-xl border px-3 py-2.5 text-left text-xs has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*=size-])]:size-4 group/alert relative w-full shadow-xs",
  {
    variants: {
      variant: {
        default: "bg-white text-slate-800 border-slate-200 *:data-[slot=alert-description]:text-slate-600",
        destructive:
          "bg-rose-50 border-rose-200 text-rose-900 *:data-[slot=alert-description]:text-rose-700 *:[svg]:text-rose-600",
        success:
          "bg-emerald-50 border-emerald-200 text-emerald-900 *:data-[slot=alert-description]:text-emerald-700 *:[svg]:text-emerald-600",
        warning:
          "bg-amber-50 border-amber-200 text-amber-900 *:data-[slot=alert-description]:text-amber-700 *:[svg]:text-amber-600",
        info:
          "bg-blue-50 border-blue-200 text-blue-900 *:data-[slot=alert-description]:text-blue-700 *:[svg]:text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
