import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './index.css'
import 'overlayscrollbars/overlayscrollbars.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Initialize theme store immediately to apply theme before rendering
import { useThemeStore } from './stores/themeStore'
const themeStore = useThemeStore()

app.mount('#app')