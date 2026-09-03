import Swal from 'sweetalert2'

export const showLoading = (title = 'Memproses Data...', text = 'Mohon tunggu sebentar.') => {
    Swal.fire({
        title: title,
        text: text,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading()
        }
    })
}

export const showSuccess = (title = 'Berhasil!', text = 'Data berhasil disimpan.') => {
    Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        confirmButtonColor: '#4f46e5',
        timer: 2000,
        timerProgressBar: true
    })
}

export const showError = (title = 'Gagal!', text = 'Terjadi kesalahan pada sistem.', error = null) => {
    let errorMessage = text
    if (error && error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message
    }

    Swal.fire({
        icon: 'error',
        title: title,
        text: errorMessage,
        confirmButtonColor: '#4f46e5'
    })
}

export const closeSwal = () => {
    Swal.close()
}

export const showConfirm = async (title = 'Apakah Anda yakin?', text = 'Data ini akan dihapus permanen!') => {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', 
        cancelButtonColor: '#6b7280', 
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        return result.isConfirmed
    })
}

