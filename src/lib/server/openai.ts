import 'server-only';
import { getOpenAIModel, requireOpenAIKey } from './config';

const CHAT_TIMEOUT_MS = 60_000;
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatOptions {
  messages: OpenAIChatMessage[];
  temperature?: number;
  max_tokens?: number;
  /** Optional AbortSignal; if not provided, a 60s timeout is applied. */
  signal?: AbortSignal;
}

/**
 * Single place for OpenAI chat completions. Uses OPENAI_API_KEY and OPENAI_MODEL from config.
 * Applies a 60s default timeout when no signal is provided.
 */
export async function openaiChat(options: OpenAIChatOptions): Promise<string> {
  const { messages, temperature = 0.7, max_tokens = 1000, signal } = options;
  const key = requireOpenAIKey();
  const model = getOpenAIModel();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  const effectiveSignal = signal ?? controller.signal;

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
      signal: effectiveSignal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (content == null) {
      throw new Error('OpenAI response missing choices[0].message.content');
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Lightweight check that the configured API key can call OpenAI (GET /v1/models).
 * Used by the debug endpoint; does not expose the key.
 */
export async function openaiCheckConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const key = requireOpenAIKey();
    const response = await fetch(OPENAI_MODELS_URL, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (response.ok) {
      return { ok: true, message: 'API key valid' };
    }
    const errorText = await response.text();
    return { ok: false, message: `HTTP ${response.status}: ${errorText}` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
