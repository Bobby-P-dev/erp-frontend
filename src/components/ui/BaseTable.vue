<script setup>
defineProps({
    columns: {
        type: Array,
        required: true,
    }
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
    <div class="overflow-x-auto w-full">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-50 border-b border-slate-200/80">
                    <th 
                        v-for="col in columns" 
                        :key="col.key" 
                        class="px-6 py-4 text-sm font-bold text-slate-800 tracking-wide select-none whitespace-nowrap"
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
            <tbody class="divide-y divide-slate-100 text-base text-slate-700">
                <slot></slot>
            </tbody>
        </table>
    </div>
</template>
