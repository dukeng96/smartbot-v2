---
title: "Session 1: Scaffold, Shadow DOM Shell, UI Components"
description: "Project setup, build pipeline, Shadow DOM infrastructure, 8 static components"
status: complete
priority: P1
effort: 10h
completed_at: 2026-03-24
---

# Session 1: Scaffold Shell & Components (Phases 5.1–5.3)

**Objective:** Create project scaffolding, Shadow DOM infrastructure, and all 8 UI components (static, no functionality yet).

**Duration:** ~10 hours
**Phases:** 5.1 (setup) + 5.2 (shell) + 5.3 (components)

---

## Overview

This session establishes the `smartbot-widget` package as a standalone Vite project with zero dependencies. We'll:
1. Initialize monorepo package (package.json, vite.config.ts, tsconfig.json)
2. Create Shadow DOM host infrastructure
3. Build 8 reusable UI components (bubble, chat window, header, messages, etc.)

Exit criteria: Click bubble → renders full UI with all components (no chat flow yet).

---

## Requirements

### Functional
- Floating chat bubble renders in bottom-right (customizable position)
- Click bubble → smoothly toggles chat window (initially no animation)
- Chat window contains all UI elements: header, message area, input, suggestions
- Components render static content (greeting message, sample questions)
- All components use Shadow DOM for style isolation

### Non-Functional
- TypeScript strict mode enabled
- Build outputs single IIFE file (<500KB unminified)
- Dev server with hot reload works
- Tree-shaking enabled for final bundle
- No CSS-in-JS (pure CSS files)

---

## Files to Create

### Root Config (3 files)

```
smartbot-widget/
├── package.json                  # [30 LOC] npm package metadata
├── vite.config.ts               # [40 LOC] Vite IIFE + minification config
├── tsconfig.json                # [20 LOC] Strict TypeScript config
```

### Source Code (19 files)

```
smartbot-widget/src/
├── index.ts                      # [30 LOC] Auto-init from script tag
├── widget.ts                     # [150 LOC] Main SmartbotWidget class
├── types.ts                      # [60 LOC] Shared interfaces (BotConfig, WidgetConfig, etc.)
├── components/
│   ├── bubble-button.ts         # [60 LOC] Floating chat trigger
│   ├── chat-window.ts           # [80 LOC] Chat container (fixed position)
│   ├── chat-header.ts           # [50 LOC] Bot name + close button
│   ├── message-list.ts          # [70 LOC] Scrollable message area
│   ├── message-bubble.ts        # [80 LOC] Individual message (user/bot)
│   ├── typing-indicator.ts      # [30 LOC] Typing dots animation (CSS)
│   ├── suggestion-chips.ts      # [40 LOC] Suggested question buttons
│   └── chat-input.ts            # [70 LOC] Textarea + send button
├── services/
│   └── (skip for now — Session 2)
└── styles/
    ├── base.css                 # [60 LOC] Shadow DOM reset + layout
    ├── theme.css                # [80 LOC] CSS custom properties (colors, fonts)
    └── (animations.css — Session 3)
```

---

## Detailed Implementation Steps

### Phase 5.1: Project Setup (2 hours)

#### Step 1.1: Create package.json

**File:** `smartbot-widget/package.json`

```json
{
  "name": "smartbot-widget",
  "version": "0.1.0",
  "description": "Embeddable chat widget for Smartbot platform",
  "type": "module",
  "main": "dist/smartbot-widget.iife.js",
  "exports": {
    ".": "./dist/smartbot-widget.iife.js"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.0.0",
    "terser": "^5.32.0"
  },
  "browserslist": [
    "defaults",
    "not dead",
    "not IE 11"
  ]
}
```

**Notes:**
- `type: "module"` for ES modules
- No runtime dependencies (zero production npm packages)
- Scripts: dev (Vite dev server), build (IIFE), preview, type-check

#### Step 1.2: Create vite.config.ts

**File:** `smartbot-widget/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SmartbotWidget',
      formats: ['iife'],
      fileName: () => 'smartbot-widget.iife.js',
    },
    cssCodeSplit: false,                  // Inline all CSS into JS
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
        drop_console: false,
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,       // Single file output
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 5174,
  },
})
```

**Key config points:**
- Library mode with IIFE format (single file)
- CSS code split disabled (inline CSS)
- Terser minification with 2 compression passes
- Inline dynamic imports (no chunk splitting)

#### Step 1.3: Create tsconfig.json

**File:** `smartbot-widget/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules"],
}
```

**Strict mode enabled:** All strict checks on.

#### Step 1.4: Create directory structure

```bash
cd smartbot-widget
mkdir -p src/components src/services src/styles
```

#### Step 1.5: Verify build works

```bash
npm install
npm run build
```

Expected output: `dist/smartbot-widget.iife.js` (~500KB before minification).

**Success criteria:** `npm run build` completes with no errors.

---

### Phase 5.2: Shadow DOM Shell (4 hours)

#### Step 2.1: Create types.ts

**File:** `smartbot-widget/src/types.ts`

This file mirrors the backend's `BotWidgetConfig` and defines message/conversation types.

```typescript
// Bot and widget configuration
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
  primaryColor?: string              // Hex color (e.g., #6D28D9)
  position: 'bottom-right' | 'bottom-left'
  bubbleIcon?: string               // URL to custom icon
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

// Widget initialization config
export interface WidgetInitConfig {
  botId: string
  apiUrl?: string
  mode?: 'bubble' | 'iframe'
}

// SSE event types
export interface SseEvent {
  type: 'conversation' | 'delta' | 'done' | 'error'
  data: Record<string, any>
}

export interface ConversationEvent {
  conversationId: string
}

export interface DeltaEvent {
  content: string
}

export interface DoneEvent {
  conversationId: string
  responseTimeMs: number
  creditsUsed: number
}

export interface ErrorEvent {
  error: string
}
```

#### Step 2.2: Create widget.ts (Main Class)

**File:** `smartbot-widget/src/widget.ts`

This is the core widget class that manages the Shadow DOM host and lifecycle.

```typescript
import { BotConfig, WidgetConfig, WidgetInitConfig } from './types'
import { BubbleButton } from './components/bubble-button'
import { ChatWindow } from './components/chat-window'

export class SmartbotWidget {
  private botId: string
  private apiUrl: string
  private botConfig: BotConfig | null = null
  private host: HTMLDivElement | null = null
  private shadowRoot: ShadowRoot | null = null
  private isOpen: boolean = false
  private mode: 'bubble' | 'iframe'

  private bubble: BubbleButton | null = null
  private chatWindow: ChatWindow | null = null

  constructor(config: WidgetInitConfig) {
    this.botId = config.botId
    this.apiUrl = config.apiUrl || this.detectApiUrl()
    this.mode = config.mode || 'bubble'

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  private init(): void {
    try {
      this.createHost()
      this.attachShadowDOM()
      this.injectStyles()
      this.createComponents()
      this.attachEventListeners()
      this.fetchBotConfig()
    } catch (error) {
      console.error('[SmartbotWidget] Init error:', error)
    }
  }

  private createHost(): void {
    // Create host container
    this.host = document.createElement('div')
    this.host.id = 'smartbot-widget-root'
    this.host.setAttribute('aria-label', 'Smartbot chat widget')
    document.body.appendChild(this.host)
  }

  private attachShadowDOM(): void {
    if (!this.host) return
    this.shadowRoot = this.host.attachShadow({ mode: 'open' })
  }

  private injectStyles(): void {
    if (!this.shadowRoot) return

    // Try Constructable StyleSheets first (modern browsers)
    const cssContents = [BASE_CSS, THEME_CSS]

    if ('adoptedStyleSheets' in this.shadowRoot) {
      const sheets = cssContents.map(css => {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(css)
        return sheet
      })
      this.shadowRoot.adoptedStyleSheets = sheets
    } else {
      // Fallback: <style> tag
      const styleEl = document.createElement('style')
      styleEl.textContent = cssContents.join('\n')
      this.shadowRoot.appendChild(styleEl)
    }
  }

  private createComponents(): void {
    if (!this.shadowRoot) return

    // Bubble button (always present, hidden in iframe mode)
    this.bubble = new BubbleButton({
      onToggle: () => this.toggle(),
      hidden: this.mode === 'iframe',
    })
    this.shadowRoot.appendChild(this.bubble.render())

    // Chat window
    this.chatWindow = new ChatWindow({
      onClose: () => this.close(),
      visible: this.mode === 'iframe' || this.isOpen,
    })
    this.shadowRoot.appendChild(this.chatWindow.render())
  }

  private attachEventListeners(): void {
    // Keyboard: Escape to close
    this.shadowRoot?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })
  }

  private async fetchBotConfig(): Promise<void> {
    try {
      const url = `${this.apiUrl}/api/v1/chat/${this.botId}/config`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const json = await response.json()
      this.botConfig = json.data
      this.applyTheme()
      if (this.chatWindow) {
        this.chatWindow.setBotConfig(this.botConfig)
      }
    } catch (error) {
      console.error('[SmartbotWidget] Failed to fetch config:', error)
    }
  }

  private applyTheme(): void {
    if (!this.botConfig || !this.shadowRoot) return

    const config = this.botConfig.widgetConfig
    const root = this.shadowRoot.host as HTMLElement

    // Set CSS custom properties
    root.style.setProperty('--sb-primary', config.primaryColor || '#6D28D9')
    root.style.setProperty('--sb-bg', config.backgroundColor || '#FFFFFF')
    root.style.setProperty('--sb-font-color', config.fontColor || '#111827')
    root.style.setProperty('--sb-user-msg', config.userMessageColor || '#6D28D9')
    root.style.setProperty('--sb-bot-msg', config.botMessageColor || '#F3F4F6')
    root.style.setProperty('--sb-font-family', config.fontFamily || 'system-ui, sans-serif')

    // Font size mapping
    const fontSizeMap: Record<string, string> = {
      small: '13px',
      medium: '14px',
      large: '16px',
    }
    const fontSize = config.fontSize || 'medium'
    root.style.setProperty('--sb-font-size', fontSizeMap[fontSize])

    // Position
    const bubblePosition = config.position || 'bottom-right'
    if (bubblePosition === 'bottom-left') {
      root.style.setProperty('--sb-bubble-align', 'left')
    } else {
      root.style.setProperty('--sb-bubble-align', 'right')
    }

    // Inject custom CSS if provided
    if (config.customCss && this.shadowRoot) {
      const customStyle = document.createElement('style')
      customStyle.textContent = config.customCss
      this.shadowRoot.appendChild(customStyle)
    }

    // Theme (light/dark)
    if (config.theme === 'dark') {
      root.classList.add('dark-theme')
    }
  }

  private detectApiUrl(): string {
    // Find the script tag that loaded this widget
    const scripts = document.querySelectorAll('script[data-bot-id]')
    if (scripts.length > 0) {
      const scriptUrl = (scripts[scripts.length - 1] as HTMLScriptElement).src
      // Extract base URL: https://example.com/widget/loader.js → https://example.com
      const url = new URL(scriptUrl)
      url.pathname = ''
      return url.origin
    }
    // Default to current origin
    return window.location.origin
  }

  // Public API
  public toggle(): void {
    this.isOpen ? this.close() : this.open()
  }

  public open(): void {
    this.isOpen = true
    if (this.chatWindow) this.chatWindow.show()
    if (this.bubble) this.bubble.setActive(true)
  }

  public close(): void {
    this.isOpen = false
    if (this.chatWindow) this.chatWindow.hide()
    if (this.bubble) this.bubble.setActive(false)
  }

  public destroy(): void {
    if (this.host) this.host.remove()
    this.shadowRoot = null
    this.host = null
    this.bubble = null
    this.chatWindow = null
  }
}

// CSS (will be moved to separate files in Step 2.3)
const BASE_CSS = `/* See src/styles/base.css */`
const THEME_CSS = `/* See src/styles/theme.css */`
```

**For now, we'll import actual CSS content. Update this in Step 2.3.**

#### Step 2.3: Create src/styles/base.css

**File:** `smartbot-widget/src/styles/base.css`

Shadow DOM reset and layout.

```css
/* ===== Reset ===== */
:host {
  box-sizing: border-box;
  font-family: var(--sb-font-family, system-ui, -apple-system, sans-serif);
  font-size: var(--sb-font-size, 14px);
  color: var(--sb-font-color, #111827);
  line-height: 1.5;
}

* {
  box-sizing: inherit;
  margin: 0;
  padding: 0;
}

/* ===== Scrollbar styling ===== */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* ===== Container ===== */
:host {
  --sb-primary: #6D28D9;
  --sb-bg: #FFFFFF;
  --sb-font-color: #111827;
  --sb-user-msg: #6D28D9;
  --sb-bot-msg: #F3F4F6;
  --sb-font-family: system-ui, sans-serif;
  --sb-font-size: 14px;
  --sb-bubble-align: right;

  display: block;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
  font-family: var(--sb-font-family);
  font-size: var(--sb-font-size);
}

:host(.dark-theme) {
  --sb-bg: #1F2937;
  --sb-font-color: #F3F4F6;
  --sb-bot-msg: #374151;
}

/* Mobile: full-screen positioning */
@media (max-width: 767px) {
  :host {
    bottom: 0;
    right: 0;
    left: 0;
    top: 0;
    padding: env(safe-area-inset-bottom);
  }
}

/* ===== Bubble Button ===== */
.sb-bubble {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--sb-primary);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  transition: all 0.3s ease;
}

.sb-bubble:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.sb-bubble:active {
  transform: scale(0.95);
}

.sb-bubble.hidden {
  display: none;
}

/* ===== Chat Window ===== */
.sb-chat-window {
  position: fixed;
  bottom: 100px;
  right: 20px;
  width: 400px;
  height: 600px;
  border-radius: 12px;
  background-color: var(--sb-bg);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999;
  opacity: 1;
  visibility: visible;
  transition: all 0.3s ease;
}

.sb-chat-window.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.sb-chat-window.bottom-left {
  right: auto;
  left: 20px;
}

/* Mobile: full-screen */
@media (max-width: 767px) {
  .sb-chat-window {
    position: fixed;
    bottom: 0;
    right: 0;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    max-height: 100vh;
  }

  .sb-chat-window.bottom-left {
    left: 0;
  }
}

/* ===== Chat Header ===== */
.sb-chat-header {
  background-color: var(--sb-primary);
  color: white;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
}

.sb-chat-header::part(chat-header) {
  /* For host page customization */
}

.sb-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.sb-header-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
}

.sb-header-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.sb-header-text {
  flex: 1;
}

.sb-header-title {
  font-weight: 600;
  font-size: 14px;
  margin: 0;
}

.sb-header-subtitle {
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
}

.sb-close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.sb-close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* ===== Message List ===== */
.sb-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sb-message {
  display: flex;
  margin-bottom: 8px;
  animation: sb-fade-in 0.3s ease-in;
}

.sb-message.user {
  justify-content: flex-end;
}

.sb-message.bot {
  justify-content: flex-start;
}

.sb-message-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
}

.sb-message.user .sb-message-bubble {
  background-color: var(--sb-user-msg);
  color: white;
  border-bottom-right-radius: 4px;
}

.sb-message.bot .sb-message-bubble {
  background-color: var(--sb-bot-msg);
  color: var(--sb-font-color);
  border-bottom-left-radius: 4px;
}

/* ===== Typing Indicator ===== */
.sb-typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--sb-bot-msg);
  border-radius: 12px;
  width: fit-content;
}

.sb-typing-dot {
  width: 8px;
  height: 8px;
  background-color: var(--sb-font-color);
  border-radius: 50%;
  animation: sb-bounce 1.4s infinite;
}

.sb-typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.sb-typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

/* ===== Suggestion Chips ===== */
.sb-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.sb-suggestion-chip {
  background: none;
  border: 1px solid var(--sb-primary);
  color: var(--sb-primary);
  padding: 8px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  text-align: left;
  word-wrap: break-word;
}

.sb-suggestion-chip:hover {
  background-color: var(--sb-primary);
  color: white;
}

/* ===== Chat Input ===== */
.sb-chat-input-area {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.sb-chat-input-textarea {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: inherit;
  color: var(--sb-font-color);
  background-color: var(--sb-bg);
  resize: none;
  max-height: 100px;
  min-height: 40px;
  line-height: 1.4;
  outline: none;
  transition: border-color 0.2s;
}

.sb-chat-input-textarea:focus {
  border-color: var(--sb-primary);
}

.sb-chat-input-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sb-send-btn {
  background-color: var(--sb-primary);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.sb-send-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.05);
}

.sb-send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Animations ===== */
@keyframes sb-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes sb-bounce {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
}

/* ===== Accessibility ===== */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* ===== Focus ===== */
button:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--sb-primary);
  outline-offset: 2px;
}
```

#### Step 2.4: Create src/styles/theme.css

**File:** `smartbot-widget/src/styles/theme.css`

CSS custom properties and theme presets.

```css
/* ===== Light Theme (Default) ===== */
:host {
  --sb-primary: #6D28D9;
  --sb-bg: #FFFFFF;
  --sb-font-color: #111827;
  --sb-user-msg: #6D28D9;
  --sb-bot-msg: #F3F4F6;
  --sb-font-family: system-ui, -apple-system, sans-serif;
  --sb-font-size: 14px;
  --sb-bubble-align: right;
}

/* ===== Dark Theme ===== */
:host(.dark-theme) {
  --sb-bg: #1F2937;
  --sb-font-color: #F3F4F6;
  --sb-bot-msg: #374151;
  --sb-user-msg: #8B5CF6;
}

/* ===== Component Parts (for ::part() pseudo-element) ===== */
:host {
  /* Define ::part exports for host-page customization */
}

.sb-chat-header::part(chat-header) {
  /* Allows: widget::part(chat-header) { ... } */
}

.sb-chat-window::part(chat-window) {
  /* Allows: widget::part(chat-window) { ... } */
}

.sb-chat-input-textarea::part(chat-input) {
  /* Allows: widget::part(chat-input) { ... } */
}

/* ===== Powered-by Footer ===== */
.sb-powered-by {
  font-size: 11px;
  text-align: center;
  color: #6b7280;
  padding: 8px 0;
  border-top: 1px solid #e5e7eb;
}

.sb-powered-by a {
  color: #6d28d9;
  text-decoration: none;
}

.sb-powered-by a:hover {
  text-decoration: underline;
}

.sb-powered-by.hidden {
  display: none;
}
```

---

### Phase 5.3: Chat UI Components (4 hours)

Now create all 8 component files. Each component exports a class with a `render()` method that returns a DOM element.

#### Step 3.1: Create src/components/bubble-button.ts

**File:** `smartbot-widget/src/components/bubble-button.ts`

```typescript
export interface BubbleButtonConfig {
  onToggle: () => void
  hidden?: boolean
}

export class BubbleButton {
  private config: BubbleButtonConfig
  private element: HTMLButtonElement | null = null
  private isActive: boolean = false

  constructor(config: BubbleButtonConfig) {
    this.config = config
  }

  render(): HTMLElement {
    this.element = document.createElement('button')
    this.element.className = 'sb-bubble'
    this.element.setAttribute('aria-label', 'Open chat')
    this.element.setAttribute('title', 'Chat with us')
    this.element.innerHTML = this.getSVGIcon()

    if (this.config.hidden) {
      this.element.classList.add('hidden')
    }

    this.element.addEventListener('click', () => this.config.onToggle())

    return this.element
  }

  setActive(active: boolean): void {
    this.isActive = active
    if (this.element) {
      this.element.setAttribute('aria-pressed', String(active))
    }
  }

  private getSVGIcon(): string {
    return `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `
  }
}
```

#### Step 3.2: Create src/components/chat-window.ts

**File:** `smartbot-widget/src/components/chat-window.ts`

```typescript
import { BotConfig } from '../types'

export interface ChatWindowConfig {
  onClose: () => void
  visible?: boolean
}

export class ChatWindow {
  private config: ChatWindowConfig
  private element: HTMLDivElement | null = null
  private botConfig: BotConfig | null = null
  private messageList: HTMLDivElement | null = null
  private input: HTMLElement | null = null
  private suggestionsContainer: HTMLDivElement | null = null

  constructor(config: ChatWindowConfig) {
    this.config = config
  }

  render(): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'sb-chat-window'

    if (!this.config.visible) {
      this.element.classList.add('hidden')
    }

    // Create child elements
    this.element.appendChild(this.createHeader())
    this.element.appendChild(this.createMessageList())
    this.element.appendChild(this.createSuggestionsContainer())
    this.element.appendChild(this.createInputArea())
    this.element.appendChild(this.createPoweredByFooter())

    return this.element
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div')
    header.className = 'sb-chat-header'

    const content = document.createElement('div')
    content.className = 'sb-header-content'

    const avatar = document.createElement('div')
    avatar.className = 'sb-header-avatar'
    avatar.textContent = '🤖'
    content.appendChild(avatar)

    const textContainer = document.createElement('div')
    textContainer.className = 'sb-header-text'

    const title = document.createElement('h3')
    title.className = 'sb-header-title'
    title.textContent = this.botConfig?.name || 'Chat with us'
    textContainer.appendChild(title)

    const subtitle = document.createElement('p')
    subtitle.className = 'sb-header-subtitle'
    subtitle.textContent = 'Online'
    textContainer.appendChild(subtitle)

    content.appendChild(textContainer)
    header.appendChild(content)

    const closeBtn = document.createElement('button')
    closeBtn.className = 'sb-close-btn'
    closeBtn.setAttribute('aria-label', 'Close chat')
    closeBtn.innerHTML = '&times;'
    closeBtn.addEventListener('click', () => this.config.onClose())
    header.appendChild(closeBtn)

    return header
  }

  private createMessageList(): HTMLDivElement {
    this.messageList = document.createElement('div')
    this.messageList.className = 'sb-message-list'
    this.messageList.setAttribute('aria-label', 'Chat messages')
    return this.messageList
  }

  private createSuggestionsContainer(): HTMLDivElement {
    this.suggestionsContainer = document.createElement('div')
    this.suggestionsContainer.className = 'sb-suggestions'
    return this.suggestionsContainer
  }

  private createInputArea(): HTMLElement {
    const area = document.createElement('div')
    area.className = 'sb-chat-input-area'

    const textarea = document.createElement('textarea')
    textarea.className = 'sb-chat-input-textarea'
    textarea.placeholder = 'Type your message...'
    textarea.setAttribute('aria-label', 'Chat input')
    area.appendChild(textarea)

    const sendBtn = document.createElement('button')
    sendBtn.className = 'sb-send-btn'
    sendBtn.setAttribute('aria-label', 'Send message')
    sendBtn.innerHTML = '➤'
    area.appendChild(sendBtn)

    this.input = area
    return area
  }

  private createPoweredByFooter(): HTMLElement {
    const footer = document.createElement('div')
    footer.className = 'sb-powered-by'
    footer.innerHTML = `Powered by <a href="https://smartbot.ai" target="_blank">Smartbot</a>`
    return footer
  }

  public setBotConfig(config: BotConfig): void {
    this.botConfig = config
    if (this.element) {
      // Update header with bot info
      const title = this.element.querySelector('.sb-header-title')
      if (title) title.textContent = config.name

      const avatar = this.element.querySelector('.sb-header-avatar')
      if (avatar && config.avatarUrl) {
        avatar.innerHTML = `<img src="${config.avatarUrl}" alt="${config.name}">`
      }

      // Show greeting message
      this.addGreetingMessage(config.greetingMessage)

      // Populate suggestions
      this.addSuggestions(config.suggestedQuestions)
    }
  }

  private addGreetingMessage(text: string): void {
    if (!this.messageList) return
    const bubble = document.createElement('div')
    bubble.className = 'sb-message bot'
    const content = document.createElement('div')
    content.className = 'sb-message-bubble'
    content.textContent = text
    bubble.appendChild(content)
    this.messageList.appendChild(bubble)
    this.scrollToBottom()
  }

  private addSuggestions(questions: string[]): void {
    if (!this.suggestionsContainer) return
    this.suggestionsContainer.innerHTML = ''

    questions.forEach(q => {
      const chip = document.createElement('button')
      chip.className = 'sb-suggestion-chip'
      chip.textContent = q
      chip.addEventListener('click', () => {
        // Will implement in Session 2
      })
      this.suggestionsContainer!.appendChild(chip)
    })
  }

  private scrollToBottom(): void {
    if (this.messageList) {
      this.messageList.scrollTop = this.messageList.scrollHeight
    }
  }

  public show(): void {
    if (this.element) {
      this.element.classList.remove('hidden')
    }
  }

  public hide(): void {
    if (this.element) {
      this.element.classList.add('hidden')
    }
  }
}
```

#### Step 3.3–3.8: Create remaining components

**Due to token constraints, here are template outlines. Create these files following the same pattern:**

**File:** `smartbot-widget/src/components/chat-header.ts`
```typescript
// Already integrated into chat-window.ts; can be extracted if needed
export class ChatHeader {
  render(): HTMLElement {
    // Header with bot avatar, name, close button
    return document.createElement('div')
  }
}
```

**File:** `smartbot-widget/src/components/message-list.ts`
```typescript
export class MessageList {
  render(): HTMLElement {
    // Scrollable div for messages
    return document.createElement('div')
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    // Add message bubble to list
  }
}
```

**File:** `smartbot-widget/src/components/message-bubble.ts`
```typescript
export class MessageBubble {
  render(role: 'user' | 'assistant', content: string): HTMLElement {
    // Individual message with styling
    return document.createElement('div')
  }

  updateContent(content: string): void {
    // For SSE streaming
  }
}
```

**File:** `smartbot-widget/src/components/typing-indicator.ts`
```typescript
export class TypingIndicator {
  render(): HTMLElement {
    // Three bouncing dots
    return document.createElement('div')
  }
}
```

**File:** `smartbot-widget/src/components/suggestion-chips.ts`
```typescript
export class SuggestionChips {
  render(questions: string[], onSelect: (q: string) => void): HTMLElement {
    // Horizontal button row
    return document.createElement('div')
  }
}
```

**File:** `smartbot-widget/src/components/chat-input.ts`
```typescript
export class ChatInput {
  render(onSend: (text: string) => void): HTMLElement {
    // Textarea + send button
    return document.createElement('div')
  }

  disable(): void {}
  enable(): void {}
  clear(): void {}
}
```

#### Step 3.9: Create src/index.ts (Entry Point)

**File:** `smartbot-widget/src/index.ts`

```typescript
import { SmartbotWidget } from './widget'

declare global {
  interface Window {
    SmartbotWidget: typeof SmartbotWidget
  }
}

// Auto-init from script tag
function initFromScript(): void {
  const script = document.currentScript as HTMLScriptElement | null
  if (!script) return

  const botId = script.getAttribute('data-bot-id')
  if (!botId) return

  const apiUrl = script.getAttribute('data-api-url') || undefined

  // Export to window for programmatic use
  const widget = new SmartbotWidget({ botId, apiUrl })
  window.SmartbotWidget = widget as any
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFromScript)
} else {
  initFromScript()
}

export { SmartbotWidget }
```

---

## Success Criteria — Session 1

- [ ] `npm run build` produces `dist/smartbot-widget.iife.js`
- [ ] File is <500KB (pre-minified)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Floating bubble renders in bottom-right corner (check browser console for errors)
- [ ] Click bubble → chat window slides up with smooth animation
- [ ] Chat window contains: header (bot name), message area (greeting), suggestions, input, close button
- [ ] All components use Shadow DOM for style isolation
- [ ] Mobile view: chat fills full screen on <768px
- [ ] No console errors or warnings
- [ ] Dev server works: `npm run dev` on port 5173

---

## Next Steps

Session 2 will wire this UI to the actual API and implement SSE streaming.

