<script setup>
import { RouterLink } from 'vue-router'
import PageHeader from '../../components/ui/PageHeader.vue'
import {
    LayoutDashboard,
    Building2,
    Users,
    Landmark,
    Coins,
    Receipt,
    Truck,
    Package,
    Scale,
    GitMerge,
    ArrowRight,
    ShieldCheck
} from '@lucide/vue'

const coreModules = [
    {
        name: 'Master Pajak (Taxes)',
        description: 'Tarif PPN, PPh, metode inklusif/eksklusif, dan akun COA terkait.',
        to: 'admin.master.tax',
        icon: Receipt,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        badge: 'Baru'
    },
    {
        name: 'Mata Uang (Currencies)',
        description: 'Kelola valuta asing, nilai kurs harian, dan valuta dasar (IDR).',
        to: 'admin.master.currency',
        icon: Coins,
        color: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
        name: 'Akun Akuntansi (COA)',
        description: 'Bagan akun buku besar (Chart of Accounts) dan klasifikasi.',
        to: 'admin.master.accounting-account',
        icon: Landmark,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
        name: 'Perusahaan (Companies)',
        description: 'Kelola entitas anak usaha dan data legalitas perseroan.',
        to: 'admin.master.company',
        icon: Building2,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
        name: 'Karyawan (Employees)',
        description: 'Data pegawai, NIK, jabatan, dan divisi penempatan.',
        to: 'admin.master.employee',
        icon: Users,
        color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
        name: 'Pengguna & Akun (Users)',
        description: 'Kelola kredensial login, peran (roles), dan hak akses sistem.',
        to: 'admin.master.user',
        icon: ShieldCheck,
        color: 'text-slate-600 bg-slate-100 border-slate-200'
    }
]

const procurementModules = [
    {
        name: 'Pemasok (Suppliers)',
        description: 'Master vendor pengadaan, kontak, rekening bank, dan dokumen legal.',
        to: 'admin.master.supplier',
        icon: Truck,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
        name: 'Master Barang (Items)',
        description: 'Katalog barang dan suku cadang pengadaan operasional.',
        to: 'admin.master.item',
        icon: Package,
        color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
        name: 'Satuan Unit (Units)',
        description: 'Standar ukuran satuan barang (Pcs, Box, Kg, Meter, dll).',
        to: 'admin.master.unit',
        icon: Scale,
        color: 'text-teal-600 bg-teal-50 border-teal-200'
    },
    {
        name: 'Alur Persetujuan (Approvals)',
        description: 'Pengaturan multi-tier approval matrix dan peninjau dokumen.',
        to: 'admin.settings.approval',
        icon: GitMerge,
        color: 'text-violet-600 bg-violet-50 border-violet-200'
    }
]
</script>

<template>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- 1. Header -->
        <PageHeader
            title="Panel Administrasi ERP"
            description="Pusat konfigurasi master data perusahaan, keuangan, pengadaan, dan alur persetujuan sistem."
        >
            <template #icon>
                <div class="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <LayoutDashboard class="w-6 h-6" />
                </div>
            </template>
        </PageHeader>

        <!-- 2. Master Data Core Section -->
        <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div>
                    <h2 class="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Master Data Utama & Finansial (Core)</span>
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Konfigurasi perpajakan, valuta, bagan akun, dan struktur organisasi
                    </p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <RouterLink
                    v-for="mod in coreModules"
                    :key="mod.name"
                    :to="{ name: mod.to }"
                    class="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div :class="['w-10 h-10 rounded-xl border flex items-center justify-center', mod.color]">
                                <component :is="mod.icon" class="w-5 h-5" />
                            </div>
                            <span
                                v-if="mod.badge"
                                class="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full"
                            >
                                {{ mod.badge }}
                            </span>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {{ mod.name }}
                            </h3>
                            <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                                {{ mod.description }}
                            </p>
                        </div>
                    </div>

                    <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                        <span>Kelola Data</span>
                        <ArrowRight class="w-4 h-4" />
                    </div>
                </RouterLink>
            </div>
        </div>

        <!-- 3. Master Data Purchasing & Settings Section -->
        <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <div>
                    <h2 class="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Master Data Pengadaan & Pengaturan</span>
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Konfigurasi mitra vendor, katalog material barang, dan matriks peninjau
                    </p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <RouterLink
                    v-for="mod in procurementModules"
                    :key="mod.name"
                    :to="{ name: mod.to }"
                    class="p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div :class="['w-10 h-10 rounded-xl border flex items-center justify-center', mod.color]">
                                <component :is="mod.icon" class="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                {{ mod.name }}
                            </h3>
                            <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                                {{ mod.description }}
                            </p>
                        </div>
                    </div>

                    <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                        <span>Kelola Data</span>
                        <ArrowRight class="w-4 h-4" />
                    </div>
                </RouterLink>
            </div>
        </div>
    </div>
</template>
