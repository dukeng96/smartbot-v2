export type BotStatus = "draft" | "active" | "paused" | "archived"

export interface Bot {
  id: string
  tenantId: string
  name: string
  description: string | null
  avatarUrl: string | null
  status: BotStatus
  systemPrompt: string | null
  greetingMessage: string | null
  suggestedQuestions: string[]
  fallbackMessage: string | null
  personality: BotPersonality | null
  widgetConfig: BotWidgetConfig | null
  apiKeyPrefix: string | null
  topK: number
  memoryTurns: number
  currentKnowledgeChars: number
  maxKnowledgeChars: number
  createdAt: string
  updatedAt: string
  _count?: {
    conversations: number
    channels: number
    knowledgeBases: number
  }
}

export interface BotPersonality {
  tone: "Professional" | "Friendly" | "Casual" | null
  language: "Vietnamese" | "English" | "Auto-detect" | null
  restrictions: string | null
}

export interface BotWidgetConfig {
  theme: "light" | "dark"
  primaryColor: string
  position: "bottom-right" | "bottom-left"
  bubbleIcon: string | null
  showPoweredBy: boolean
  customCss: string | null
  headerText: string | null
  displayName: string | null
  logoUrl: string | null
  fontColor: string | null
  backgroundColor: string | null
  userMessageColor: string | null
  botMessageColor: string | null
  fontFamily: string | null
  fontSize: "small" | "medium" | "large" | null
}

export interface BotEmbedCode {
  iframe: string
  bubble: string
  directLink: string
}

export interface BotKnowledgeBase {
  knowledgeBaseId: string
  name: string
  totalDocuments: number
  totalChars: number
  status: string
  priority: number
}
