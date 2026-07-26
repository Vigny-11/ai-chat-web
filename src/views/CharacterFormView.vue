<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ImagePlus, Save } from 'lucide-vue-next'
import { buildSimpleCharacterPrompt } from '@/prompts/buildSimpleCharacterPrompt'
import { blankCharacter, blankWorld, useCharacterStore } from '@/stores/character'
import type { Character, CharacterImage, WorldSetting } from '@/types'
import { compressImage } from '@/utils/image'
import { createId, nowIso } from '@/utils/id'

const personalityOptions = ['温柔', '冷静', '活泼', '傲娇', '成熟', '幽默', '神秘', '严格']
const speakingOptions = ['温柔', '正式', '幽默', '二次元', '专业']

const route = useRoute()
const router = useRouter()
const store = useCharacterStore()
const error = ref('')
const avatarPreview = ref('')
const avatarFile = ref<{ dataUrl: string; mimeType: string } | null>(null)
const isEdit = computed(() => route.name === 'character-edit')

const form = reactive({
  id: '',
  characterName: '',
  identity: '',
  selectedPersonalities: [] as string[],
  customPersonality: '',
  worldSetting: '',
  characterDescription: '',
  backgroundStory: '',
  likes: '',
  dislikes: '',
  speakingStyle: '',
})

const fillFromCharacter = (character: Character, world: WorldSetting) => {
  form.id = character.id
  form.characterName = character.characterName || character.name
  form.identity = character.identity || ''
  const traits = (character.personality.mainTraits || '').split(/[，,、\n]/).map((item) => item.trim()).filter(Boolean)
  form.selectedPersonalities = traits.filter((item) => personalityOptions.includes(item))
  form.customPersonality = traits.filter((item) => !personalityOptions.includes(item)).join('，')
  form.worldSetting = character.worldSetting || world.description || world.currentSituation || ''
  form.characterDescription = character.characterDescription || character.background.story || ''
  form.backgroundStory = character.backgroundStory || character.background.majorEvents || ''
  form.likes = character.likes || character.personality.likes || ''
  form.dislikes = character.dislikes || character.personality.dislikes || ''
  form.speakingStyle = character.speakingStyle || character.personality.speechStyle || ''
}

onMounted(async () => {
  await store.load()
  const found = store.characters.find((item) => item.id === route.params.id)
  if (found) {
    fillFromCharacter(structuredClone(found), store.worldFor(found.id))
    const avatar = store.avatarFor(found)
    if (avatar) avatarPreview.value = avatar.dataUrl
  } else {
    form.id = blankCharacter().id
  }
})

const togglePersonality = (item: string) => {
  if (form.selectedPersonalities.includes(item)) {
    form.selectedPersonalities = form.selectedPersonalities.filter((value) => value !== item)
  } else {
    form.selectedPersonalities.push(item)
  }
}

const uploadAvatar = async (event: Event) => {
  try {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    avatarFile.value = await compressImage(file)
    avatarPreview.value = avatarFile.value.dataUrl
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '头像上传失败。'
  }
}

const personalityText = () => [...form.selectedPersonalities, form.customPersonality.trim()].filter(Boolean).join('，')

const validate = () => {
  if (!form.characterName.trim()) return '请填写角色名称。'
  if (!form.identity.trim()) return '请填写角色身份/定位。'
  if (!personalityText()) return '请选择或填写性格特点。'
  if (!form.worldSetting.trim()) return '请填写世界观背景。'
  if (!form.characterDescription.trim()) return '请填写角色简介。'
  return ''
}

const save = async () => {
  const validation = validate()
  if (validation) {
    error.value = validation
    return
  }

  const existing = store.characters.find((item) => item.id === form.id)
  const time = nowIso()
  const world: WorldSetting = {
    ...(existing ? store.worldFor(existing.id) : blankWorld(form.id)),
    characterId: form.id,
    name: `${form.characterName}的世界`,
    description: form.worldSetting.trim(),
    currentSituation: form.worldSetting.trim(),
    updatedAt: time,
  }

  const character: Character = {
    ...(existing || blankCharacter()),
    id: form.id,
    name: form.characterName.trim(),
    characterName: form.characterName.trim(),
    identity: form.identity.trim(),
    personality: {
      ...(existing?.personality ?? {}),
      mainTraits: personalityText(),
      likes: form.likes.trim(),
      dislikes: form.dislikes.trim(),
      speechStyle: form.speakingStyle.trim(),
    },
    background: {
      ...(existing?.background ?? {}),
      story: form.characterDescription.trim(),
      majorEvents: form.backgroundStory.trim(),
    },
    worldSetting: form.worldSetting.trim(),
    characterDescription: form.characterDescription.trim(),
    backgroundStory: form.backgroundStory.trim(),
    likes: form.likes.trim(),
    dislikes: form.dislikes.trim(),
    speakingStyle: form.speakingStyle.trim(),
    createdAt: existing?.createdAt ?? time,
    updatedAt: time,
  }
  character.aiSystemPrompt = buildSimpleCharacterPrompt(character, world)

  const saved = await store.saveCharacter(character, world)
  if (avatarFile.value) {
    const avatar: CharacterImage = {
      id: createId('img'),
      characterId: saved.id,
      kind: 'avatar',
      dataUrl: avatarFile.value.dataUrl,
      mimeType: avatarFile.value.mimeType,
      note: '角色头像',
      createdAt: time,
      updatedAt: time,
    }
    await store.setImage(avatar)
  }
  router.push(`/characters/${saved.id}`)
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">{{ isEdit ? '编辑角色' : '创建角色' }}</h1>
        <p class="mt-2 text-sm text-slate-500">只填写最关键的信息，就可以开始和角色聊天。</p>
      </div>
      <button class="btn-primary" @click="save"><Save class="h-4 w-4" /> 保存角色</button>
    </div>

    <div v-if="error" class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{{ error }}</div>

    <form class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" @submit.prevent="save">
      <section class="grid gap-5">
        <div class="panel rounded-md p-5">
          <h2 class="font-semibold">基础信息</h2>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <label class="grid gap-2">
              <span class="form-label">角色名称 *</span>
              <input v-model="form.characterName" class="form-input" placeholder="例如：艾莉丝" />
            </label>
            <label class="grid gap-2">
              <span class="form-label">角色身份/定位 *</span>
              <input v-model="form.identity" class="form-input" placeholder="例如：魔法学院学生、未来机器人助手" />
            </label>
          </div>

          <div class="mt-4 grid gap-2">
            <span class="form-label">性格特点 *</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in personalityOptions"
                :key="item"
                type="button"
                :class="['btn-secondary px-3', form.selectedPersonalities.includes(item) && 'border-moss bg-moss/10 text-moss']"
                @click="togglePersonality(item)"
              >
                {{ item }}
              </button>
            </div>
            <textarea v-model="form.customPersonality" class="form-input min-h-24" placeholder="也可以补充自定义性格描述，例如：喜欢帮助别人，但是不喜欢表达感情。" />
          </div>

          <label class="mt-4 grid gap-2">
            <span class="form-label">世界观背景 *</span>
            <textarea v-model="form.worldSetting" class="form-input min-h-28" placeholder="这是一个魔法与科技共存的世界，人类和人工智能共同生活。" />
          </label>

          <label class="mt-4 grid gap-2">
            <span class="form-label">角色简介 *</span>
            <textarea v-model="form.characterDescription" class="form-input min-h-28" placeholder="艾莉丝是一名来自天空城的魔法研究员。" />
          </label>
        </div>

        <div class="panel rounded-md p-5">
          <h2 class="font-semibold">详细设定</h2>
          <p class="mt-1 text-sm text-slate-500">这些内容可以跳过，之后也能回来补充。</p>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 md:col-span-2">
              <span class="form-label">人物经历</span>
              <textarea v-model="form.backgroundStory" class="form-input min-h-28" />
            </label>
            <label class="grid gap-2">
              <span class="form-label">喜欢</span>
              <textarea v-model="form.likes" class="form-input min-h-24" />
            </label>
            <label class="grid gap-2">
              <span class="form-label">讨厌</span>
              <textarea v-model="form.dislikes" class="form-input min-h-24" />
            </label>
            <label class="grid gap-2 md:col-span-2">
              <span class="form-label">说话方式</span>
              <select v-model="form.speakingStyle" class="form-input">
                <option value="">暂不设置</option>
                <option v-for="item in speakingOptions" :key="item" :value="item">{{ item }}</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <aside class="grid h-fit gap-5">
        <div class="panel rounded-md p-5">
          <h2 class="font-semibold">角色图片</h2>
          <p class="mt-1 text-sm text-slate-500">头像不是必须。支持 JPG、PNG、WebP，会自动压缩保存。</p>
          <div class="mt-4 flex flex-col items-center gap-4">
            <img v-if="avatarPreview" :src="avatarPreview" alt="角色头像预览" class="h-28 w-28 rounded-full object-cover" />
            <div v-else class="flex h-28 w-28 items-center justify-center rounded-full bg-moss/15 text-3xl font-semibold text-moss">
              {{ form.characterName.slice(0, 1) || '角' }}
            </div>
            <label class="btn-secondary cursor-pointer">
              <ImagePlus class="h-4 w-4" /> 上传头像
              <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="uploadAvatar" />
            </label>
          </div>
        </div>

        <div class="panel rounded-md p-5">
          <h2 class="font-semibold">服装设计</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            保存角色后，可以在角色详情页进入“图片与服装”，继续添加服装名称、服装图片和服装背景描述。
          </p>
        </div>

        <div class="panel rounded-md p-5">
          <h2 class="font-semibold">AI Prompt 预览</h2>
          <p class="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {{ buildSimpleCharacterPrompt({
              ...blankCharacter(),
              name: form.characterName,
              characterName: form.characterName,
              identity: form.identity,
              personality: { mainTraits: personalityText(), likes: form.likes, dislikes: form.dislikes, speechStyle: form.speakingStyle },
              background: { story: form.characterDescription, majorEvents: form.backgroundStory },
              worldSetting: form.worldSetting,
              characterDescription: form.characterDescription,
              backgroundStory: form.backgroundStory,
              likes: form.likes,
              dislikes: form.dislikes,
              speakingStyle: form.speakingStyle,
            }, { ...blankWorld(form.id || 'preview'), description: form.worldSetting, currentSituation: form.worldSetting }) }}
          </p>
        </div>
      </aside>
    </form>
  </main>
</template>
