<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { login, getProfile } from '../../services/authServices'
import { 
    Lock, 
    User, 
    KeyRound, 
    Eye, 
    EyeOff, 
    AlertCircle, 
    ArrowRight,
    Loader2 
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()

const identifier = ref('') // NIK atau Email
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
    error.value = ''

    const trimmedIdentifier = identifier.value.trim()

    if (!trimmedIdentifier || !password.value) {
        error.value = 'NIK atau Email dan password wajib diisi.'
        return
    }

    loading.value = true

    try {
        const isEmail = trimmedIdentifier.includes('@')
        const payload = {
            login: trimmedIdentifier,
            password: password.value,
            remember: rememberMe.value,
            ...(isEmail ? { email: trimmedIdentifier } : { nik: trimmedIdentifier })
        }

        const loginResponse = await login(payload)
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
            error.value = err.response?.data?.message || 'NIK, Email, atau password tidak valid.'
        } else if (err.response?.status === 401) {
            error.value = 'NIK, Email, atau password salah.'
        } else if (err.response?.status === 429) {
            error.value = 'Terlalu banyak percobaan login. Silakan tunggu beberapa saat.'
        } else {
            error.value = 'Terjadi kesalahan sistem. Silakan coba lagi nanti.'
        }

    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="relative w-full min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-8 sm:py-12 overflow-hidden">
        
        <!-- Ornamen Latar Belakang Halus (Pure CSS - 0 KB) -->
        <div 
            class="absolute inset-0 pointer-events-none opacity-30 z-0"
            style="
                background-image: linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px);
                background-size: 36px 36px;
                mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 50%, transparent 100%);
                -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 50%, transparent 100%);
            "
        ></div>
        <div class="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-[90px] pointer-events-none z-0"></div>
        <div class="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-purple-500/10 blur-[90px] pointer-events-none z-0"></div>

        <!-- Kartu Form Login Minimalis & Modern -->
        <div class="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-7 sm:p-9 relative z-10">

            <!-- Bagian Atas / Header: Ringkas, Jelas, & Humanis -->
            <div class="mb-7 text-center flex flex-col items-center">
                <img 
                    src="/pses_transparent.png" 
                    alt="Padma Soode ERP Sistem" 
                    class="h-7 sm:h-8 w-auto object-contain mb-2.5" 
                />
                <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Padma Soode ERP Sistem
                </h1>
                <p class="text-xs text-slate-500 mt-1">
                    Silakan masuk menggunakan NIK atau Email Anda
                </p>
            </div>

            <!-- Form Login -->
            <form class="space-y-4" @submit.prevent="handleLogin">

                <!-- Input NIK atau Email (Fleksibel) -->
                <div>
                    <label for="identifier" class="block text-xs font-semibold text-slate-700 mb-1.5">
                        NIK atau Email
                    </label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <User class="w-4 h-4" />
                        </div>
                        <input
                            id="identifier"
                            v-model="identifier"
                            type="text"
                            autocomplete="username"
                            placeholder="Masukkan NIK atau email"
                            required
                            class="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white transition-all duration-200"
                        />
                    </div>
                </div>

                <!-- Input Password dengan Toggle Lihat Password -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label for="password" class="block text-xs font-semibold text-slate-700">
                            Password
                        </label>
                    </div>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <KeyRound class="w-4 h-4" />
                        </div>
                        <input
                            id="password"
                            v-model="password"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="current-password"
                            placeholder="Masukkan password"
                            required
                            class="w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white transition-all duration-200"
                        />
                        <button
                            type="button"
                            @click="showPassword = !showPassword"
                            tabindex="-1"
                            class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            <EyeOff v-if="showPassword" class="w-4 h-4" />
                            <Eye v-else class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- Opsi Ingat Saya -->
                <div class="flex items-center justify-between pt-1">
                    <label class="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            v-model="rememberMe"
                            class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                        />
                        <span class="text-xs text-slate-600">Ingat saya</span>
                    </label>
                </div>

                <!-- Notifikasi Error -->
                <div
                    v-if="error"
                    class="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600"
                >
                    <AlertCircle class="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span class="leading-relaxed">{{ error }}</span>
                </div>

                <!-- Tombol Submit Login -->
                <button
                    type="submit"
                    :disabled="loading"
                    class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
                >
                    <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
                    <span v-if="loading">Memproses...</span>
                    <template v-else>
                        <span>Masuk ke Sistem</span>
                        <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </template>
                </button>

            </form>

            <!-- Informasi Bantuan / Footer Card -->
            <div class="mt-6 pt-5 border-t border-slate-100 text-center">
                <p class="text-[11px] text-slate-400">
                    Mengalami kendala akun? Hubungi tim IT atau administrator internal.
                </p>
            </div>

        </div>

    </div>
</template>