<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { MessageSquare, Plus, Trash2 } from 'lucide-vue-next'
import CharacterAvatar from '@/components/CharacterAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useCharacterStore } from '@/stores/character'
import { formatDateTime } from '@/utils/format'

const store = useCharacterStore()
onMounted(store.load)
const remove = async (id: string) => {
  if (confirm('确定删除这个角色及其会话、记忆和图片吗？此操作不可恢复。')) await store.deleteCharacter(id)
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">角色列表</h1>
      <RouterLink to="/characters/new" class="btn-primary"><Plus class="h-4 w-4" /> 创建角色</RouterLink>
    </div>
    <EmptyState v-if="!store.characters.length" class="mt-6" title="还没有角色" description="连接 API 后，可以创建第一个角色并开始聊天。">
      <RouterLink to="/characters/new" class="btn-primary">创建第一个角色</RouterLink>
    </EmptyState>
    <div v-else class="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <article v-for="character in store.characters" :key="character.id" class="panel rounded-md p-4">
        <div class="flex items-start gap-3">
          <CharacterAvatar :character="character" :image="store.avatarFor(character)" />
          <div class="min-w-0 flex-1">
            <h2 class="truncate font-semibold">{{ character.name }}</h2>
            <p class="text-sm text-slate-500">{{ character.identity || character.occupation || '未填写身份' }}</p>
            <p class="mt-1 text-xs text-slate-400">更新于 {{ formatDateTime(character.updatedAt) }}</p>
          </div>
        </div>
        <p class="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{{ character.background.story || character.personality.mainTraits || '暂未填写角色简介。' }}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <RouterLink :to="`/chat/${character.id}`" class="btn-primary px-3"><MessageSquare class="h-4 w-4" /> 聊天</RouterLink>
          <RouterLink :to="`/characters/${character.id}`" class="btn-secondary px-3">详情</RouterLink>
          <RouterLink :to="`/characters/${character.id}/edit`" class="btn-secondary px-3">编辑</RouterLink>
          <button class="btn-danger px-3" @click="remove(character.id)"><Trash2 class="h-4 w-4" /></button>
        </div>
      </article>
    </div>
  </main>
</template>
