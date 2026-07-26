<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, PlugZap } from 'lucide-vue-next'
import { detectedAIProvider } from '@/services/aiProvider'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const apiKey = ref(app.apiKey)
const remember = ref(Boolean(app.globalAIConfig?.apiKey))
const showKey = ref(false)
const loading = ref(false)
const tested = ref(app.canUseApi)
const result = ref('')
const failed = ref(false)

const testConnection = async () => {
  const key = apiKey.value.trim()
  if (!key) {
    failed.value = true
    tested.value = false
    result.value = '请输入 API Key'
    return
  }
  loading.value = true
  failed.value = false
  tested.value = false
  const response = await detectedAIProvider.testConnection(key)
  loading.value = false
  if (response.ok) {
    await app.saveGlobalApiKey(key, remember.value)
    app.setDetectedProvider(response.providerId)
    app.markConnectionTested(true)
    tested.value = true
    result.value = '连接成功，可以开始创建角色'
  } else {
    app.setDetectedProvider()
    app.markConnectionTested(false)
    failed.value = true
    result.value = response.message || 'AI 服务暂时不可用，请稍后重试'
  }
}

const start = async () => {
  if (!tested.value) return
  await app.saveGlobalApiKey(apiKey.value, remember.value)
  router.push('/characters/new')
}
</script>

<template>
  <main class="mx-auto flex min-h-[calc(100dvh-65px)] max-w-xl flex-col justify-center px-4 py-10">
    <section class="panel rounded-md p-6 shadow-soft">
      <h1 class="text-3xl font-semibold text-slate-950 dark:text-white">欢迎使用角色世界 AI</h1>
      <p class="mt-3 leading-7 text-slate-600 dark:text-slate-300">
        请输入你的 API Key 以连接 AI 服务。你的 API Key 默认只保存在本设备中。
      </p>

      <div class="mt-6 grid gap-4">
        <label class="grid gap-2">
          <span class="form-label">API Key</span>
          <div class="flex gap-2">
            <input
              v-model="apiKey"
              :type="showKey ? 'text' : 'password'"
              class="form-input"
              autocomplete="off"
              placeholder="请输入 API Key"
              @input="tested = false"
            />
            <button type="button" class="btn-secondary px-3" :title="showKey ? '隐藏 API Key' : '显示 API Key'" @click="showKey = !showKey">
              <EyeOff v-if="showKey" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
        </label>

        <label class="flex items-start gap-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <input v-model="remember" type="checkbox" class="mt-1" />
          <span>记住我的 API Key。请不要在公共设备保存 API Key。</span>
        </label>

        <p v-if="result" :class="['rounded-md p-3 text-sm', failed ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200']">
          {{ result }}
        </p>

        <div class="grid gap-3 sm:grid-cols-2">
          <button class="btn-secondary" :disabled="loading" @click="testConnection">
            <PlugZap class="h-4 w-4" />
            {{ loading ? '正在测试...' : '测试连接' }}
          </button>
          <button class="btn-primary" :disabled="!tested" @click="start">开始使用</button>
        </div>
      </div>
    </section>
  </main>
</template>
