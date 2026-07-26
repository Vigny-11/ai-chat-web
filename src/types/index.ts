export type SenderRole = 'system' | 'user' | 'assistant'
export type MemoryType = 'user' | 'relationship' | 'character_growth' | 'world_event'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface GlobalAIConfig {
  id: string
  apiKey: string
  createdAt: number
  updatedAt: number
}

export interface InternalAIConfig {
  baseUrl: string
  apiPath: string
  model: string
  maxTokens: number
  temperature: number
  topP: number
  timeoutMs: number
  stream: boolean
}

export interface CharacterPersonality {
  mainTraits?: string
  strengths?: string
  weaknesses?: string
  speechStyle?: string
  commonTone?: string
  emotionExpression?: string
  likes?: string
  dislikes?: string
  fears?: string
  habits?: string
  values?: string
  moralCode?: string
}

export interface CharacterBackground {
  story?: string
  birth?: string
  growth?: string
  majorEvents?: string
  pastRelationships?: string
  currentGoal?: string
  longTermWish?: string
  hiddenSecret?: string
  trauma?: string
  specialAbility?: string
  bodyFeatures?: string
}

export interface WorldSetting extends BaseEntity {
  characterId: string
  name?: string
  description?: string
  era?: string
  type?: string
  places?: string
  rules?: string
  technology?: string
  magicSystem?: string
  history?: string
  organizations?: string
  taboos?: string
  currentSituation?: string
}

export interface Character extends BaseEntity {
  name: string
  characterName?: string
  nickname?: string
  gender?: string
  age?: string
  identity?: string
  occupation?: string
  race?: string
  faction?: string
  userRelationship?: string
  characterCallUser?: string
  userCallCharacter?: string
  personality: CharacterPersonality
  background: CharacterBackground
  worldSetting?: string
  characterDescription?: string
  backgroundStory?: string
  likes?: string
  dislikes?: string
  speakingStyle?: string
  aiSystemPrompt?: string
  activeOutfitId?: string
  avatarImageId?: string
}

export interface CharacterImage extends BaseEntity {
  characterId: string
  kind: 'avatar' | 'fullbody'
  dataUrl: string
  mimeType: string
  note?: string
  period?: string
  appearance?: string
}

export interface Outfit extends BaseEntity {
  characterId: string
  name: string
  image?: string
  description?: string
  background?: string
  current?: boolean
  imageDataUrl?: string
  mimeType?: string
  type?: string
  occasion?: string
  period?: string
  designBackground?: string
  details?: string
  accessories?: string
  hairstyle?: string
  isActive: boolean
}

export interface Conversation extends BaseEntity {
  characterId: string
  title: string
  lastMessageAt?: string
}

export interface ChatMessage extends BaseEntity {
  conversationId: string
  role: SenderRole
  content: string
  isGenerating?: boolean
  isFailed?: boolean
  model?: string
  tokenUsage?: number
  sourceMessageId?: string
  isEdited?: boolean
}

export interface Memory extends BaseEntity {
  characterId: string
  conversationId?: string
  type: MemoryType
  title: string
  content: string
  importance: number
  sourceMessageId?: string
  pinned: boolean
  enabled: boolean
  allowAIUse: boolean
  lastUsedAt?: string
}

export interface UserPreference extends BaseEntity {
  theme: ThemeMode
  fontSize: 'small' | 'medium' | 'large'
  bubbleSize: 'compact' | 'comfortable' | 'wide'
  compactMobile: boolean
  recentContextCount: number
  autoMemory: boolean
  memoryInterval: number
  maxRelevantMemories: number
  showMessageTime: boolean
  typingAnimation: boolean
}

export interface ServerSyncConfig extends BaseEntity {
  enabled: boolean
  serverUrl?: string
  accessToken?: string
  syncPath?: string
  uploadPath?: string
  downloadPath?: string
  lastSyncAt?: string
}

export interface BackupData {
  version: string
  exportedAt: string
  characters: Character[]
  images: CharacterImage[]
  outfits: Outfit[]
  worlds: WorldSetting[]
  conversations: Conversation[]
  messages: ChatMessage[]
  memories: Memory[]
  preferences: UserPreference[]
}

export interface LocalDataStats {
  characters: number
  conversations: number
  messages: number
  memories: number
  images: number
  bytes: number
}

export interface ImportPreview {
  version: string
  characters: number
  conversations: number
  messages: number
  memories: number
  images: number
}

export interface DataStorage {
  saveCharacter(character: Character): Promise<void>
  getCharacters(): Promise<Character[]>
  deleteCharacter(id: string): Promise<void>
  saveConversation(conversation: Conversation): Promise<void>
  getMessages(conversationId: string): Promise<ChatMessage[]>
  saveMemory(memory: Memory): Promise<void>
  getMemories(characterId: string): Promise<Memory[]>
  exportData(): Promise<Blob>
  importData(backup: BackupData, mode: 'merge' | 'overwrite'): Promise<void>
  syncUpload(config: ServerSyncConfig): Promise<void>
  syncDownload(config: ServerSyncConfig): Promise<BackupData>
}

export interface TestResult {
  ok: boolean
  message: string
  providerId?: string
  providerName?: string
}

export interface ChatRequest {
  apiKey: string
  providerId?: string
  messages: Array<{ role: SenderRole; content: string }>
  signal?: AbortSignal
}

export interface ChatChunk {
  content: string
  done?: boolean
}

export interface MemoryCandidate {
  type: MemoryType
  title: string
  content: string
  importance: number
}

export interface MemoryExtractRequest {
  apiKey: string
  providerId?: string
  messages: ChatMessage[]
  character: Character
}

export interface AIProvider {
  testConnection(apiKey: string): Promise<TestResult>
  chat(request: ChatRequest): AsyncGenerator<ChatChunk>
  extractMemories(request: MemoryExtractRequest): Promise<MemoryCandidate[]>
}
