<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, ShieldCheck } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useCharacterStore } from '@/stores/character'

const app = useAppStore()
const characters = useCharacterStore()
const next = computed(() => (app.canUseApi ? (characters.characters.length ? '/chat' : '/characters/new') : '/init/api'))
</script>

<template>
  <main class="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.1fr_.9fr] md:py-16">
    <section class="flex flex-col justify-center">
      <p class="mb-3 inline-flex w-fit items-center gap-2 rounded-md bg-moss/10 px-3 py-1 text-sm text-moss"><ShieldCheck class="h-4 w-4" /> 数据默认保存在本设备</p>
      <h1 class="text-4xl font-semibold tracking-normal text-slate-950 dark:text-white md:text-5xl">AI聊天系统</h1>
      <p class="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
        创建属于你的中文 AI 角色，管理世界观、服装、聊天记录和成长型长期记忆。所有角色共用同一个全局 API Key，不需要登录和后台。
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <RouterLink :to="next" class="btn-primary"><ArrowRight class="h-4 w-4" /> 开始使用</RouterLink>
        <RouterLink to="/data-management" class="btn-secondary">导入备份</RouterLink>
      </div>
    </section>
    <section class="panel rounded-md p-5 shadow-soft">
      <h2 class="text-lg font-semibold">首次使用流程</h2>
      <ol class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <li class="rounded-md bg-slate-50 p-3 dark:bg-slate-900">1. 输入一个全局 API Key。</li>
        <li class="rounded-md bg-slate-50 p-3 dark:bg-slate-900">2. 测试连接成功后创建角色与世界观。</li>
        <li class="rounded-md bg-slate-50 p-3 dark:bg-slate-900">3. 进入聊天，系统会按设定边界生成中文回复。</li>
        <li class="rounded-md bg-slate-50 p-3 dark:bg-slate-900">4. 长期记忆会定期提取，也可以手动管理。</li>
      </ol>
    </section>
  </main>
</template>
