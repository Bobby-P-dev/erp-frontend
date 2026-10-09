<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
    PenTool,
    Upload,
    RotateCcw,
    Check,
    X,
    Loader2,
    AlertCircle,
    Info
} from '@lucide/vue'
import { uploadUserSignature } from '../../services/userServices.js'
import { useAuthStore } from '../../stores/auth.js'
import Swal from 'sweetalert2'

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        default: 'Spesimen Tanda Tangan Digital',
    },
})

const emit = defineEmits(['close', 'saved'])

const authStore = useAuthStore()

const activeTab = ref('canvas') // 'canvas' | 'upload'
const canvasRef = ref(null)
const isDrawing = ref(false)
const hasDrawn = ref(false)
const selectedFile = ref(null)
const filePreviewUrl = ref(null)
const fileInputRef = ref(null)
const isSubmitting = ref(false)
const errorMessage = ref('')

let ctx = null

const initCanvas = () => {
    nextTick(() => {
        const canvas = canvasRef.value
        if (!canvas) return

        // Set proper canvas resolution matching bounding client rect
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height

        ctx = canvas.getContext('2d')
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 2.5
        ctx.strokeStyle = '#0f172a' // Slate-900 high contrast ink

        clearCanvas()
    })
}

const clearCanvas = () => {
    if (!ctx || !canvasRef.value) return
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    hasDrawn.value = false
    errorMessage.value = ''
}

const getPointerPos = (e) => {
    const canvas = canvasRef.value
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
        x: clientX - rect.left,
        y: clientY - rect.top,
    }
}

const startDrawing = (e) => {
    if (!ctx) return
    e.preventDefault()
    isDrawing.value = true
    const pos = getPointerPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
}

const draw = (e) => {
    if (!isDrawing.value || !ctx) return
    e.preventDefault()
    const pos = getPointerPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    hasDrawn.value = true
}

const stopDrawing = (e) => {
    if (isDrawing.value && ctx) {
        ctx.closePath()
        isDrawing.value = false
    }
}

const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
        errorMessage.value = 'Format berkas harus berupa PNG, JPG, JPEG, atau WebP.'
        return
    }

    if (file.size > 5 * 1024 * 1024) {
        errorMessage.value = 'Ukuran berkas tanda tangan maksimal 5MB.'
        return
    }

    errorMessage.value = ''
    selectedFile.value = file
    filePreviewUrl.value = URL.createObjectURL(file)
}

const removeSelectedFile = () => {
    selectedFile.value = null
    if (filePreviewUrl.value) {
        URL.revokeObjectURL(filePreviewUrl.value)
        filePreviewUrl.value = null
    }
    if (fileInputRef.value) {
        fileInputRef.value.value = ''
    }
}

const handleSave = async () => {
    errorMessage.value = ''

    if (activeTab.value === 'canvas') {
        if (!hasDrawn.value) {
            errorMessage.value = 'Silakan goreskan tanda tangan Anda pada kanvas terlebih dahulu.'
            return
        }

        try {
            isSubmitting.value = true
            const base64Data = canvasRef.value.toDataURL('image/png')
            const res = await uploadUserSignature({ signature_base64: base64Data })
            
            const updatedUser = res.data || res.user || {}
            authStore.updateUserSignature(true, updatedUser.signature_url, updatedUser.signature_file_id)

            Swal.fire({
                icon: 'success',
                title: 'Tanda Tangan Tersimpan',
                text: 'Spesimen tanda tangan digital berhasil diperbarui di profil Anda.',
                timer: 2000,
                showConfirmButton: false,
            })

            emit('saved', updatedUser)
            emit('close')
        } catch (err) {
            console.error(err)
            errorMessage.value = err.response?.data?.message || 'Gagal menyimpan tanda tangan. Silakan coba lagi.'
        } finally {
            isSubmitting.value = false
        }
    } else {
        if (!selectedFile.value) {
            errorMessage.value = 'Silakan pilih berkas gambar tanda tangan terlebih dahulu.'
            return
        }

        try {
            isSubmitting.value = true
            const res = await uploadUserSignature({ signature_file: selectedFile.value })

            const updatedUser = res.data || res.user || {}
            authStore.updateUserSignature(true, updatedUser.signature_url, updatedUser.signature_file_id)

            Swal.fire({
                icon: 'success',
                title: 'Tanda Tangan Tersimpan',
                text: 'Berkas tanda tangan resmi berhasil diunggah ke profil Anda.',
                timer: 2000,
                showConfirmButton: false,
            })

            emit('saved', updatedUser)
            emit('close')
        } catch (err) {
            console.error(err)
            errorMessage.value = err.response?.data?.message || 'Gagal mengunggah berkas tanda tangan. Silakan coba lagi.'
        } finally {
            isSubmitting.value = false
        }
    }
}

watch(
    () => props.isOpen,
    (open) => {
        if (open) {
            errorMessage.value = ''
            if (activeTab.value === 'canvas') {
                initCanvas()
            }
        } else {
            removeSelectedFile()
        }
    }
)

watch(
    activeTab,
    (tab) => {
        errorMessage.value = ''
        if (tab === 'canvas' && props.isOpen) {
            initCanvas()
        }
    }
)
</script>

<template>
    <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 transition-opacity"
        @click.self="$emit('close')"
    >
        <div
            class="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div class="flex items-center gap-2.5">
                    <div class="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                        <PenTool class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-900">{{ title }}</h3>
                        <p class="text-xs text-slate-500">Spesimen resmi tanda tangan digital untuk persetujuan dokumen</p>
                    </div>
                </div>
                <button
                    type="button"
                    @click="$emit('close')"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Tab Switcher -->
            <div class="px-6 pt-4 pb-2">
                <div class="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <button
                        type="button"
                        @click="activeTab = 'canvas'"
                        class="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer"
                        :class="activeTab === 'canvas' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'"
                    >
                        <PenTool class="w-3.5 h-3.5" />
                        Gores Langsung (Canvas Pad)
                    </button>
                    <button
                        type="button"
                        @click="activeTab = 'upload'"
                        class="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer"
                        :class="activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'"
                    >
                        <Upload class="w-3.5 h-3.5" />
                        Unggah Berkas Gambar
                    </button>
                </div>
            </div>

            <!-- Error Banner -->
            <div v-if="errorMessage" class="mx-6 mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
                <AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p class="text-xs font-medium text-rose-700 leading-relaxed">{{ errorMessage }}</p>
            </div>

            <!-- Body: Canvas Mode -->
            <div v-show="activeTab === 'canvas'" class="p-6 pt-3 space-y-3">
                <div class="flex items-center justify-between text-xs text-slate-500">
                    <span class="flex items-center gap-1.5 font-medium">
                        <Info class="w-3.5 h-3.5 text-blue-500" />
                        Goreskan tanda tangan Anda dengan mouse atau sentuhan layar
                    </span>
                    <button
                        type="button"
                        @click="clearCanvas"
                        class="inline-flex items-center gap-1 text-slate-600 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
                    >
                        <RotateCcw class="w-3.5 h-3.5" />
                        Bersihkan
                    </button>
                </div>

                <div class="relative w-full h-48 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors overflow-hidden">
                    <canvas
                        ref="canvasRef"
                        class="w-full h-full cursor-crosshair touch-none"
                        @mousedown="startDrawing"
                        @mousemove="draw"
                        @mouseup="stopDrawing"
                        @mouseleave="stopDrawing"
                        @touchstart="startDrawing"
                        @touchmove="draw"
                        @touchend="stopDrawing"
                    ></canvas>
                    <div
                        v-if="!hasDrawn"
                        class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs gap-1"
                    >
                        <PenTool class="w-6 h-6 stroke-1 text-slate-300" />
                        <span>Goreskan tanda tangan di sini</span>
                    </div>
                </div>

                <p class="text-[11px] text-slate-400 leading-relaxed">
                    Spesimen ini akan otomatis disematkan pada setiap dokumen persetujuan pengadaan yang Anda setujui.
                </p>
            </div>

            <!-- Body: Upload Mode -->
            <div v-show="activeTab === 'upload'" class="p-6 pt-3 space-y-3">
                <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    class="hidden"
                    @change="handleFileSelect"
                />

                <div
                    v-if="!filePreviewUrl"
                    @click="$refs.fileInputRef?.click()"
                    class="w-full h-48 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
                >
                    <div class="p-3 rounded-full bg-white shadow-xs border border-slate-200 group-hover:border-blue-300 group-hover:scale-105 transition-all text-slate-500 group-hover:text-blue-600 mb-2">
                        <Upload class="w-6 h-6" />
                    </div>
                    <p class="text-xs font-semibold text-slate-800">Klik untuk memilih berkas tanda tangan</p>
                    <p class="text-[11px] text-slate-400 mt-1">PNG, JPG, atau WebP (Disarankan latar belakang transparan)</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">Maksimal ukuran file: 5MB</p>
                </div>

                <div v-else class="relative w-full h-48 bg-slate-50 rounded-lg border border-slate-200 p-4 flex flex-col items-center justify-center">
                    <img :src="filePreviewUrl" alt="Signature Preview" class="max-h-36 max-w-full object-contain" />
                    <button
                        type="button"
                        @click="removeSelectedFile"
                        class="absolute top-2 right-2 p-1.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Hapus berkas"
                    >
                        <X class="w-4 h-4" />
                    </button>
                    <p class="text-[11px] font-medium text-slate-600 mt-2 truncate max-w-xs">{{ selectedFile?.name }}</p>
                </div>

                <p class="text-[11px] text-slate-400 leading-relaxed">
                    Pastikan tanda tangan jelas, kontras tinggi, dan tidak buram untuk hasil cetak PDF resmi terbaik.
                </p>
            </div>

            <!-- Footer Actions -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                <button
                    type="button"
                    @click="$emit('close')"
                    class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    Batal
                </button>
                <button
                    type="button"
                    @click="handleSave"
                    :disabled="isSubmitting || (activeTab === 'canvas' ? !hasDrawn : !selectedFile)"
                    class="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                    <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
                    <Check v-else class="w-4 h-4" />
                    Simpan Tanda Tangan
                </button>
            </div>
        </div>
    </div>
</template>
