<script setup>
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
</script>

<template>
    <section>

        <div class="mb-8">
            <p class="text-sm text-gray-500">
                User Portal
            </p>

            <h1 class="mt-1 text-3xl font-bold text-gray-900">
                Welcome, {{ authStore.profile?.name }}
            </h1>

            <p class="mt-2 text-gray-600">
                Selamat datang di ERP System.
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div class="bg-white border rounded-xl p-6">
                <p class="text-sm text-gray-500">
                    Company
                </p>

                <p class="mt-2 font-semibold">
                    {{ authStore.profile?.company?.name }}
                </p>
            </div>

            <div class="bg-white border rounded-xl p-6">
                <p class="text-sm text-gray-500">
                    Division
                </p>

                <p class="mt-2 font-semibold">
                    {{ authStore.profile?.division?.name }}
                </p>
            </div>

            <div class="bg-white border rounded-xl p-6">
                <p class="text-sm text-gray-500">
                    Position
                </p>

                <p class="mt-2 font-semibold">
                    {{ authStore.profile?.position?.name }}
                </p>
            </div>

        </div>

    </section>
</template>