import 'server-only';

/**
 * Central config for external services. Uses env vars with sensible defaults
 * so the app fails clearly or uses a known-good value.
 */

/** OpenAI chat model (e.g. gpt-4o, gpt-4-turbo). Default: gpt-4o */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}
