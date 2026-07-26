import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db, ensureDefaults } from '@/database/db'
import type { GlobalAIConfig, ServerSyncConfig, UserPreference } from '@/types'
import { maskApiKey } from '@/utils/format'

const API_KEY_SESSION = 'role_world_ai_session_key'
const PROVIDER_SESSION = 'role_world_ai_provider'

export const useAppStore = defineStore('app', () => {
  const ready = ref(false)
  const globalAIConfig = ref<GlobalAIConfig | null>(null)
  const preference = ref<UserPreference | null>(null)
  const syncConfig = ref<ServerSyncConfig | null>(null)
  const sessionApiKey = ref(sessionStorage.getItem(API_KEY_SESSION) || '')
  const detectedProviderId = ref(sessionStorage.getItem(PROVIDER_SESSION) || '')
  const connectionTested = ref(false)

  const apiKey = computed(() => sessionApiKey.value || globalAIConfig.value?.apiKey || '')
  const hasApiKey = computed(() => Boolean(apiKey.value.trim()))
  const canUseApi = computed(() => hasApiKey.value && connectionTested.value)
  const aiStatusText = computed(() => (canUseApi.value ? '已连接' : '未连接'))
  const maskedApiKey = computed(() => maskApiKey(apiKey.value))

  const load = async () => {
    await ensureDefaults()
    globalAIConfig.value = (await db.globalAIConfigs.get('global')) ?? null
    preference.value = (await db.preferences.get('default')) ?? null
    syncConfig.value = (await db.syncConfigs.get('default')) ?? null
    connectionTested.value = hasApiKey.value
    applyTheme()
    ready.value = true
  }

  const saveGlobalApiKey = async (key: string, remember: boolean) => {
    const clean = key.trim()
    sessionApiKey.value = clean
    sessionStorage.setItem(API_KEY_SESSION, clean)
    const now = Date.now()
    if (remember) {
      const existing = await db.globalAIConfigs.get('global')
      globalAIConfig.value = {
        id: 'global',
        apiKey: clean,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await db.globalAIConfigs.put(globalAIConfig.value)
    } else {
      await db.globalAIConfigs.delete('global')
      globalAIConfig.value = null
    }
  }

  const markConnectionTested = (tested: boolean) => {
    connectionTested.value = tested
  }

  const setDetectedProvider = (providerId?: string) => {
    detectedProviderId.value = providerId ?? ''
    if (providerId) sessionStorage.setItem(PROVIDER_SESSION, providerId)
    else sessionStorage.removeItem(PROVIDER_SESSION)
  }

  const clearApiKey = async () => {
    sessionApiKey.value = ''
    connectionTested.value = false
    sessionStorage.removeItem(API_KEY_SESSION)
    sessionStorage.removeItem(PROVIDER_SESSION)
    await db.globalAIConfigs.delete('global')
    globalAIConfig.value = null
  }

  const savePreference = async (patch: Partial<UserPreference>) => {
    if (!preference.value) return
    preference.value = { ...preference.value, ...patch, updatedAt: new Date().toISOString() }
    await db.preferences.put(preference.value)
    applyTheme()
  }

  const saveSyncConfig = async (patch: Partial<ServerSyncConfig>) => {
    if (!syncConfig.value) return
    syncConfig.value = { ...syncConfig.value, ...patch, updatedAt: new Date().toISOString() }
    await db.syncConfigs.put(syncConfig.value)
  }

  const applyTheme = () => {
    const theme = preference.value?.theme ?? 'system'
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  }

  return {
    ready,
    globalAIConfig,
    preference,
    syncConfig,
    sessionApiKey,
    apiKey,
    hasApiKey,
    canUseApi,
    aiStatusText,
    maskedApiKey,
    detectedProviderId,
    connectionTested,
    load,
    saveGlobalApiKey,
    markConnectionTested,
    setDetectedProvider,
    clearApiKey,
    savePreference,
    saveSyncConfig,
    applyTheme,
  }
})
