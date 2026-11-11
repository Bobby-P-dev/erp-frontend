<script setup>
defineProps({
    isSticky: {
        type: Boolean,
        default: false
    },
    fullWidth: {
        type: Boolean,
        default: true
    }
})
</script>

<template>
    <header 
        :class="[
            'bg-white/95 shadow-2xs z-30 transition-all duration-200 w-full border-b border-slate-200/80',
            isSticky ? 'sticky top-0' : 'relative'
        ]"
    >
        <div class="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-8 mx-auto w-full relative">
            <div class="flex items-center gap-2 md:gap-3 flex-1">
                <slot name="left"></slot>
            </div>

            <div v-if="$slots.center" class="hidden md:flex items-center justify-center flex-1">
                <slot name="center"></slot>
            </div>

            <div class="flex items-center gap-2.5 md:gap-3 flex-1 justify-end">
                <slot name="right"></slot>
            </div>
        </div>
    </header>
</template>