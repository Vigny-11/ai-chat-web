<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { Bot, Database, MessageSquare, Settings, Users } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useCharacterStore } from '@/stores/character'

const app = useAppStore()
const characters = useCharacterStore()
onMounted(async () => {
  await app.load()
  await characters.load()
})
</script>

<template>
  <div class="min-h-dvh">
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2 font-semibold">
          <Bot class="h-6 w-6 text-moss" />
          <span>AI聊天系统</span>
        </RouterLink>
        <div class="flex items-center gap-1">
          <RouterLink class="btn-secondary px-3" to="/characters" title="角色"><Users class="h-4 w-4" /><span class="hidden sm:inline">角色</span></RouterLink>
          <RouterLink class="btn-secondary px-3" to="/chat" title="聊天"><MessageSquare class="h-4 w-4" /><span class="hidden sm:inline">聊天</span></RouterLink>
          <RouterLink class="btn-secondary px-3" to="/data-management" title="数据"><Database class="h-4 w-4" /><span class="hidden sm:inline">数据</span></RouterLink>
          <RouterLink class="btn-secondary px-3" to="/settings" title="设置"><Settings class="h-4 w-4" /><span class="hidden sm:inline">设置</span></RouterLink>
        </div>
      </nav>
    </header>
    <RouterView />
  </div>
</template>
