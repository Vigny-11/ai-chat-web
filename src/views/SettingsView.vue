<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
onMounted(app.load)

</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8">
    <h1 class="text-2xl font-semibold">设置</h1>

    <section class="panel mt-6 rounded-md p-5">
      <h2 class="font-semibold">AI 设置</h2>
      <p class="mt-3 text-sm">
        AI连接状态
        <span :class="app.canUseApi ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500'">
          {{ app.canUseApi ? '● 已连接' : '○ 未连接' }}
        </span>
      </p>
      <p v-if="app.maskedApiKey" class="mt-2 text-sm text-slate-500">当前 API Key：{{ app.maskedApiKey }}</p>
      <button class="btn-secondary mt-4" @click="router.push('/init/api')">修改 API Key</button>
      <details class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        <summary class="cursor-pointer">高级 AI 设置</summary>
        <p class="mt-2">当前版本隐藏开发者参数，后续可扩展自定义模型、自定义接口和参数调整。</p>
      </details>
    </section>

    <section v-if="app.preference" class="panel mt-6 grid gap-4 rounded-md p-5">
      <h2 class="font-semibold">聊天设置</h2>
      <label class="flex items-center gap-2"><input v-model="app.preference.autoMemory" type="checkbox" @change="app.savePreference({ autoMemory: app.preference?.autoMemory })" /> 自动记忆</label>
      <label class="grid gap-2"><span class="form-label">自动记忆提取间隔</span><input v-model.number="app.preference.memoryInterval" type="number" min="4" class="form-input" @change="app.savePreference({ memoryInterval: app.preference?.memoryInterval })" /></label>
      <label class="grid gap-2"><span class="form-label">最近上下文消息数量</span><input v-model.number="app.preference.recentContextCount" type="number" min="4" class="form-input" @change="app.savePreference({ recentContextCount: app.preference?.recentContextCount })" /></label>
      <label class="grid gap-2"><span class="form-label">每次加载最大记忆数量</span><input v-model.number="app.preference.maxRelevantMemories" type="number" min="1" class="form-input" @change="app.savePreference({ maxRelevantMemories: app.preference?.maxRelevantMemories })" /></label>
      <label class="flex items-center gap-2"><input v-model="app.preference.showMessageTime" type="checkbox" @change="app.savePreference({ showMessageTime: app.preference?.showMessageTime })" /> 显示消息时间</label>
      <label class="flex items-center gap-2"><input v-model="app.preference.typingAnimation" type="checkbox" @change="app.savePreference({ typingAnimation: app.preference?.typingAnimation })" /> 启用打字动画</label>
    </section>

    <section v-if="app.preference" class="panel mt-6 grid gap-4 rounded-md p-5">
      <h2 class="font-semibold">界面设置</h2>
      <select v-model="app.preference.theme" class="form-input" @change="app.savePreference({ theme: app.preference?.theme })"><option value="system">跟随系统</option><option value="light">浅色模式</option><option value="dark">深色模式</option></select>
      <select v-model="app.preference.fontSize" class="form-input" @change="app.savePreference({ fontSize: app.preference?.fontSize })"><option value="small">小字体</option><option value="medium">中字体</option><option value="large">大字体</option></select>
      <select v-model="app.preference.bubbleSize" class="form-input" @change="app.savePreference({ bubbleSize: app.preference?.bubbleSize })"><option value="compact">紧凑气泡</option><option value="comfortable">舒适气泡</option><option value="wide">宽气泡</option></select>
      <label class="flex items-center gap-2"><input v-model="app.preference.compactMobile" type="checkbox" @change="app.savePreference({ compactMobile: app.preference?.compactMobile })" /> 手机端紧凑模式</label>
    </section>

    <section class="panel mt-6 rounded-md p-5">
      <h2 class="font-semibold">数据设置</h2>
      <p class="mt-2 text-sm text-slate-500">查看本地数据大小、导出备份、导入备份和配置云端同步。</p>
      <button class="btn-secondary mt-4" @click="router.push('/data-management')">打开数据管理</button>
    </section>
  </main>
</template>
