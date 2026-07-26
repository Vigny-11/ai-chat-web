import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/database/db'
import type { Character, CharacterImage, Outfit, WorldSetting } from '@/types'
import { createId, nowIso } from '@/utils/id'

export const blankCharacter = (): Character => {
  const time = nowIso()
  return {
    id: createId('char'),
    createdAt: time,
    updatedAt: time,
    name: '',
    personality: {},
    background: {},
  }
}

export const blankWorld = (characterId: string): WorldSetting => {
  const time = nowIso()
  return { id: createId('world'), characterId, createdAt: time, updatedAt: time }
}

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<Character[]>([])
  const worlds = ref<WorldSetting[]>([])
  const outfits = ref<Outfit[]>([])
  const images = ref<CharacterImage[]>([])
  const activeCharacterId = ref<string>('')

  const activeCharacter = computed(() => characters.value.find((item) => item.id === activeCharacterId.value))

  const load = async () => {
    characters.value = await db.characters.orderBy('updatedAt').reverse().toArray()
    worlds.value = await db.worlds.toArray()
    outfits.value = await db.outfits.toArray()
    images.value = await db.images.toArray()
    if (!activeCharacterId.value && characters.value[0]) activeCharacterId.value = characters.value[0].id
  }

  const saveCharacter = async (character: Character, world?: WorldSetting) => {
    const time = nowIso()
    const next = { ...character, updatedAt: time }
    if (!next.createdAt) next.createdAt = time
    await db.characters.put(next)
    if (world) await db.worlds.put({ ...world, characterId: next.id, updatedAt: time })
    await load()
    activeCharacterId.value = next.id
    return next
  }

  const deleteCharacter = async (id: string) => {
    await db.transaction('rw', [db.characters, db.worlds, db.images, db.outfits, db.conversations, db.messages, db.memories], async () => {
      const conversations = await db.conversations.where('characterId').equals(id).toArray()
      await db.messages.bulkDelete((await Promise.all(conversations.map((c) => db.messages.where('conversationId').equals(c.id).primaryKeys()))).flat() as string[])
      await db.conversations.where('characterId').equals(id).delete()
      await db.memories.where('characterId').equals(id).delete()
      await db.images.where('characterId').equals(id).delete()
      await db.outfits.where('characterId').equals(id).delete()
      await db.worlds.where('characterId').equals(id).delete()
      await db.characters.delete(id)
    })
    await load()
  }

  const setImage = async (image: CharacterImage) => {
    await db.images.put({ ...image, updatedAt: nowIso() })
    if (image.kind === 'avatar') {
      const char = await db.characters.get(image.characterId)
      if (char) await db.characters.put({ ...char, avatarImageId: image.id, updatedAt: nowIso() })
    }
    await load()
  }

  const saveOutfit = async (outfit: Outfit) => {
    await db.transaction('rw', db.outfits, db.characters, async () => {
      if (outfit.isActive) {
        const active = await db.outfits.where('characterId').equals(outfit.characterId).toArray()
        await Promise.all(active.map((item) => db.outfits.put({ ...item, isActive: false, updatedAt: nowIso() })))
        const char = await db.characters.get(outfit.characterId)
        if (char) await db.characters.put({ ...char, activeOutfitId: outfit.id, updatedAt: nowIso() })
      }
      await db.outfits.put({ ...outfit, updatedAt: nowIso() })
    })
    await load()
  }

  const worldFor = (characterId: string) => worlds.value.find((item) => item.characterId === characterId) ?? blankWorld(characterId)
  const outfitsFor = (characterId: string) => outfits.value.filter((item) => item.characterId === characterId)
  const imagesFor = (characterId: string) => images.value.filter((item) => item.characterId === characterId)
  const avatarFor = (character: Character) => images.value.find((item) => item.id === character.avatarImageId || (item.characterId === character.id && item.kind === 'avatar'))

  return {
    characters,
    worlds,
    outfits,
    images,
    activeCharacterId,
    activeCharacter,
    load,
    saveCharacter,
    deleteCharacter,
    setImage,
    saveOutfit,
    worldFor,
    outfitsFor,
    imagesFor,
    avatarFor,
  }
})
