<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import { LogIn, ArrowLeft } from '@lucide/vue'

const route = useRoute()
const router = useRouter()

const activeSection = ref('beranda')

const updateActiveSection = () => {
    if (route.name !== 'welcome') {
        activeSection.value = ''
        return
    }

    const fiturEl = document.getElementById('fitur-utama')
    if (fiturEl) {
        const rect = fiturEl.getBoundingClientRect()
        // If top of fitur-utama is within upper viewport (220px from top)
        if (rect.top <= 220) {
            activeSection.value = 'modul'
            return
        }
    }
    activeSection.value = 'beranda'
}

const navigateToSection = (target) => {
    if (route.name !== 'welcome') {
        router.push({ 
            name: 'welcome', 
            hash: target === 'modul' ? '#fitur-utama' : '#hero-section' 
        })
        return
    }

    if (target === 'beranda') {
        activeSection.value = 'beranda'
        const heroEl = document.getElementById('hero-section')
        if (heroEl) {
            heroEl.scrollIntoView({ behavior: 'smooth' })
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    } else if (target === 'modul') {
        activeSection.value = 'modul'
        const fiturEl = document.getElementById('fitur-utama')
        if (fiturEl) {
            fiturEl.scrollIntoView({ behavior: 'smooth' })
        }
    }
}

watch(
    () => route.name,
    (newName) => {
        if (newName === 'welcome') {
            setTimeout(updateActiveSection, 50)
        } else {
            activeSection.value = ''
        }
    },
    { immediate: true }
)

onMounted(() => {
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    setTimeout(updateActiveSection, 100)
})

onUnmounted(() => {
    window.removeEventListener('scroll', updateActiveSection)
})
</script>

<template>
    <div class="min-h-screen flex flex-col bg-slate-50 font-sans">
        <AppHeader isSticky>
            <template #left>
                <RouterLink 
                    :to="{ name: 'welcome' }" 
                    @click="navigateToSection('beranda')"
                    class="flex items-center gap-2.5 sm:gap-3 group select-none cursor-pointer"
                >
                    <img 
                        src="/pses_transparent.png" 
                        alt="Padma Soode ERP Sistem" 
                        class="h-5.5 sm:h-6.5 w-auto object-contain transition-transform duration-200 group-hover:scale-105" 
                    />
                </RouterLink>
            </template>

            <template #center>
                <nav class="flex items-center gap-6 sm:gap-8 select-none">
                    <button 
                        type="button"
                        @click="navigateToSection('beranda')"
                        :class="[
                            'text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer py-1',
                            activeSection === 'beranda' 
                                ? 'text-indigo-600 font-semibold' 
                                : 'text-slate-500 hover:text-slate-900'
                        ]"
                    >
                        Beranda
                    </button>
                    <button 
                        type="button"
                        @click="navigateToSection('modul')"
                        :class="[
                            'text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer py-1',
                            activeSection === 'modul' 
                                ? 'text-indigo-600 font-semibold' 
                                : 'text-slate-500 hover:text-slate-900'
                        ]"
                    >
                        Modul ERP
                    </button>
                </nav>
            </template>

            <template #right>
                <RouterLink
                    v-if="route.name !== 'login'"
                    :to="{ name: 'login' }"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all duration-200 group"
                >
                    <LogIn class="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Login</span>
                </RouterLink>
                <RouterLink
                    v-else
                    :to="{ name: 'welcome' }"
                    class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 transition-all duration-200"
                >
                    <ArrowLeft class="w-3.5 h-3.5" />
                    <span>Kembali</span>
                </RouterLink>
            </template>
        </AppHeader>

        <main class="flex-1 flex flex-col">
            <RouterView />
        </main>

        <AppFooter />
    </div>
</template>