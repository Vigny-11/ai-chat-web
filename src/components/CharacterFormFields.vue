<script setup lang="ts">
import type { Character } from '@/types'

const props = defineProps<{ modelValue: Character }>()
const emit = defineEmits<{ 'update:modelValue': [value: Character] }>()

const update = <K extends keyof Character>(key: K, value: Character[K]) => emit('update:modelValue', { ...props.modelValue, [key]: value })
</script>

<template>
  <div class="grid gap-5">
    <section class="grid gap-4 md:grid-cols-3">
      <label class="grid gap-2"><span class="form-label">角色名字 *</span><input :value="modelValue.name" class="form-input" @input="update('name', ($event.target as HTMLInputElement).value)" /></label>
      <label class="grid gap-2"><span class="form-label">角色昵称</span><input v-model="modelValue.nickname" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">性别</span><input v-model="modelValue.gender" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">年龄</span><input v-model="modelValue.age" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">身份</span><input v-model="modelValue.identity" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">职业</span><input v-model="modelValue.occupation" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">种族</span><input v-model="modelValue.race" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">所属阵营</span><input v-model="modelValue.faction" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">与用户的关系</span><input v-model="modelValue.userRelationship" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">对用户的称呼</span><input v-model="modelValue.characterCallUser" class="form-input" /></label>
      <label class="grid gap-2"><span class="form-label">用户对角色的称呼</span><input v-model="modelValue.userCallCharacter" class="form-input" /></label>
    </section>
    <section class="grid gap-4 md:grid-cols-2">
      <label v-for="field in [
        ['mainTraits','主要性格'],['strengths','优点'],['weaknesses','缺点'],['speechStyle','说话方式'],['commonTone','常用语气'],['emotionExpression','情绪表达方式'],['likes','喜欢的事物'],['dislikes','讨厌的事物'],['fears','害怕的事物'],['habits','行为习惯'],['values','价值观'],['moralCode','道德原则']
      ]" :key="field[0]" class="grid gap-2">
        <span class="form-label">{{ field[1] }}</span>
        <textarea v-model="(modelValue.personality as any)[field[0]]" class="form-input min-h-24" />
      </label>
    </section>
    <section class="grid gap-4 md:grid-cols-2">
      <label v-for="field in [
        ['story','人物故事背景'],['birth','出生经历'],['growth','成长经历'],['majorEvents','重要事件'],['pastRelationships','过去的关系'],['currentGoal','当前目标'],['longTermWish','长期愿望'],['hiddenSecret','隐藏秘密'],['trauma','心理创伤'],['specialAbility','特殊能力'],['bodyFeatures','身体特征']
      ]" :key="field[0]" class="grid gap-2">
        <span class="form-label">{{ field[1] }}</span>
        <textarea v-model="(modelValue.background as any)[field[0]]" class="form-input min-h-24" />
      </label>
    </section>
  </div>
</template>
