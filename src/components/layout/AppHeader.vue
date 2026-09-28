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
            'bg-white/80 backdrop-blur-xl shadow-xs shadow-slate-200/30 z-30 transition-all duration-300',
            !fullWidth ? 'rounded-2xl mx-3 sm:mx-6 mt-3 sm:mt-4 border border-slate-200/70' : 'w-full border-b border-slate-200/70',
            isSticky ? (fullWidth ? 'sticky top-0' : 'sticky top-3 sm:top-4') : 'relative'
        ]"
    >
        <div class="flex items-center justify-between h-14 md:h-16 px-4 md:px-6 mx-auto w-full relative">
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