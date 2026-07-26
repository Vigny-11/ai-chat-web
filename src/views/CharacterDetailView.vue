<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import CharacterAvatar from '@/components/CharacterAvatar.vue'
import { useCharacterStore } from '@/stores/character'

const route = useRoute()
const store = useCharacterStore()
onMounted(store.load)
const character = computed(() => store.characters.find((item) => item.id === route.params.id))
const world = computed(() => (character.value ? store.worldFor(character.value.id) : null))
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8">
    <div v-if="character" class="grid gap-6">
      <section class="panel rounded-md p-5">
        <div class="flex items-center gap-4">
          <CharacterAvatar :character="character" :image="store.avatarFor(character)" size="lg" />
          <div>
            <h1 class="text-2xl font-semibold">{{ character.name }}</h1>
            <p class="text-slate-500">{{ character.identity || '未填写身份' }} · {{ character.userRelationship || '关系未设置' }}</p>
          </div>
        </div>
        <div class="mt-5 flex flex-wrap gap-2">
          <RouterLink :to="`/chat/${character.id}`" class="btn-primary">开始聊天</RouterLink>
          <RouterLink :to="`/characters/${character.id}/edit`" class="btn-secondary">编辑角色</RouterLink>
          <RouterLink :to="`/characters/${character.id}/world`" class="btn-secondary">世界观</RouterLink>
          <RouterLink :to="`/characters/${character.id}/outfits`" class="btn-secondary">图片与服装</RouterLink>
        </div>
      </section>
      <section class="grid gap-4 md:grid-cols-2">
        <div class="panel rounded-md p-5"><h2 class="font-semibold">性格预览</h2><p class="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{{ character.personality.mainTraits || '暂未填写。' }}</p></div>
        <div class="panel rounded-md p-5"><h2 class="font-semibold">故事预览</h2><p class="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{{ character.background.story || '暂未填写。' }}</p></div>
        <div class="panel rounded-md p-5 md:col-span-2"><h2 class="font-semibold">世界观预览</h2><p class="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{{ world?.name || '未设置世界名称' }} {{ world?.currentSituation || '' }}</p></div>
      </section>
    </div>
  </main>
</template>
