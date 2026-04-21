import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { SseEvent } from './types/sse-event.types';

export interface ExecuteFlowRequest {
  flow_def: { nodes: any[]; edges: any[] };
  credentials: Record<string, Record<string, string>>;
  inputs: {
    chat_input: string;
    session_id: string;
    conversation_id: string;
    execution_id: string;
    history?: Array<{ role: string; content: string }>;
    [key: string]: unknown;
  };
}

function parseSseBlock(block: string): SseEvent | null {
  let eventType = '';
  let eventData = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event: ')) eventType = line.slice(7).trim();
    else if (line.startsWith('data: ')) eventData = line.slice(6).trim();
  }
  if (!eventType || !eventData) return null;
  try {
    const parsed = JSON.parse(eventData);
    return { type: eventType as SseEvent['type'], ...parsed };
  } catch {
    return null;
  }
}

@Injectable()
export class EngineClient {
  private readonly logger = new Logger(EngineClient.name);

  constructor(
    private readonly engineUrl: string,
    private readonly internalKey: string,
  ) {}

  async *executeStream(body: ExecuteFlowRequest): AsyncIterable<SseEvent> {
    let response: Response;
    try {
      response = await fetch(`${this.engineUrl}/engine/v1/flows/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': this.internalKey,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new HttpException(`Engine unreachable: ${err.message}`, 502);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`Engine ${response.status}: ${text}`);
      throw new HttpException(`Engine returned ${response.status}`, 502);
    }

    if (!response.body) {
      throw new HttpException('Engine returned no stream body', 502);
    }

    yield* this._parseStream(response);
  }

  async *resumeStream(execId: string, approval: string): AsyncIterable<SseEvent> {
    let response: Response;
    try {
      response = await fetch(`${this.engineUrl}/engine/v1/flows/resume/${execId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': this.internalKey,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ approval }),
      });
    } catch (err: any) {
      throw new HttpException(`Engine unreachable: ${err.message}`, 502);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`Engine resume ${response.status}: ${text}`);
      throw new HttpException(`Engine returned ${response.status}`, 502);
    }

    if (!response.body) {
      throw new HttpException('Engine returned no stream body', 502);
    }

    yield* this._parseStream(response);
  }

  private async *_parseStream(response: Response): AsyncIterable<SseEvent> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // normalize \r\n → \n, split on double newline (SSE block separator)
        const normalized = buffer.replace(/\r\n/g, '\n');
        const parts = normalized.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          if (!part.trim()) continue;
          const ev = parseSseBlock(part);
          if (ev) yield ev;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
