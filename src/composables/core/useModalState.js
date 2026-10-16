import { ref } from 'vue'

/**
 * Standardized modal state management composable for ERP Frontend views & components.
 *
 * @param {any} initialData - Optional initial edit/modal data
 * @returns {Object} Reactive state and helper functions for modal lifecycle
 */
export function useModalState(initialData = null) {
    const isOpen = ref(false)
    const isEditing = ref(false)
    const editId = ref(null)
    const editData = ref(initialData)
    const isLoading = ref(false)

    const openCreate = (defaultData = null) => {
        isEditing.value = false
        editId.value = null
        editData.value = defaultData
        isOpen.value = true
    }

    const openEdit = (item, idKey = 'id') => {
        isEditing.value = true
        editId.value = item?.[idKey] ?? item
        editData.value = item
        isOpen.value = true
    }

    const closeModal = () => {
        isOpen.value = false
        isEditing.value = false
        editId.value = null
        editData.value = null
        isLoading.value = false
    }

    const toggle = (val) => {
        if (typeof val === 'boolean') {
            isOpen.value = val
        } else {
            isOpen.value = !isOpen.value
        }
    }

    return {
        isOpen,
        isEditing,
        editId,
        editData,
        isLoading,
        openCreate,
        openEdit,
        closeModal,
        toggle,
    }
}
