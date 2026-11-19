import { computed, ref } from 'vue'

const isRouteLoading = ref(false)
const showRoutePill = ref(false)
const routeLoadingLabel = ref('Membuka halaman…')
const activeApiCount = ref(0)

let pillTimer = null
let safetyTimer = null

const clearRouteTimers = () => {
  if (pillTimer) {
    clearTimeout(pillTimer)
    pillTimer = null
  }
  if (safetyTimer) {
    clearTimeout(safetyTimer)
    safetyTimer = null
  }
}

export const startRouteLoading = (label = '') => {
  clearRouteTimers()
  isRouteLoading.value = true
  routeLoadingLabel.value = label ? `Membuka ${label}…` : 'Membuka halaman…'

  pillTimer = setTimeout(() => {
    if (isRouteLoading.value) {
      showRoutePill.value = true
    }
  }, 120)

  safetyTimer = setTimeout(() => {
    finishRouteLoading()
  }, 15000)
}

export const finishRouteLoading = () => {
  clearRouteTimers()
  isRouteLoading.value = false
  showRoutePill.value = false
}

export const startApiLoading = () => {
  activeApiCount.value += 1
}

export const finishApiLoading = () => {
  activeApiCount.value = Math.max(0, activeApiCount.value - 1)
}

export const isAppLoading = computed(() => isRouteLoading.value || activeApiCount.value > 0)

export const useAppLoader = () => ({
  isRouteLoading,
  showRoutePill,
  routeLoadingLabel,
  activeApiCount,
  isAppLoading,
  startRouteLoading,
  finishRouteLoading,
  startApiLoading,
  finishApiLoading,
})
