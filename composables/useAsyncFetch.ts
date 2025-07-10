import { ref } from 'vue'

export function useAsyncFetch<T>() {
  const data = ref<T | null>(null)
  const error = ref<any>(null)
  const isLoading = ref(false)

  async function fetch(url: string, options: Parameters<typeof $fetch>[1] = {}) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $fetch<T>(url, options)
      data.value = response
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    data,
    error,
    isLoading,
    fetch
  }
} 