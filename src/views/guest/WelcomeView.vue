<script setup>
import HeroSection from '../../components/landing/HeroSection.vue'
import { 
    ShoppingBag, 
    Workflow, 
    Building2, 
    Layers 
} from '@lucide/vue'

const modules = [
    {
        title: 'Pengadaan & Pembelian',
        description: 'Pengajuan kebutuhan barang operasional (PR), pembelian langsung (Direct Purchase), hingga pencatatan transaksi yang transparan.',
        icon: ShoppingBag,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        status: 'Aktif',
        statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
        title: 'Persetujuan Berjenjang',
        description: 'Matriks persetujuan bertingkat otomatis sesuai batas nominal dan struktur jabatan, lengkap dengan pemantauan batas waktu (SLA).',
        icon: Workflow,
        color: 'text-amber-600 bg-amber-50 border-amber-100',
        status: 'Aktif',
        statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
        title: 'Master Data & Finansial',
        description: 'Pusat data terpadu untuk profil entitas, departemen, data karyawan, Chart of Accounts (COA), serta rekanan vendor resmi.',
        icon: Building2,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        status: 'Aktif',
        statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
        title: 'Modul Lanjutan',
        description: 'Pondasi sistem siap diperluas untuk pengelolaan inventaris aset kantor, layanan mandiri kepegawaian (HR), dan budgeting divisi.',
        icon: Layers,
        color: 'text-slate-600 bg-slate-100 border-slate-200',
        status: 'Akan Datang',
        statusClass: 'bg-slate-50 text-slate-600 border-slate-200'
    }
]
</script>

<template>
    <div class="w-full flex flex-col">
        <!-- Hero Section -->
        <HeroSection />

        <!-- Seksi Modul Minimalis & Bersih -->
        <div class="max-w-7xl mx-auto w-full px-6 sm:px-8 py-12 md:py-16">
            <section id="fitur-utama" class="pt-6 border-t border-slate-200/70 space-y-8 scroll-mt-24">
                
                <!-- Section Header: Sederhana, Jelas, & Tidak Berlebihan -->
                <div class="max-w-2xl space-y-2">
                    <span class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                        Modul Operasional
                    </span>
                    <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        Dirancang Modular untuk Aktivitas Kerja Harian
                    </h2>
                    <p class="text-sm sm:text-base text-slate-500 leading-relaxed">
                        Setiap proses saling terhubung agar alur kerja antar divisi berjalan rapi, transparan, dan siap berkembang sesuai kebutuhan perusahaan.
                    </p>
                </div>

                <!-- Grid 4 Kartu Minimalis -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div 
                        v-for="item in modules" 
                        :key="item.title"
                        class="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all duration-200"
                    >
                        <div>
                            <!-- Header Kartu: Ikon & Status Badge Halus -->
                            <div class="flex items-center justify-between gap-2 mb-4">
                                <div :class="['w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs', item.color]">
                                    <component :is="item.icon" class="w-5 h-5" />
                                </div>
                                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold border', item.statusClass]">
                                    {{ item.status }}
                                </span>
                            </div>

                            <h3 class="text-base font-bold text-slate-900">
                                {{ item.title }}
                            </h3>

                            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed mt-2">
                                {{ item.description }}
                            </p>
                        </div>
                    </div>
                </div>

            </section>
        </div>

    </div>
</template>