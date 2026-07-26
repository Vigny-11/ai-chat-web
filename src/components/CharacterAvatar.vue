<script setup lang="ts">
import type { Character, CharacterImage } from '@/types'

defineProps<{ character: Character; image?: CharacterImage; size?: 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <img
    v-if="image"
    :src="image.dataUrl"
    :alt="character.name"
    loading="lazy"
    :class="['rounded-full object-cover', size === 'lg' ? 'h-20 w-20' : size === 'sm' ? 'h-9 w-9' : 'h-12 w-12']"
  />
  <div
    v-else
    :class="[
      'flex shrink-0 items-center justify-center rounded-full bg-moss/15 font-semibold text-moss',
      size === 'lg' ? 'h-20 w-20 text-2xl' : size === 'sm' ? 'h-9 w-9 text-sm' : 'h-12 w-12 text-lg',
    ]"
  >
    {{ character.name.slice(0, 1) || '角' }}
  </div>
</template>
