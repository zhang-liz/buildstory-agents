import 'server-only';
import { getOpenAIModel, requireOpenAIKey } from './config';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export interface OpenAIStreamOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
}

/**
 * Stream OpenAI chat completions as a ReadableStream of text chunks.
 * Useful for progressive rendering. For JSON responses that must be
 * parsed atomically, prefer the non-streaming `openaiChat`.
 */
export function openaiChatStream(options: OpenAIStreamOptions): ReadableStream<string> {
  const { messages, temperature = 0.7, max_tokens = 1000, signal } = options;
  const key = requireOpenAIKey();
  const model = getOpenAIModel();

  return new ReadableStream<string>({
    async start(controller) {
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
            stream: true,
          }),
          signal,
        });

        if (!response.ok) {
          const text = await response.text();
          controller.error(new Error(`OpenAI API error: ${response.status} ${text}`));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          controller.error(new Error('No response body'));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(content);
              }
            } catch {
              // skip unparseable chunks
            }
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Collect a streamed response into a single string.
 * Gives the same result as `openaiChat` but uses the streaming endpoint,
 * which has faster time-to-first-token.
 */
export async function openaiChatStreamCollect(options: OpenAIStreamOptions): Promise<string> {
  const stream = openaiChatStream(options);
  const reader = stream.getReader();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += value;
  }

  return result;
}
