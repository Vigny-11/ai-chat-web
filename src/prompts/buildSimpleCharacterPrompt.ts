import type { Character, WorldSetting } from '@/types'

const value = (text?: string) => text?.trim() || '未设定'

export const buildSimpleCharacterPrompt = (character: Character, world?: WorldSetting) => {
  const characterName = value(character.characterName || character.name)
  const identity = value(character.identity)
  const worldSetting = value(character.worldSetting || world?.description || world?.currentSituation)
  const personality = value(character.personality.mainTraits)
  const characterDescription = value(character.characterDescription || character.background.story)
  const backgroundStory = value(character.backgroundStory || character.background.majorEvents)
  const likes = value(character.likes || character.personality.likes)
  const dislikes = value(character.dislikes || character.personality.dislikes)
  const speakingStyle = value(character.speakingStyle || character.personality.speechStyle)

  return `你现在扮演：

${characterName}

身份：

${identity}

世界观：

${worldSetting}

性格：

${personality}

角色简介：

${characterDescription}

背景：

${backgroundStory}

喜欢：

${likes}

讨厌：

${dislikes}

说话方式：

${speakingStyle}

回答要求：

1. 保持角色身份。
2. 不知道的信息不要编造。
3. 超出世界观范围时回答：
“我不知道这是什么，或者这不属于我的认知范围。”
4. 不允许脱离角色设定。`
}
