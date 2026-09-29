<script setup>
defineProps({
    columns: {
        type: Array,
        required: true,
    }
})
</script>

<template>
    <div class="overflow-x-auto w-full">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-50 border-b border-slate-200/80">
                    <th 
                        v-for="col in columns" 
                        :key="col.key" 
                        class="px-6 py-4.5 text-base font-bold text-slate-800 tracking-wide select-none"
                        :class="col.class"
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
