<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
    <p class="text-base font-medium text-slate-700 dark:text-slate-200">{{ title }}</p>
    <p v-if="description" class="mt-2 max-w-md text-sm">{{ description }}</p>
    <div class="mt-4"><slot /></div>
  </div>
</template>
