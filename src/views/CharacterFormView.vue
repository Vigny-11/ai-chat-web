<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CharacterFormFields from '@/components/CharacterFormFields.vue'
import { blankCharacter, useCharacterStore } from '@/stores/character'

const route = useRoute()
const router = useRouter()
const store = useCharacterStore()
const character = ref(blankCharacter())
const error = ref('')
const isEdit = computed(() => route.name === 'character-edit')

onMounted(async () => {
  await store.load()
  const found = store.characters.find((item) => item.id === route.params.id)
  if (found) character.value = structuredClone(found)
})

const save = async () => {
  if (!character.value.name.trim()) {
    error.value = '角色名字必须填写。'
    return
  }
  const saved = await store.saveCharacter(character.value, store.worldFor(character.value.id))
  router.push(`/characters/${saved.id}`)
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="text-2xl font-semibold">{{ isEdit ? '编辑角色' : '创建角色' }}</h1>
    <div v-if="error" class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{{ error }}</div>
    <form class="panel mt-6 rounded-md p-5" @submit.prevent="save">
      <CharacterFormFields v-model="character" />
      <div class="mt-6 flex flex-wrap gap-3">
        <button class="btn-primary">保存角色</button>
        <button type="button" class="btn-secondary" @click="router.back()">返回</button>
      </div>
    </form>
  </main>
</template>
