<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPermissions } from '../../../services/permissionServices'
import { showRole, syncRolePermissions } from '../../../services/roleServices'
import { showLoading, showSuccess, showError, closeSwal } from '../../../utils/swal'
import PageHeader from '../../../components/ui/PageHeader.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import ToggleSwitch from '../../../components/ui/ToggleSwitch.vue'
import { ShieldCheck, ArrowLeft, Save } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const roleId = route.params.id

const role = ref(null)
const allPermissions = ref([])
const selectedPermissions = ref([])
const isLoading = ref(true)

const fetchInitialData = async () => {
    try {
        isLoading.value = true
        showLoading('Memuat Data...', 'Tunggu sebentar.')
        
        const roleRes = await showRole(roleId)
        role.value = roleRes.data || roleRes.roles
        
        if (role.value && role.value.grouped_permissions) {
            const ids = []
            role.value.grouped_permissions.forEach(group => {
                group.permissions.forEach(p => {
                    ids.push(p.id)
                })
            })
            selectedPermissions.value = ids
        }
        
        const permRes = await getPermissions('', 1, 1000)
        allPermissions.value = permRes.data || []
        
        closeSwal()
    } catch (error) {
        showError('Gagal Memuat!', 'Terjadi kesalahan pada sistem.', error)
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    fetchInitialData()
})

const groupedPermissions = computed(() => {
    const groups = {}
    
    allPermissions.value.forEach(permission => {
        const categoryName = permission.category?.name || 'Uncategorized'
        if (!groups[categoryName]) {
            groups[categoryName] = []
        }
        groups[categoryName].push(permission)
    })
    
    return groups
})

const isPermissionSelected = (id) => {
    return selectedPermissions.value.includes(id)
}

const togglePermission = (id, value) => {
    if (value && !selectedPermissions.value.includes(id)) {
        selectedPermissions.value.push(id)
    } else if (!value && selectedPermissions.value.includes(id)) {
        selectedPermissions.value = selectedPermissions.value.filter(permId => permId !== id)
    }
}

const toggleCategory = (categoryName, value) => {
    const perms = groupedPermissions.value[categoryName] || []
    perms.forEach(p => {
        togglePermission(p.id, value)
    })
}

const isCategoryAllSelected = (categoryName) => {
    const perms = groupedPermissions.value[categoryName] || []
    if (perms.length === 0) return false
    return perms.every(p => selectedPermissions.value.includes(p.id))
}

const savePermissions = async () => {
    try {
        showLoading('Menyimpan Hak Akses...', 'Mohon tunggu sebentar.')
        
        await syncRolePermissions(roleId, selectedPermissions.value)
        
        showSuccess('Tersimpan!', 'Hak akses berhasil diperbarui.')
        setTimeout(() => {
            router.push({ name: 'admin.master.role' })
        }, 1500)
    } catch (error) {
        showError('Gagal Menyimpan!', 'Terjadi kesalahan saat menyimpan hak akses.', error)
    }
}

const goBack = () => {
    router.push({ name: 'admin.master.role' })
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="flex items-center gap-4">
                <button @click="goBack" class="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-indigo-600 transition-colors">
                    <ArrowLeft class="w-5 h-5" />
                </button>
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <ShieldCheck class="w-7 h-7 text-indigo-600" />
                        Manage Permissions
                    </h1>
                    <p class="text-sm text-gray-500 mt-1" v-if="role">Configure access rights for <span class="font-bold text-indigo-600 uppercase">{{ role.name }}</span> role</p>
                </div>
            </div>
            
            <BaseButton @click="savePermissions" class="w-full sm:w-auto shadow-md">
                <Save class="w-4 h-4" />
                Save Changes
            </BaseButton>
        </div>

        <div v-if="!isLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            <div 
                v-for="(permissions, categoryName) in groupedPermissions" 
                :key="categoryName"
                class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:border-indigo-100 transition-colors duration-300"
            >
                <div class="px-5 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="font-bold text-gray-800 capitalize">{{ categoryName.replace('_', ' ') }}</h3>
                    <ToggleSwitch 
                        :modelValue="isCategoryAllSelected(categoryName)"
                        @update:modelValue="(val) => toggleCategory(categoryName, val)"
                    />
                </div>
                <div class="p-5 flex flex-col gap-4 flex-1">
                    <div 
                        v-for="permission in permissions" 
                        :key="permission.id"
                        class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                        <div>
                            <span class="text-sm font-semibold text-gray-700 capitalize">{{ permission.label }}</span>
                            <p class="text-xs text-gray-400 mt-0.5">{{ permission.name }}</p>
                        </div>
                        <ToggleSwitch 
                            :modelValue="isPermissionSelected(permission.id)"
                            @update:modelValue="(val) => togglePermission(permission.id, val)"
                        />
                    </div>
                </div>
            </div>

        </div>
        <div v-else class="flex justify-center items-center h-64">
        </div>

    </div>
</template>
