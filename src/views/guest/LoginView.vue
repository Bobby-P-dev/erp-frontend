<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import {
    login,
    getProfile,
} from '../../services/authServices'

const router = useRouter()
const authStore = useAuthStore()

const nik = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
    error.value = ''

    if (!nik.value || !password.value) {
        error.value = 'NIK dan password wajib diisi.'
        return
    }

    loading.value = true

    try {
        const loginResponse = await login({
            nik: nik.value,
            password: password.value,
        })

        const profileResponse = await getProfile()

        authStore.setAuth(
            loginResponse.user,
            profileResponse.data
        )

        router.push({
            name: 'user.dashboard',
        })

    } catch (err) {
        console.error(err)

        if (err.response?.status === 422) {
            error.value = 'NIK atau password tidak valid.'
        } else if (err.response?.status === 401) {
            error.value = 'NIK atau password salah.'
        } else {
            error.value = 'Terjadi kesalahan. Silakan coba lagi.'
        }

    } finally {
        loading.value = false
    }
}
</script>

<template>
    <main class="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans relative overflow-hidden">
        
        <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div class="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 blur-3xl"></div>
            <div class="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-100/50 blur-3xl"></div>
        </div>

        <div class="w-full max-w-md bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/50 z-10">

            <div class="mb-8">
                <p class="text-sm text-gray-500 mb-2">
                    ERP System
                </p>

                <h1 class="text-3xl font-bold text-gray-900">
                    Welcome back
                </h1>

                <p class="mt-2 text-gray-600">
                    Silakan login untuk melanjutkan.
                </p>
            </div>

            <form
                class="space-y-5"
                @submit.prevent="handleLogin"
            >

                <div>
                    <label
                        for="nik"
                        class="block text-sm font-medium text-gray-700 mb-2"
                    >
                        NIK
                    </label>

                    <input
                        id="nik"
                        v-model="nik"
                        type="text"
                        autocomplete="username"
                        placeholder="Masukkan NIK"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900"
                    />
                </div>

                <div>
                    <label
                        for="password"
                        class="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Password
                    </label>

                    <input
                        id="password"
                        v-model="password"
                        type="password"
                        autocomplete="current-password"
                        placeholder="Masukkan password"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-gray-900"
                    />
                </div>

                <div
                    v-if="error"
                    class="p-3 rounded-lg bg-red-50 text-sm text-red-600"
                >
                    {{ error }}
                </div>

                <button
                    type="submit"
                    :disabled="loading"
                    class="w-full px-4 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {{ loading ? 'Signing in...' : 'Login' }}
                </button>

            </form>

        </div>

    </main>
</template>