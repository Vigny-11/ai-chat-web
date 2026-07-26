<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import type { WorldSetting } from '@/types'

const fields: Array<[keyof WorldSetting, string]> = [
  ['name', '世界名称'],
  ['era', '故事发生年代'],
  ['type', '世界类型'],
  ['places', '国家和城市'],
  ['rules', '社会规则'],
  ['technology', '科技水平'],
  ['magicSystem', '魔法或特殊能力体系'],
  ['history', '历史事件'],
  ['organizations', '重要组织'],
  ['taboos', '世界禁忌'],
  ['currentSituation', '当前世界局势'],
]
const route = useRoute()
const router = useRouter()
const store = useCharacterStore()
const world = ref<WorldSetting | null>(null)
const characterId = String(route.params.id)

onMounted(async () => {
  await store.load()
  world.value = structuredClone(store.worldFor(characterId))
})

const save = async () => {
  const character = store.characters.find((item) => item.id === characterId)
  if (character && world.value) await store.saveCharacter(character, world.value)
  router.push(`/characters/${characterId}`)
}
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8">
    <h1 class="text-2xl font-semibold">世界观编辑</h1>
    <form v-if="world" class="panel mt-6 grid gap-4 rounded-md p-5" @submit.prevent="save">
      <label v-for="[key, label] in fields" :key="key" class="grid gap-2">
        <span class="form-label">{{ label }}</span>
        <textarea v-model="(world as any)[key]" class="form-input min-h-24" />
      </label>
      <div class="flex gap-3">
        <button class="btn-primary">保存世界观</button>
        <button type="button" class="btn-secondary" @click="router.back()">返回</button>
      </div>
    </form>
  </main>
</template>
