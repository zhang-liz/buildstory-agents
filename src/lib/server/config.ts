import 'server-only';

/**
 * Central config for external services. Uses env vars with sensible defaults
 * so the app fails clearly or uses a known-good value.
 */

/** Throws if OPENAI_API_KEY is missing. Call before any LLM request. */
export function requireOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === '') {
    throw new Error(
      'Missing OPENAI_API_KEY environment variable. ' +
        'Set it in .env.local or your deployment environment to use AI features.'
    );
  }
  return key;
}

/** OpenAI chat model (e.g. gpt-4o, gpt-4-turbo). Default: gpt-4o. Throws if OPENAI_API_KEY is missing. */
export function getOpenAIModel(): string {
  requireOpenAIKey();
  return process.env.OPENAI_MODEL || 'gpt-4o';
}
