<script setup>
defineProps({
    columns: {
        type: Array,
        required: true,
        // format: [{ key: 'name', label: 'Name' }, { key: 'action', label: 'Action', class: 'text-right' }]
    }
})
</script>

<template>
    <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-gray-50/80 border-b border-gray-100">
                    <th 
                        v-for="col in columns" 
                        :key="col.key" 
                        class="px-6 py-5 text-sm font-bold text-gray-700 tracking-wide"
                        :class="col.class"
                    >
                        {{ col.label }}
                    </th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                <slot></slot>
            </tbody>
        </table>
    </div>
</template>
