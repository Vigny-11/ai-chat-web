<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Copy, Menu, PanelRight, Pencil, RefreshCcw, Send, Square, Trash2 } from 'lucide-vue-next'
import CharacterAvatar from '@/components/CharacterAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useAppStore } from '@/stores/app'
import { useCharacterStore } from '@/stores/character'
import { useChatStore } from '@/stores/chat'
import { formatDateTime } from '@/utils/format'
import { renderMarkdown } from '@/utils/markdown'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const charStore = useCharacterStore()
const chat = useChatStore()
const input = ref('')
const leftOpen = ref(false)
const rightOpen = ref(false)
const scrollEl = ref<HTMLElement | null>(null)

const character = computed(() => charStore.activeCharacter)
const activeOutfit = computed(() => (character.value ? charStore.outfitsFor(character.value.id).find((o) => o.id === character.value?.activeOutfitId || o.isActive) : undefined))

onMounted(async () => {
  await charStore.load()
  const id = String(route.params.characterId || charStore.characters[0]?.id || '')
  if (id) {
    charStore.activeCharacterId = id
    await chat.loadForCharacter(id)
  }
})

watch(
  () => route.params.characterId,
  async (id) => {
    if (!id) return
    charStore.activeCharacterId = String(id)
    await chat.loadForCharacter(String(id))
  },
)

watch(
  () => chat.messages.length + chat.messages.map((m) => m.content.length).join(','),
  () => nextTick(() => scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight, behavior: 'smooth' })),
)

const send = async () => {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  try {
    await chat.sendMessage(text)
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error))
  }
}

const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send()
  }
}

const chooseCharacter = async (id: string) => {
  router.push(`/chat/${id}`)
  leftOpen.value = false
}

const exportConversation = () => {
  const text = chat.messages.map((m) => `[${formatDateTime(m.createdAt)}] ${m.role === 'user' ? '用户' : m.role === 'assistant' ? character.value?.name || 'AI' : '系统'}：\n${m.content}`).join('\n\n')
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${character.value?.name || '聊天'}_${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const copyText = async (text: string) => {
  await window.navigator.clipboard.writeText(text)
}

const regenerate = async () => {
  const lastUser = [...chat.messages].reverse().find((m) => m.role === 'user')
  if (lastUser) await chat.sendMessage(lastUser.content)
}
</script>

<template>
  <main class="grid h-[calc(100dvh-65px)] overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_320px]">
    <aside :class="['panel fixed inset-y-0 left-0 z-40 w-72 translate-x-[-100%] overflow-y-auto p-4 transition lg:static lg:translate-x-0', leftOpen && 'translate-x-0']">
      <div class="flex items-center justify-between"><h2 class="font-semibold">角色与会话</h2><button class="btn-secondary px-3 lg:hidden" @click="leftOpen=false">关闭</button></div>
      <div class="mt-4 grid gap-2">
        <button v-for="item in charStore.characters" :key="item.id" class="flex items-center gap-3 rounded-md p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-900" @click="chooseCharacter(item.id)">
          <CharacterAvatar :character="item" :image="charStore.avatarFor(item)" size="sm" />
          <span class="truncate text-sm">{{ item.name }}</span>
        </button>
      </div>
      <div v-if="character" class="mt-5">
        <button class="btn-primary w-full" @click="chat.newConversation(character.id)">新建会话</button>
        <div class="mt-3 grid gap-2">
          <button v-for="conv in chat.conversations" :key="conv.id" class="rounded-md p-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900" @click="chat.loadMessages(conv.id)">
            <span class="block truncate">{{ conv.title }}</span>
            <span class="text-xs text-slate-400">{{ formatDateTime(conv.updatedAt) }}</span>
          </button>
        </div>
      </div>
    </aside>
    <section class="flex min-w-0 flex-col">
      <header class="panel flex min-h-16 items-center justify-between gap-3 border-l-0 border-r-0 px-4">
        <button class="btn-secondary px-3 lg:hidden" @click="leftOpen=true"><Menu class="h-4 w-4" /></button>
        <div v-if="character" class="min-w-0 flex-1">
          <h1 class="truncate font-semibold">{{ character.name }}</h1>
          <p class="truncate text-xs text-slate-500">当前服装：{{ activeOutfit?.name || '未设置' }}</p>
        </div>
        <button class="btn-secondary px-3 lg:hidden" @click="rightOpen=true"><PanelRight class="h-4 w-4" /></button>
      </header>
      <div ref="scrollEl" class="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <EmptyState v-if="!character" title="还没有可聊天的角色" description="请先创建角色。" />
        <EmptyState v-else-if="!app.canUseApi" title="AI 服务尚未连接" description="请先输入 API Key 并通过连接测试。" />
        <EmptyState v-else-if="!chat.messages.length" title="开始一段新聊天" description="角色会严格依据资料、世界观、服装和记忆回答。" />
        <div v-else class="mx-auto grid max-w-3xl gap-4">
          <article v-for="msg in chat.messages" :key="msg.id" :class="['flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start']">
            <CharacterAvatar v-if="msg.role === 'assistant' && character" :character="character" :image="charStore.avatarFor(character)" size="sm" />
            <div :class="['max-w-[86%] rounded-md px-4 py-3 text-sm shadow-sm', msg.role === 'user' ? 'bg-moss text-white' : 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100']">
              <div class="markdown" v-html="renderMarkdown(msg.content || (msg.isGenerating ? '正在输入...' : ''))" />
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs opacity-70">
                <span v-if="app.preference?.showMessageTime">{{ formatDateTime(msg.createdAt) }}</span>
                <span v-if="msg.isEdited">已编辑</span>
                <button v-if="msg.role === 'assistant'" @click="copyText(msg.content)"><Copy class="h-3.5 w-3.5" /></button>
                <button v-if="msg.role === 'user'" @click="input = msg.content"><Pencil class="h-3.5 w-3.5" /></button>
                <button @click="chat.removeMessage(msg.id)"><Trash2 class="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </article>
        </div>
      </div>
      <footer class="safe-bottom border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div class="mx-auto max-w-3xl">
          <textarea v-model="input" class="form-input min-h-20 resize-none" maxlength="6000" placeholder="输入消息，Enter 发送，Shift + Enter 换行" @keydown="onKey" />
          <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs text-slate-500">{{ input.length }} / 6000</span>
            <div class="flex gap-2">
              <button class="btn-secondary px-3" @click="exportConversation">导出当前聊天</button>
              <button class="btn-secondary px-3" @click="regenerate"><RefreshCcw class="h-4 w-4" /> 重新生成</button>
              <button v-if="chat.generating" class="btn-danger" @click="chat.stop"><Square class="h-4 w-4" /> 停止生成</button>
              <button v-else class="btn-primary" :disabled="!app.canUseApi || !character || !input.trim()" @click="send"><Send class="h-4 w-4" /> 发送</button>
            </div>
          </div>
        </div>
      </footer>
    </section>
    <aside :class="['panel fixed inset-y-0 right-0 z-40 w-80 translate-x-full overflow-y-auto p-4 transition lg:static lg:translate-x-0', rightOpen && 'translate-x-0']">
      <div class="flex items-center justify-between"><h2 class="font-semibold">角色资料与记忆</h2><button class="btn-secondary px-3 lg:hidden" @click="rightOpen=false">关闭</button></div>
      <div v-if="character" class="mt-4 grid gap-4 text-sm">
        <p><b>关系：</b>{{ character.userRelationship || '未设置' }}</p>
        <p><b>说话方式：</b>{{ character.personality.speechStyle || '未设置' }}</p>
        <p><b>当前目标：</b>{{ character.background.currentGoal || '未设置' }}</p>
        <RouterLink :to="`/memories/${character.id}`" class="btn-secondary">管理长期记忆</RouterLink>
        <button class="btn-danger" @click="chat.clearCurrent">清空当前聊天</button>
      </div>
    </aside>
  </main>
</template>
