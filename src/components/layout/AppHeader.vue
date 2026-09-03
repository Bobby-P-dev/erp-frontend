<script setup>
defineProps({
    isSticky: {
        type: Boolean,
        default: false
    },
    fullWidth: {
        type: Boolean,
        default: false
    }
})
</script>

<template>
    <header 
        :class="[
            'bg-white/70 backdrop-blur-xl border-b border-gray-100 shadow-sm z-30 transition-all duration-300',
            !fullWidth ? 'rounded-2xl mx-4 mt-4' : 'w-full',
            isSticky ? (fullWidth ? 'sticky top-0' : 'sticky top-4') : 'relative'
        ]"
    >
        <div class="flex items-center justify-between h-16 md:h-[72px] px-4 md:px-6 mx-auto w-full relative">
            <div class="flex items-center gap-2 md:gap-4 flex-1">
                <slot name="left"></slot>
            </div>

            <div v-if="$slots.center" class="hidden md:flex items-center justify-center gap-4 flex-1">
                <slot name="center"></slot>
            </div>

            <div class="flex items-center gap-3 md:gap-4 flex-1 justify-end">
                <slot name="right"></slot>
            </div>
        </div>
    </header>
</template>