<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '@/database/db'
import { useCharacterStore } from '@/stores/character'
import type { Memory, MemoryType } from '@/types'
import { createId, nowIso } from '@/utils/id'

const route = useRoute()
const charStore = useCharacterStore()
const memories = ref<Memory[]>([])
const query = ref('')
const type = ref<MemoryType | 'all'>('all')
const characterId = computed(() => String(route.params.characterId || charStore.activeCharacterId || charStore.characters[0]?.id || ''))
const form = reactive({ title: '', content: '', type: 'user' as MemoryType, importance: 3 })

const load = async () => {
  await charStore.load()
  if (!characterId.value) return
  memories.value = await db.memories.where('characterId').equals(characterId.value).reverse().sortBy('updatedAt')
}
onMounted(load)

const filtered = computed(() =>
  memories.value.filter((m) => (type.value === 'all' || m.type === type.value) && `${m.title}${m.content}`.includes(query.value.trim())),
)

const add = async () => {
  if (!form.title.trim() || !form.content.trim() || !characterId.value) return
  const time = nowIso()
  await db.memories.add({
    id: createId('mem'),
    characterId: characterId.value,
    type: form.type,
    title: form.title,
    content: form.content,
    importance: form.importance,
    createdAt: time,
    updatedAt: time,
    pinned: false,
    enabled: true,
    allowAIUse: true,
  })
  Object.assign(form, { title: '', content: '', type: 'user', importance: 3 })
  await load()
}

const patch = async (memory: Memory, changes: Partial<Memory>) => {
  await db.memories.put({ ...memory, ...changes, updatedAt: nowIso() })
  await load()
}
const remove = async (id: string) => {
  if (confirm('确定删除这条记忆吗？')) {
    await db.memories.delete(id)
    await load()
  }
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="text-2xl font-semibold">记忆管理</h1>
    <section class="panel mt-6 rounded-md p-5">
      <h2 class="font-semibold">手动添加记忆</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-4">
        <select v-model="form.type" class="form-input"><option value="user">用户信息</option><option value="relationship">关系记忆</option><option value="character_growth">角色成长</option><option value="world_event">世界事件</option></select>
        <input v-model="form.title" class="form-input" placeholder="记忆标题" />
        <input v-model.number="form.importance" type="number" min="1" max="5" class="form-input" />
        <button class="btn-primary" @click="add">添加记忆</button>
        <textarea v-model="form.content" class="form-input min-h-24 md:col-span-4" placeholder="记忆内容" />
      </div>
    </section>
    <section class="mt-6 flex flex-wrap gap-3">
      <input v-model="query" class="form-input max-w-sm" placeholder="搜索记忆" />
      <select v-model="type" class="form-input max-w-48"><option value="all">全部类型</option><option value="user">用户信息</option><option value="relationship">关系记忆</option><option value="character_growth">角色成长</option><option value="world_event">世界事件</option></select>
    </section>
    <div class="mt-4 grid gap-3">
      <article v-for="memory in filtered" :key="memory.id" class="panel rounded-md p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <input v-model="memory.title" class="form-input max-w-sm font-semibold" @change="patch(memory, { title: memory.title })" />
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary px-3" @click="patch(memory, { pinned: !memory.pinned })">{{ memory.pinned ? '取消固定' : '固定' }}</button>
            <button class="btn-secondary px-3" @click="patch(memory, { enabled: !memory.enabled })">{{ memory.enabled ? '暂时禁用' : '启用' }}</button>
            <button class="btn-secondary px-3" @click="patch(memory, { allowAIUse: !memory.allowAIUse })">{{ memory.allowAIUse ? '禁止 AI 使用' : '允许 AI 使用' }}</button>
            <button class="btn-danger px-3" @click="remove(memory.id)">删除</button>
          </div>
        </div>
        <textarea v-model="memory.content" class="form-input mt-3 min-h-24" @change="patch(memory, { content: memory.content })" />
        <p class="mt-2 text-xs text-slate-500">类型：{{ memory.type }} · 重要程度：{{ memory.importance }} · 来源消息：{{ memory.sourceMessageId || '手动添加' }}</p>
      </article>
    </div>
  </main>
</template>
