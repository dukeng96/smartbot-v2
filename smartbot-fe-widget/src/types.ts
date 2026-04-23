// Bot and widget configuration (mirrors backend BotWidgetConfig)
export interface BotConfig {
  id: string
  name: string
  avatarUrl?: string
  greetingMessage: string
  suggestedQuestions: string[]
  widgetConfig: WidgetConfig
}

export interface WidgetConfig {
  theme: 'light' | 'dark'
  primaryColor?: string
  position: 'bottom-right' | 'bottom-left'
  bubbleIcon?: string
  showPoweredBy?: boolean
  customCss?: string
  headerText?: string
  displayName?: string
  logoUrl?: string
  fontColor?: string
  backgroundColor?: string
  userMessageColor?: string
  botMessageColor?: string
  fontFamily?: string
  fontSize?: 'small' | 'medium' | 'large'
}

// Chat messages and conversations
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export interface Conversation {
  id: string
  messages: Message[]
  endUserId: string
  endUserName?: string
  lastMessageAt: string
}

// Widget initialization config (from script tag attributes)
export interface WidgetInitConfig {
  botId: string
  apiUrl?: string
  mode?: 'bubble' | 'iframe'
}

// SSE event types
export interface SseConversationEvent {
  conversationId: string
}

export interface SseDeltaEvent {
  content: string
}

export interface SseDoneEvent {
  conversationId: string
  responseTimeMs: number
  creditsUsed: number
}

export interface SseErrorEvent {
  error: string
}
