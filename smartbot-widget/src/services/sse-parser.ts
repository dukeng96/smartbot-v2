import type {
  SseConversationEvent,
  SseDeltaEvent,
  SseDoneEvent,
  SseErrorEvent,
} from '../types'

export interface SseCallbacks {
  onConversation?: (event: SseConversationEvent) => void
  onDelta?: (event: SseDeltaEvent) => void
  onDone?: (event: SseDoneEvent) => void
  onError?: (event: SseErrorEvent) => void
}

/**
 * POST-based SSE stream parser.
 * Handles \r\n normalization (sse-starlette sends \r\n),
 * buffering, and typed event dispatch.
 */
export class SseParser {
  private buffer = ''
  private aborted = false

  /** Parse SSE stream and dispatch callbacks. */
  async parse(
    stream: ReadableStream<Uint8Array>,
    callbacks: SseCallbacks,
  ): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    try {
      while (!this.aborted) {
        const { done, value } = await reader.read()
        if (done) break

        this.buffer += decoder.decode(value, { stream: true })
        this.processBuffer(callbacks)
      }

      // Flush remaining
      const tail = decoder.decode()
      if (tail) {
        this.buffer += tail
        this.processBuffer(callbacks)
      }

      // Handle leftover incomplete event
      if (this.buffer.trim()) {
        this.dispatchEvent(this.buffer, callbacks)
        this.buffer = ''
      }
    } catch (err) {
      if (!this.aborted) {
        callbacks.onError?.({ error: String(err) })
      }
    } finally {
      if (this.aborted) {
        await reader.cancel().catch(() => {})
      }
      reader.releaseLock()
    }
  }

  /** Cancel stream parsing. */
  abort(): void {
    this.aborted = true
  }

  /** Split buffer on \n\n boundaries, dispatch complete events. */
  private processBuffer(callbacks: SseCallbacks): void {
    // Normalize \r\n → \n (sse-starlette compat)
    this.buffer = this.buffer.replace(/\r\n/g, '\n')

    const parts = this.buffer.split('\n\n')
    // Keep last (possibly incomplete) part in buffer
    this.buffer = parts.pop() ?? ''

    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed) this.dispatchEvent(trimmed, callbacks)
    }
  }

  /**
   * Parse single SSE event block:
   *   event: delta
   *   data: {"content":"hello"}
   */
  private dispatchEvent(raw: string, callbacks: SseCallbacks): void {
    let eventType = ''
    let data = ''

    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        data = line.slice(5).trim()
      }
    }

    if (!eventType || !data) return

    try {
      const payload = JSON.parse(data)

      switch (eventType) {
        case 'conversation':
          callbacks.onConversation?.(payload as SseConversationEvent)
          break
        case 'delta':
          if (payload.content != null) callbacks.onDelta?.(payload as SseDeltaEvent)
          break
        case 'done':
          callbacks.onDone?.(payload as SseDoneEvent)
          break
        case 'error':
          callbacks.onError?.(payload as SseErrorEvent)
          break
      }
    } catch {
      callbacks.onError?.({ error: 'SSE parse error' })
    }
  }
}
