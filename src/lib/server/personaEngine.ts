import 'server-only';
import { supabase } from './database';
import { withMetrics } from './metrics';
import type { PersonaContext, PersonaResult } from './agents/contracts';

export interface PersonaDefinition {
  id: string;
  vertical: string;
  slug: string;
  display_name: string;
  description: string | null;
  scoring_rules: ScoringRules;
  tone: string;
  default_palette: string[];
  created_at: string;
}

interface ScoringRules {
  utmKeywords?: Record<string, string[]>;
  referrerKeywords?: string[];
  deviceWeights?: Record<string, number>;
  timeRanges?: Array<{ start: number; end: number; weight: number }>;
  dayWeights?: Record<string, number>;
  sessionKeywords?: string[];
  baseWeight?: number;
}

let _cache: { definitions: PersonaDefinition[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadPersonaDefinitions(vertical?: string): Promise<PersonaDefinition[]> {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) {
    const defs = _cache.definitions;
    return vertical ? defs.filter((d) => d.vertical === vertical) : defs;
  }

  const { data, error } = await supabase
    .from('persona_definitions')
    .select('*')
    .order('vertical', { ascending: true });

  if (error) {
    console.error('Failed to load persona definitions:', error.message);
    return [];
  }

  _cache = { definitions: data ?? [], expiresAt: now + CACHE_TTL_MS };
  const defs = _cache.definitions;
  return vertical ? defs.filter((d) => d.vertical === vertical) : defs;
}

function scorePersonaContext(
  context: PersonaContext,
  rules: ScoringRules
): number {
  let score = rules.baseWeight ?? 0;

  // UTM keyword matching
  if (context.utmParams && rules.utmKeywords) {
    for (const [field, keywords] of Object.entries(rules.utmKeywords)) {
      const value = context.utmParams[field]?.toLowerCase();
      if (value) {
        for (const kw of keywords) {
          if (value.includes(kw.toLowerCase())) {
            score += 0.4;
          }
        }
      }
    }
  }

  // Referrer keyword matching
  if (context.referrer && rules.referrerKeywords) {
    const ref = context.referrer.toLowerCase();
    for (const kw of rules.referrerKeywords) {
      if (ref.includes(kw.toLowerCase())) {
        score += 0.3;
      }
    }
  }

  // Device weight
  if (context.deviceType && rules.deviceWeights) {
    score += rules.deviceWeights[context.deviceType] ?? 0;
  }

  // Time range matching
  if (context.timeOfDay !== undefined && rules.timeRanges) {
    for (const range of rules.timeRanges) {
      if (context.timeOfDay >= range.start && context.timeOfDay <= range.end) {
        score += range.weight;
      }
    }
  }

  // Day of week weights
  if (context.dayOfWeek !== undefined && rules.dayWeights) {
    const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][context.dayOfWeek];
    score += rules.dayWeights[dayName] ?? rules.dayWeights['weekday'] ?? 0;
    if (context.dayOfWeek === 0 || context.dayOfWeek === 6) {
      score += rules.dayWeights['weekend'] ?? 0;
    }
  }

  // Session keyword matching
  if (context.sessionData && rules.sessionKeywords) {
    const searchTerms =
      typeof (context.sessionData as Record<string, unknown>).searchTerms === 'string'
        ? ((context.sessionData as Record<string, unknown>).searchTerms as string).toLowerCase()
        : '';
    for (const kw of rules.sessionKeywords) {
      if (searchTerms.includes(kw.toLowerCase())) {
        score += 0.3;
      }
    }
  }

  return score;
}

/**
 * Classify a visitor against all persona definitions for a vertical.
 * Falls back to the built-in heuristic classifier when no definitions exist.
 */
export async function classifyPersonaDynamic(
  context: PersonaContext,
  vertical?: string
): Promise<PersonaResult> {
  return withMetrics('persona', 'classifyDynamic', async () => {
    // Direct selection overrides
    if (context.pollResult) {
      return {
        label: context.pollResult,
        confidence: 0.95,
        reasoning: 'Direct user selection via poll',
      };
    }

    const definitions = await loadPersonaDefinitions(vertical);

    // Fall back to built-in classifier if no definitions in DB
    if (definitions.length === 0) {
      const { classifyPersona } = await import('./agents/persona');
      return classifyPersona(context);
    }

    const scored = definitions.map((def) => ({
      slug: def.slug,
      displayName: def.display_name,
      score: scorePersonaContext(context, def.scoring_rules),
    }));

    scored.sort((a, b) => b.score - a.score);

    const [top, second] = scored;
    const margin = top.score - (second?.score ?? 0);
    const confidence = Math.min(0.95, Math.max(0.3, margin));

    // Default to first definition's slug if confidence too low
    if (confidence < 0.4) {
      return {
        label: scored[0].slug,
        confidence: 0.4,
        reasoning: `Low confidence (${confidence.toFixed(2)}), defaulting to ${scored[0].displayName}`,
      };
    }

    return {
      label: top.slug,
      confidence,
      reasoning: `Matched ${top.displayName} (score: ${top.score.toFixed(2)})`,
    };
  });
}

export { loadPersonaDefinitions };
