<script setup>
/**
 * HeroSection.vue
 * 
 * Komponen Hero Section independen dan terisolasi untuk Guest Layout / Halaman Awal ERP.
 * Mengusung estetika Modern Enterprise dengan 0 KB gambar eksternal (Pure CSS Mesh Glow & Grid).
 */
import { useRouter } from 'vue-router'
import { 
    ClockAlert, 
    ShieldCheck, 
    ArrowRight,
    Layers
} from '@lucide/vue'

const router = useRouter()

// Definisi Props opsional untuk fleksibilitas reuse komponen
const props = defineProps({
    badgeText: {
        type: String,
        default: 'Portal Operasional & Layanan'
    },
    primaryCtaText: {
        type: String,
        default: 'Masuk ke Sistem'
    },
    secondaryCtaText: {
        type: String,
        default: 'Jelajahi Modul ERP'
    }
})

// Emits untuk kontrol aksi klik jika komponen di-embed oleh parent view
const emit = defineEmits(['primaryClick', 'secondaryClick'])

const handlePrimaryClick = () => {
    emit('primaryClick')
    router.push({ name: 'login' })
}

const handleSecondaryClick = () => {
    emit('secondaryClick')
    const targetElement = document.getElementById('fitur-utama')
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' })
    }
}
</script>

<template>
    <!-- ========================================================================= -->
    <!-- 1. CONTAINER UTAMA DENGAN ISOLASI TATA LETAK                               -->
    <!-- Menggunakan min-h-[calc(100vh-5rem)] agar proporsional tanpa menutupi   -->
    <!-- Navbar tetap di atas maupun Footer di bagian bawah.                      -->
    <!-- ========================================================================= -->
    <section id="hero-section" class="relative w-full overflow-hidden min-h-screen flex items-center justify-center bg-slate-50 -mt-[5rem] pt-[5rem]">
        
        <!-- ===================================================================== -->
        <!-- 2. GAYA VISUAL LATAR BELAKANG (PURE CSS - 0 KB PAYLOAD)               -->
        <!-- ===================================================================== -->

        <!-- Pola Jaring Grid Halus: Penuh di bagian atas (bawah navbar) & memudar lembut ke bawah -->
        <div 
            class="absolute inset-0 pointer-events-none opacity-40 z-0"
            style="
                background-image: linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px);
                background-size: 40px 40px;
                mask-image: radial-gradient(ellipse 95% 80% at 50% 20%, #000 60%, transparent 100%);
                -webkit-mask-image: radial-gradient(ellipse 95% 80% at 50% 20%, #000 60%, transparent 100%);
            "
        ></div>

        <!-- Efek Aurora Mesh Glow Kanan Atas (Aksen Ungu / Indigo Lembut) -->
        <div 
            class="absolute -top-12 -right-12 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/25 to-purple-500/25 blur-[100px] pointer-events-none z-0"
            aria-hidden="true"
        ></div>

        <!-- Efek Aurora Mesh Glow Kiri Bawah (Aksen Oranye / Amber Lembut) -->
        <div 
            class="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-500/25 to-orange-500/25 blur-[100px] pointer-events-none z-0"
            aria-hidden="true"
        ></div>

        <!-- ===================================================================== -->
        <!-- 3. KARTU MELAYANG (FLOATING BADGES - Z-INDEX 20)                      -->
        <!-- Glassmorphism styling dengan hidden lg:flex agar aman di layar ponsel -->
        <!-- ===================================================================== -->

        <!-- Kartu Melayang 1: Indikator SLA Approval (Area Kiri Atas - Di bawah batas Navbar) -->
        <div 
            class="absolute top-24 xl:top-28 left-6 xl:left-14 z-20 hidden lg:flex items-center gap-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl shadow-slate-200/50 p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl select-none"
        >
            <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-xs">
                <ClockAlert class="w-5 h-5" />
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900">SLA Approval</span>
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Terpantau
                    </span>
                </div>
                <p class="text-[11px] text-slate-500 font-medium mt-0.5">
                    Persetujuan Cepat &bull; Batas SLA &lt; 4 Jam
                </p>
            </div>
        </div>

        <!-- Kartu Melayang 2: Keamanan & Hak Akses Sesuai Peran (Area Kanan Atas - Di bawah batas Navbar) -->
        <div 
            class="absolute top-28 xl:top-32 right-6 xl:right-14 z-20 hidden lg:flex items-center gap-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl shadow-slate-200/50 p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl select-none"
        >
            <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
                <ShieldCheck class="w-5 h-5" />
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900">Akses Terpusat</span>
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <p class="text-[11px] text-slate-500 font-medium mt-0.5">
                    Sesuai Peran Divisi &bull; Riwayat Tercatat
                </p>
            </div>
        </div>

        <!-- Kartu Melayang 3: Ekosistem Modular (Area Kanan Bawah) -->
        <div 
            class="absolute bottom-16 right-10 xl:right-20 z-20 hidden lg:flex items-center gap-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl shadow-slate-200/50 p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl select-none"
        >
            <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-xs">
                <Layers class="w-5 h-5" />
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-900">Ekosistem Modular</span>
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        Multi Modul
                    </span>
                </div>
                <p class="text-[11px] text-slate-500 font-medium mt-0.5">
                    Saling Terhubung &bull; Siap Terus Berkembang
                </p>
            </div>
        </div>

        <!-- ===================================================================== -->
        <!-- 4. KONTEN UTAMA DI TENGAH (Z-INDEX 10)                                 -->
        <!-- Teks tegas, manusiawi, dan mencerminkan ERP internal perusahaan       -->
        <!-- ===================================================================== -->
        <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 text-center flex flex-col items-center">
            
            <!-- Badge Bersih & Minimalis (Bebas dari Klise AI Sparkles) -->
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 mb-8 select-none">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                <span class="text-xs font-medium tracking-wide">
                    {{ badgeText }}
                </span>
            </div>

            <!-- Headline Utama yang Bersih & Manusiawi -->
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Satu Portal Terpadu untuk Seluruh
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600">
                    Operasional
                </span>
                Perusahaan
            </h1>

            <!-- Subtitle Humanis & Tidak Kaku -->
            <p class="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
                Pusat kolaborasi dan alur kerja lintas divisi mulai dari pengajuan pengadaan barang, persetujuan berjenjang, hingga modul-modul operasional yang terintegrasi dan siap berkembang bersama perusahaan.
            </p>

            <!-- Call To Action (CTA) Dua Tombol Sejajar -->
            <div class="mt-10 flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
                
                <!-- Tombol Utama: Aksen Indigo dengan Shadow Lembut -->
                <button
                    type="button"
                    @click="handlePrimaryClick"
                    class="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer group"
                >
                    <span>{{ primaryCtaText }}</span>
                    <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <!-- Tombol Sekunder: Warna Putih dengan Border Halus -->
                <button
                    type="button"
                    @click="handleSecondaryClick"
                    class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer"
                >
                    <span>{{ secondaryCtaText }}</span>
                </button>

            </div>

        </div>

    </section>
</template>
