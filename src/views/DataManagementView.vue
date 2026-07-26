<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Cloud, Download, HardDrive, RefreshCw, Upload } from 'lucide-vue-next'
import { db } from '@/database/db'
import { useAppStore } from '@/stores/app'
import type { BackupData, ImportPreview, LocalDataStats } from '@/types'
import { downloadBlob } from '@/utils/format'
import { backupFilename, createImportPreview, parseBackupZip } from '@/services/storage/backupFiles'
import { cloudSyncService } from '@/services/storage/CloudSyncService'
import { localStorageService } from '@/services/storage/LocalStorageService'

const app = useAppStore()
const stats = ref<LocalDataStats>({ characters: 0, conversations: 0, messages: 0, memories: 0, images: 0, bytes: 0 })
const pending = ref<BackupData | null>(null)
const preview = ref<ImportPreview | null>(null)
const importMode = ref<'merge' | 'overwrite'>('merge')
const localResult = ref('')
const cloudResult = ref('')
const cloudLoading = ref(false)

const spaceText = computed(() => {
  if (stats.value.bytes > 1024 * 1024) return `${(stats.value.bytes / 1024 / 1024).toFixed(1)} MB`
  if (stats.value.bytes > 1024) return `${(stats.value.bytes / 1024).toFixed(1)} KB`
  return `${stats.value.bytes} B`
})

const loadStats = async () => {
  stats.value = await localStorageService.getStats()
}

onMounted(async () => {
  await app.load()
  await loadStats()
})

const exportLocal = async () => {
  downloadBlob(await localStorageService.exportData(), backupFilename())
  localResult.value = '本地备份已导出。'
}

const inspectLocal = async (event: Event) => {
  try {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    pending.value = await parseBackupZip(file)
    preview.value = createImportPreview(pending.value)
    localResult.value = '备份检查通过，请选择导入方式。'
  } catch (error) {
    pending.value = null
    preview.value = null
    localResult.value = error instanceof Error ? error.message : '备份文件无法读取。'
  }
}

const importLocal = async () => {
  if (!pending.value) return
  if (importMode.value === 'overwrite' && !window.confirm('覆盖当前数据会清除现有角色、聊天和记忆，确定继续吗？')) return
  await localStorageService.importData(pending.value, importMode.value)
  await loadStats()
  localResult.value = '导入完成。API Key 未从备份中恢复。'
}

const saveCloudConfig = async () => {
  if (!app.syncConfig) return
  await app.saveSyncConfig({
    enabled: app.syncConfig.enabled,
    serverUrl: app.syncConfig.serverUrl,
    accessToken: app.syncConfig.accessToken,
    syncPath: app.syncConfig.syncPath,
  })
}

const testCloud = async () => {
  if (!app.syncConfig) return
  cloudLoading.value = true
  await saveCloudConfig()
  const result = await cloudSyncService.testConnection(app.syncConfig)
  cloudResult.value = result.message
  cloudLoading.value = false
}

const uploadCloud = async () => {
  if (!app.syncConfig) return
  cloudLoading.value = true
  try {
    await saveCloudConfig()
    await localStorageService.syncUpload(app.syncConfig)
    await app.saveSyncConfig({ lastSyncAt: new Date().toISOString() })
    cloudResult.value = '上传到云端完成。API Key 未包含在同步数据中。'
  } catch (error) {
    cloudResult.value = error instanceof Error ? error.message : '上传失败。'
  } finally {
    cloudLoading.value = false
  }
}

const downloadCloud = async () => {
  if (!app.syncConfig) return
  cloudLoading.value = true
  try {
    await saveCloudConfig()
    const backup = await localStorageService.syncDownload(app.syncConfig)
    const info = createImportPreview(backup)
    const ok = window.confirm(`发现云端备份：角色 ${info.characters} 个，聊天 ${info.messages} 条，记忆 ${info.memories} 条，图片 ${info.images} 张。是否合并到当前数据？`)
    if (ok) {
      await localStorageService.importData(backup, 'merge')
      await app.saveSyncConfig({ lastSyncAt: new Date().toISOString() })
      await loadStats()
      cloudResult.value = '从云端恢复完成。请在新设备上重新输入 API Key。'
    }
  } catch (error) {
    cloudResult.value = error instanceof Error ? error.message : '下载失败。'
  } finally {
    cloudLoading.value = false
  }
}

const clearAll = async () => {
  if (window.confirm('确定清除所有本地数据吗？此操作不可恢复。') && window.confirm('请再次确认：角色、聊天、记忆和设置都会删除。')) {
    await Promise.all([db.characters.clear(), db.images.clear(), db.outfits.clear(), db.worlds.clear(), db.conversations.clear(), db.messages.clear(), db.memories.clear(), db.preferences.clear()])
    await loadStats()
    localResult.value = '本地数据已清除。'
  }
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="text-2xl font-semibold">数据管理</h1>
    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">默认保存在本设备。你可以导出备份，也可以同步到自己的服务器；系统不提供官方云端账号。</p>

    <section class="panel mt-6 rounded-md p-5">
      <div class="flex items-center gap-2">
        <HardDrive class="h-5 w-5 text-moss" />
        <h2 class="font-semibold">本地数据</h2>
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div class="rounded-md bg-slate-50 p-4 dark:bg-slate-900"><p class="text-sm text-slate-500">角色</p><p class="mt-1 text-2xl font-semibold">{{ stats.characters }}个</p></div>
        <div class="rounded-md bg-slate-50 p-4 dark:bg-slate-900"><p class="text-sm text-slate-500">聊天记录</p><p class="mt-1 text-2xl font-semibold">{{ stats.messages }}条</p></div>
        <div class="rounded-md bg-slate-50 p-4 dark:bg-slate-900"><p class="text-sm text-slate-500">长期记忆</p><p class="mt-1 text-2xl font-semibold">{{ stats.memories }}条</p></div>
        <div class="rounded-md bg-slate-50 p-4 dark:bg-slate-900"><p class="text-sm text-slate-500">图片</p><p class="mt-1 text-2xl font-semibold">{{ stats.images }}张</p></div>
        <div class="rounded-md bg-slate-50 p-4 dark:bg-slate-900"><p class="text-sm text-slate-500">占用空间</p><p class="mt-1 text-2xl font-semibold">{{ spaceText }}</p></div>
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <button class="btn-primary" @click="exportLocal"><Download class="h-4 w-4" /> 导出本地备份</button>
        <label class="btn-secondary cursor-pointer"><Upload class="h-4 w-4" /> 从本地备份恢复<input type="file" accept=".zip" class="hidden" @change="inspectLocal" /></label>
        <button class="btn-danger" @click="clearAll">清除本地数据</button>
      </div>

      <div v-if="preview" class="mt-5 rounded-md bg-slate-50 p-4 text-sm dark:bg-slate-900">
        <p class="font-medium">发现：</p>
        <p class="mt-2">角色：{{ preview.characters }}个</p>
        <p>聊天：{{ preview.messages }}条</p>
        <p>记忆：{{ preview.memories }}条</p>
        <p>图片：{{ preview.images }}张</p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <select v-model="importMode" class="form-input max-w-48"><option value="overwrite">覆盖当前数据</option><option value="merge">合并到当前数据</option></select>
          <button class="btn-primary" @click="importLocal">确认导入</button>
        </div>
      </div>
      <p v-if="localResult" class="mt-4 rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900">{{ localResult }}</p>
    </section>

    <section class="panel mt-6 rounded-md p-5">
      <div class="flex items-center gap-2">
        <Cloud class="h-5 w-5 text-moss" />
        <h2 class="font-semibold">云端服务器同步</h2>
      </div>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">这里不是官方服务器。请填写你自己的服务器，不需要注册账号。</p>
      <div v-if="app.syncConfig" class="mt-4 grid gap-4 md:grid-cols-3">
        <label class="grid gap-2"><span class="form-label">服务器地址</span><input v-model="app.syncConfig.serverUrl" class="form-input" placeholder="https://你的服务器" @change="saveCloudConfig" /></label>
        <label class="grid gap-2"><span class="form-label">访问密钥</span><input v-model="app.syncConfig.accessToken" type="password" class="form-input" placeholder="访问密钥" @change="saveCloudConfig" /></label>
        <label class="grid gap-2"><span class="form-label">同步路径</span><input v-model="app.syncConfig.syncPath" class="form-input" placeholder="/backup/role-world.zip" @change="saveCloudConfig" /></label>
      </div>
      <div class="mt-5 flex flex-wrap gap-3">
        <button class="btn-secondary" :disabled="cloudLoading" @click="testCloud"><RefreshCw class="h-4 w-4" /> 测试服务器连接</button>
        <button class="btn-primary" :disabled="cloudLoading" @click="uploadCloud"><Upload class="h-4 w-4" /> 上传到云端</button>
        <button class="btn-secondary" :disabled="cloudLoading" @click="downloadCloud"><Download class="h-4 w-4" /> 从云端恢复</button>
      </div>
      <p v-if="app.syncConfig?.lastSyncAt" class="mt-3 text-xs text-slate-500">最近同步时间：{{ new Date(app.syncConfig.lastSyncAt).toLocaleString('zh-CN') }}</p>
      <p v-if="cloudResult" class="mt-4 rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900">{{ cloudResult }}</p>
    </section>
  </main>
</template>
