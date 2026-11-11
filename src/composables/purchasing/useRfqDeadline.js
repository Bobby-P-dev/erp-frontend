import { ref, onMounted, onUnmounted } from 'vue'
import { rfqDeadlineInfo } from '@/utils/rfqDeadline.js'

export function useRfqDeadline() {
    const tick = ref(0)
    const snapshots = new WeakMap()
    let timer
    onMounted(() => { timer = setInterval(() => { tick.value++ }, 1000) })
    onUnmounted(() => clearInterval(timer))
    const getDeadlineInfo = (rfq) => {
        void tick.value
        if (!rfq || typeof rfq !== 'object') return rfqDeadlineInfo(null)
        if (!snapshots.has(rfq)) snapshots.set(rfq, performance.now())
        return rfqDeadlineInfo(rfq, performance.now() - snapshots.get(rfq))
    }
    return { getDeadlineInfo }
}
