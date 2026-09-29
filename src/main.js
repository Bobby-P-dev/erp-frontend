import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './style.css'

import App from './App.vue'
import router from './routers/index.js'

import { useAuthStore } from './stores/auth'
import BaseBreadcrumb from './components/ui/BaseBreadcrumb.vue'

const app = createApp(App)

app.component('BaseBreadcrumb', BaseBreadcrumb)

const pinia = createPinia()

app.use(pinia)

const authStore = useAuthStore(pinia)

await authStore.initializeAuth()

app.use(router)

app.mount('#app')