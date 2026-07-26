<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ImagePlus, Shirt } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import { useCharacterStore } from '@/stores/character'
import type { CharacterImage, Outfit } from '@/types'
import { compressImage } from '@/utils/image'
import { createId, nowIso } from '@/utils/id'

const route = useRoute()
const store = useCharacterStore()
const characterId = String(route.params.id)
const error = ref('')
const outfit = reactive<Partial<Outfit>>({ name: '', isActive: false })
const outfitImage = ref<{ dataUrl: string; mimeType: string } | null>(null)

const character = computed(() => store.characters.find((item) => item.id === characterId))
const outfits = computed(() => store.outfitsFor(characterId))
onMounted(store.load)

const uploadCharacterImage = async (event: Event, kind: 'avatar' | 'fullbody') => {
  try {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const image = await compressImage(file)
    const time = nowIso()
    const record: CharacterImage = { id: createId('img'), characterId, kind, ...image, createdAt: time, updatedAt: time }
    await store.setImage(record)
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

const uploadOutfitImage = async (event: Event) => {
  try {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    outfitImage.value = await compressImage(file)
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

const saveOutfit = async () => {
  if (!outfit.name?.trim()) {
    error.value = '服装名称必须填写。'
    return
  }
  const time = nowIso()
  await store.saveOutfit({
    id: createId('outfit'),
    characterId,
    name: outfit.name,
    type: outfit.type,
    occasion: outfit.occasion,
    period: outfit.period,
    designBackground: outfit.designBackground,
    details: outfit.details,
    description: outfit.details || outfit.designBackground,
    background: outfit.designBackground,
    accessories: outfit.accessories,
    hairstyle: outfit.hairstyle,
    isActive: Boolean(outfit.isActive),
    current: Boolean(outfit.isActive),
    image: outfitImage.value?.dataUrl,
    imageDataUrl: outfitImage.value?.dataUrl,
    mimeType: outfitImage.value?.mimeType,
    createdAt: time,
    updatedAt: time,
  })
  Object.assign(outfit, { name: '', type: '', occasion: '', period: '', designBackground: '', details: '', accessories: '', hairstyle: '', isActive: false })
  outfitImage.value = null
}

const setActive = async (item: Outfit) => store.saveOutfit({ ...item, isActive: true })
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="text-2xl font-semibold">图片与服装管理</h1>
    <p v-if="character" class="mt-1 text-slate-500">当前角色：{{ character.name }}</p>
    <div v-if="error" class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{{ error }}</div>
    <section class="panel mt-6 rounded-md p-5">
      <h2 class="font-semibold">角色图片</h2>
      <p class="mt-1 text-sm text-slate-500">支持 JPG、JPEG、PNG、WebP，单张最大 6MB，保存前会自动压缩。</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <label class="btn-secondary cursor-pointer"><ImagePlus class="h-4 w-4" /> 上传头像<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="uploadCharacterImage($event, 'avatar')" /></label>
        <label class="btn-secondary cursor-pointer"><ImagePlus class="h-4 w-4" /> 上传全身图<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="uploadCharacterImage($event, 'fullbody')" /></label>
      </div>
      <div class="mt-4 grid gap-4 md:grid-cols-4">
        <img v-for="image in store.imagesFor(characterId)" :key="image.id" :src="image.dataUrl" loading="lazy" class="aspect-square rounded-md object-cover" />
      </div>
    </section>
    <section class="panel mt-6 rounded-md p-5">
      <h2 class="font-semibold">新增服装</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <label class="grid gap-2"><span class="form-label">服装名称 *</span><input v-model="outfit.name" class="form-input" /></label>
        <label class="grid gap-2"><span class="form-label">服装类型</span><input v-model="outfit.type" class="form-input" /></label>
        <label class="grid gap-2"><span class="form-label">穿着场合</span><input v-model="outfit.occasion" class="form-input" /></label>
        <label class="grid gap-2"><span class="form-label">所属时期</span><input v-model="outfit.period" class="form-input" /></label>
        <label class="grid gap-2"><span class="form-label">饰品</span><input v-model="outfit.accessories" class="form-input" /></label>
        <label class="grid gap-2"><span class="form-label">发型</span><input v-model="outfit.hairstyle" class="form-input" /></label>
        <label class="grid gap-2 md:col-span-3"><span class="form-label">服装设计背景</span><textarea v-model="outfit.designBackground" class="form-input min-h-20" /></label>
        <label class="grid gap-2 md:col-span-3"><span class="form-label">服装细节</span><textarea v-model="outfit.details" class="form-input min-h-20" /></label>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <label class="btn-secondary cursor-pointer"><ImagePlus class="h-4 w-4" /> 选择服装图片<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="uploadOutfitImage" /></label>
        <label class="flex items-center gap-2 text-sm"><input v-model="outfit.isActive" type="checkbox" /> 设为当前服装</label>
        <button class="btn-primary" @click="saveOutfit"><Shirt class="h-4 w-4" /> 保存服装</button>
      </div>
    </section>
    <section class="mt-6">
      <EmptyState v-if="!outfits.length" title="还没有服装" description="可以添加多套服装，聊天时当前服装会写入角色提示词。" />
      <div v-else class="grid gap-4 md:grid-cols-3">
        <article v-for="item in outfits" :key="item.id" class="panel rounded-md p-4">
          <img v-if="item.imageDataUrl" :src="item.imageDataUrl" loading="lazy" class="aspect-[4/3] w-full rounded-md object-cover" />
          <h3 class="mt-3 font-semibold">{{ item.name }}</h3>
          <p class="text-sm text-slate-500">{{ item.type || '未填写类型' }} · {{ item.period || '时期未填写' }}</p>
          <p class="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{{ item.details || item.designBackground || '暂无说明。' }}</p>
          <button class="mt-3 btn-secondary w-full" :disabled="item.isActive" @click="setActive(item)">{{ item.isActive ? '当前使用中' : '切换为当前服装' }}</button>
        </article>
      </div>
    </section>
  </main>
</template>
