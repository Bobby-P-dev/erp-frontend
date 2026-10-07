<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { X } from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        default: ''
    },
    subtitle: {
        type: String,
        default: ''
    },
    size: {
        type: String,
        default: 'lg',
        validator: (v) => ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', 'full'].includes(v)
    },
    icon: {
        type: [Object, Function],
        default: null
    },
    iconClass: {
        type: String,
        default: 'bg-blue-50 text-blue-600 border border-blue-100'
    },
    hideHeader: {
        type: Boolean,
        default: false
    },
    hideFooter: {
        type: Boolean,
        default: false
    },
    closeOnBackdrop: {
        type: Boolean,
        default: true
    },
    showBackdrop: {
        type: Boolean,
        default: false
    },
    closeOnEscape: {
        type: Boolean,
        default: true
    },
    bodyClass: {
        type: String,
        default: 'p-6'
    }
})

const emit = defineEmits(['update:modelValue', 'close'])

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'sm': return 'max-w-sm'
        case 'md': return 'max-w-md'
        case 'lg': return 'max-w-lg'
        case 'xl': return 'max-w-xl'
        case '2xl': return 'max-w-2xl'
        case '3xl': return 'max-w-3xl'
        case '4xl': return 'max-w-4xl'
        case '5xl': return 'max-w-5xl'
        case 'full': return 'max-w-7xl'
        default: return 'max-w-lg'
    }
})

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

const onBackdropClick = () => {
    if (props.closeOnBackdrop) {
        close()
    }
}

const onKeydown = (e) => {
    if (props.closeOnEscape && e.key === 'Escape' && props.modelValue) {
        close()
    }
}

watch(() => props.modelValue, (isOpen) => {
    if (typeof document !== 'undefined') {
        if (isOpen) {
            document.body.classList.add('overflow-hidden')
        } else {
            document.body.classList.remove('overflow-hidden')
        }
    }
})

onMounted(() => {
    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeydown)
    }
})

onUnmounted(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeydown)
    }
    if (typeof document !== 'undefined') {
        document.body.classList.remove('overflow-hidden')
    }
})
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="modelValue"
                :class="[
                    'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto',
                    showBackdrop ? 'bg-slate-900/50' : ''
                ]"
                @click.self="onBackdropClick"
            >
                <div
                    :class="[
                        'bg-white rounded-2xl shadow-2xl border border-slate-200 w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150',
                        sizeClasses
                    ]"
                >
                    <!-- Header -->
                    <div
                        v-if="!hideHeader"
                        class="px-6 py-4.5 bg-slate-50 border-b border-slate-200/90 flex items-center justify-between gap-4"
                    >
                        <slot name="header">
                            <div class="flex items-center gap-3">
                                <div
                                    v-if="icon"
                                    :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconClass]"
                                >
                                    <component :is="icon" class="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                        <slot name="title">{{ title }}</slot>
                                    </h3>
                                    <p v-if="subtitle || $slots.subtitle" class="text-xs sm:text-sm text-slate-500 mt-0.5">
                                        <slot name="subtitle">{{ subtitle }}</slot>
                                    </p>
                                </div>
                            </div>
                        </slot>

                        <button
                            type="button"
                            @click="close"
                            class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                            aria-label="Tutup Modal"
                        >
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <!-- Body -->
                    <div :class="['max-h-[75vh] overflow-y-auto', bodyClass]">
                        <slot></slot>
                    </div>

                    <!-- Footer -->
                    <div
                        v-if="!hideFooter && $slots.footer"
                        class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3"
                    >
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
