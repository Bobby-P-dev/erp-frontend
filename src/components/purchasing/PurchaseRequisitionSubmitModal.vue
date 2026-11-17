<script setup>
import { computed, ref, watch } from 'vue'
import { GitBranch, Loader2, Send } from '@lucide/vue'
import BaseModal from '../ui/BaseModal.vue'
import BaseSelect from '../ui/BaseSelect.vue'
import ApprovalStepper from '../approval/ApprovalStepper.vue'
import { getApprovalConfigurations } from '../../services/approval/approvalConfigServices.js'
import { submitPurchaseRequisition } from '../../services/purchaseRequisitionServices.js'

const props = defineProps({ modelValue: Boolean, item: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'submitted'])
const configurations = ref([])
const selectedId = ref('')
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
let loadVersion = 0
const options = computed(() => configurations.value.map(config => ({
    value: config.id, label: config.name, subtitle: config.code,
})))
const selected = computed(() => configurations.value.find(config => config.id === selectedId.value))
const levels = computed(() => [...(selected.value?.levels || [])].sort((a, b) => a.step_order - b.step_order))

const load = async () => {
    const version = ++loadVersion
    configurations.value = []
    selectedId.value = ''
    error.value = ''
    loading.value = true
    try {
        // Read all pages; never offer mock workflows for a real submission.
        const list = []
        let page = 1
        let lastPage = 1
        do {
            const response = await getApprovalConfigurations({
                document_type: 'purchase_requisition', is_active: true, per_page: 100, page,
            }, undefined, undefined, { allowMock: false })
            list.push(...(response.data || []))
            lastPage = Number(response.meta?.last_page || 1)
            page++
        } while (page <= lastPage && version === loadVersion)
        if (version !== loadVersion) return
        configurations.value = list.filter(config => config.is_active && config.levels?.length &&
            (!config.company_id || String(config.company_id) === String(props.item?.company_id || props.item?.company?.id)))
    } catch (err) {
        if (version === loadVersion) error.value = err.response?.data?.message || 'Gagal memuat workflow. Silakan coba lagi.'
    } finally {
        if (version === loadVersion) loading.value = false
    }
}
watch(() => [props.modelValue, props.item?.id], ([open]) => {
    if (open) load()
    else loadVersion++
})
const close = () => { if (!submitting.value) emit('update:modelValue', false) }
const submit = async () => {
    if (loading.value || submitting.value || !selected.value || !props.item?.id) return
    submitting.value = true
    error.value = ''
    try {
        await submitPurchaseRequisition(props.item.id, { approval_configuration_id: selectedId.value })
        emit('submitted', props.item)
        emit('update:modelValue', false)
    } catch (err) {
        error.value = err.response?.data?.message || 'PR belum berhasil diajukan. Periksa workflow lalu coba lagi.'
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <BaseModal :model-value="modelValue" title="Ajukan PR untuk persetujuan" :subtitle="item?.pr_number"
        :icon="GitBranch" size="2xl" :close-on-backdrop="!submitting" :close-on-escape="!submitting"
        @update:model-value="close">
        <div class="space-y-5">
            <p class="text-sm leading-relaxed text-slate-600">Pilih workflow yang sesuai, lalu periksa urutan persetujuannya. Data PR tidak dapat diubah setelah diajukan.</p>
            <p v-if="loading" role="status" class="flex items-center gap-2 text-sm text-slate-600"><Loader2 class="size-4 animate-spin" /> Memuat workflow persetujuan…</p>
            <template v-else>
                <BaseSelect v-model="selectedId" label="Workflow persetujuan" :options="options" required
                    placeholder="Pilih workflow persetujuan" :disabled="submitting || !options.length" />
                <p v-if="!options.length && !error" role="status" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Belum ada workflow PR aktif untuk perusahaan ini. Hubungi administrator untuk mengaturnya.</p>
                <div v-if="selected" class="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <p class="mb-4 text-sm font-semibold text-slate-800">Urutan persetujuan · {{ levels.length }} tahap</p>
                    <ApprovalStepper :levels="levels" orientation="vertical" />
                </div>
            </template>
            <div v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
            <button v-if="!loading && !configurations.length" type="button" class="text-sm font-semibold text-[#014BAA]" @click="load">Muat ulang workflow</button>
        </div>
        <template #footer>
            <div class="flex w-full flex-wrap justify-end gap-3">
                <button type="button" class="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50" :disabled="submitting" @click="close">Batal</button>
                <button type="button" class="flex items-center gap-2 rounded-xl bg-[#014BAA] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="loading || submitting || !selected" @click="submit">
                    <Loader2 v-if="submitting" class="size-4 animate-spin" /><Send v-else class="size-4" />{{ submitting ? 'Mengajukan…' : 'Ajukan PR' }}
                </button>
            </div>
        </template>
    </BaseModal>
</template>
