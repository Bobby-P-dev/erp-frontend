<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToLogin = () => {
    router.push({
        name: 'login',
    })
}
</script>

<template>
    <section class="min-h-[calc(100vh-140px)] flex items-center relative overflow-hidden">
        
        <div class="max-w-7xl mx-auto w-full px-6 py-16">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                
                <div class="max-w-2xl">
                    <p class="inline-block px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-6 border border-indigo-100">
                        Enterprise Resource Planning
                    </p>

                    <h1 class="text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
                        Welcome to <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">ERP System</span>
                    </h1>

                    <p class="mt-6 text-lg text-gray-600 leading-relaxed">
                        Satu platform cerdas untuk mengelola seluruh operasional perusahaan Anda secara terintegrasi, cepat, dan efisien.
                    </p>

                    <div class="mt-10 flex items-center gap-4">
                        <button
                            type="button"
                            class="px-8 py-4 rounded-2xl bg-gray-900 text-white font-medium hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 transform hover:-translate-y-1"
                            @click="goToLogin"
                        >
                            Mulai Sekarang
                        </button>
                        <button
                            type="button"
                            class="px-8 py-4 rounded-2xl bg-white text-gray-700 font-medium hover:bg-gray-50 border border-gray-200 transition-all duration-300"
                        >
                            Pelajari Lebih Lanjut
                        </button>
                    </div>
                </div>

                <div class="hidden lg:block relative">
                    <div class="absolute inset-0 bg-gradient-to-tr from-indigo-200/50 to-purple-200/50 rounded-[3rem] transform rotate-3 scale-105 z-0 blur-sm"></div>
                    
                    <div class="relative z-10 bg-white/90 backdrop-blur-xl border border-gray-100 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                        
                        <div class="flex items-center justify-between mb-8">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-indigo-600 rounded-xl"></div>
                                <div class="w-24 h-4 bg-gray-200 rounded-full"></div>
                            </div>
                            <div class="flex gap-3">
                                <div class="w-8 h-8 bg-gray-100 rounded-full"></div>
                                <div class="w-8 h-8 bg-purple-100 rounded-full"></div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-5 mb-6">
                            <div class="bg-gray-50/80 p-5 rounded-3xl border border-gray-100">
                                <div class="w-10 h-10 bg-indigo-100 rounded-2xl mb-4"></div>
                                <div class="w-16 h-3 bg-gray-300 rounded-full mb-3"></div>
                                <div class="w-24 h-6 bg-gray-800 rounded-full"></div>
                            </div>
                            <div class="bg-gray-50/80 p-5 rounded-3xl border border-gray-100">
                                <div class="w-10 h-10 bg-purple-100 rounded-2xl mb-4"></div>
                                <div class="w-20 h-3 bg-gray-300 rounded-full mb-3"></div>
                                <div class="w-16 h-6 bg-gray-800 rounded-full"></div>
                            </div>
                        </div>

                        <div class="w-full h-36 bg-gray-50/80 rounded-3xl border border-gray-100 p-5 flex items-end gap-3 justify-between">
                            <div class="w-full bg-indigo-200 rounded-t-lg h-1/3"></div>
                            <div class="w-full bg-indigo-300 rounded-t-lg h-2/3"></div>
                            <div class="w-full bg-indigo-400 rounded-t-lg h-1/2"></div>
                            <div class="w-full bg-indigo-500 rounded-t-lg h-3/4"></div>
                            <div class="w-full bg-indigo-600 rounded-t-lg h-full"></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </section>
</template>