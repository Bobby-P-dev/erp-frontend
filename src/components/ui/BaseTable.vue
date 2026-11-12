<script setup>
defineProps({
    columns: {
        type: Array,
        required: true,
    },
    minWidth: { type: String, default: undefined },
    layout: { type: String, default: 'auto' },
    label: { type: String, default: 'Daftar data' },
    busy: { type: Boolean, default: false },
})

const getColAlignClass = (col) => {
    if (col.class && (col.class.includes('text-center') || col.class.includes('text-right') || col.class.includes('text-left'))) {
        return ''
    }
    if (col.align === 'center') return 'text-center'
    if (col.align === 'right') return 'text-right'
    return 'text-left'
}
</script>

<template>
    <div class="base-table overflow-x-auto w-full min-w-0" role="region" :aria-label="label" :aria-busy="busy" tabindex="0">
        <table class="w-full text-left border-collapse" :style="{ minWidth, tableLayout: layout }">
            <thead>
                <tr class="bg-slate-50/70 border-b border-slate-200/80">
                    <th 
                        v-for="col in columns" 
                        :key="col.key" 
                        scope="col"
                        class="px-5 py-3.5 text-xs font-medium text-slate-500 select-none whitespace-nowrap"
                        :class="[getColAlignClass(col), col.class]"
                        :style="{
                            width: col.width,
                            minWidth: col.minWidth
                        }"
                    >
                        {{ col.label }}
                    </th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm text-slate-700">
                <slot></slot>
            </tbody>
            <tfoot v-if="$slots.footer"><slot name="footer" /></tfoot>
        </table>
    </div>
</template>

<style scoped>
.base-table { scrollbar-width: thin; }
.base-table:focus-visible { outline: 2px solid #014baa; outline-offset: -2px; }
.base-table :deep(tbody > tr > td) { padding: 16px 20px; vertical-align: middle; }
.base-table :deep(tbody > tr:hover) { background-color: #f8fafc; }
@media (prefers-reduced-motion: reduce) {
    .base-table :deep(*) { transition: none !important; }
}
</style>
