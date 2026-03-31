import 'server-only';
import { PersonaContextSchema, PersonaResultSchema } from './contracts';
import type { PersonaContext, PersonaResult } from './contracts';
import { withMetrics } from '../metrics';

export type { PersonaContext, PersonaResult };

async function _classifyPersona(context: PersonaContext): Promise<PersonaResult> {
  const score: Record<string, number> = { athlete: 0, commuter: 0, outdoor: 0, family: 0 };
  const reasoning: string[] = [];

  if (context.pollResult) {
    return {
      label: context.pollResult,
      confidence: 0.95,
      reasoning: 'Direct user selection via poll',
    };
  }

  if (context.utmParams) {
    const source = context.utmParams.utm_source?.toLowerCase();
    const medium = context.utmParams.utm_medium?.toLowerCase();
    const campaign = context.utmParams.utm_campaign?.toLowerCase();
    const content = context.utmParams.utm_content?.toLowerCase();

    if (
      source?.includes('fitness') ||
      source?.includes('gym') ||
      source?.includes('strava') ||
      campaign?.includes('sport')
    ) {
      score.athlete += 0.4;
      reasoning.push(`Fitness source: ${source || campaign}`);
    }

    if (
      source?.includes('linkedin') ||
      campaign?.includes('office') ||
      campaign?.includes('work') ||
      content?.includes('daily')
    ) {
      score.commuter += 0.4;
      reasoning.push(`Work/commute source: ${source || campaign}`);
    }

    if (
      source?.includes('outdoor') ||
      source?.includes('rei') ||
      source?.includes('trail') ||
      campaign?.includes('adventure')
    ) {
      score.outdoor += 0.4;
      reasoning.push('Outdoor source detected');
    }

    if (
      source?.includes('parent') ||
      source?.includes('mom') ||
      source?.includes('family') ||
      campaign?.includes('kids')
    ) {
      score.family += 0.4;
      reasoning.push('Family/parenting source');
    }

    const utmPersona = context.utmParams.utm_persona;
    if (utmPersona && utmPersona in score) {
      score[utmPersona] += 0.6;
      reasoning.push(`UTM persona: ${utmPersona}`);
    }
  }

  const hour = context.timeOfDay ?? new Date().getHours();
  const day = context.dayOfWeek ?? new Date().getDay();

  if (hour >= 5 && hour <= 7) {
    score.athlete += 0.2;
    reasoning.push('Early morning visitor (athlete pattern)');
  }

  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    if (day >= 1 && day <= 5) {
      score.commuter += 0.3;
      reasoning.push('Commute hours on weekday');
    }
  }

  if (day === 0 || day === 6) {
    score.outdoor += 0.1;
    score.family += 0.1;
    reasoning.push('Weekend visitor');
  }

  if (context.deviceType) {
    switch (context.deviceType) {
      case 'mobile':
        score.athlete += 0.1;
        score.family += 0.1;
        reasoning.push('Mobile device');
        break;
      case 'desktop':
        score.commuter += 0.2;
        reasoning.push('Desktop (office pattern)');
        break;
      case 'tablet':
        score.family += 0.2;
        reasoning.push('Tablet device');
        break;
    }
  }

  if (context.referrer) {
    const referrer = context.referrer.toLowerCase();

    if (
      referrer.includes('runner') ||
      referrer.includes('fitness') ||
      referrer.includes('gym') ||
      referrer.includes('training')
    ) {
      score.athlete += 0.3;
      reasoning.push('Fitness referrer');
    }

    if (
      referrer.includes('outdoor') ||
      referrer.includes('hiking') ||
      referrer.includes('camping') ||
      referrer.includes('trail')
    ) {
      score.outdoor += 0.3;
      reasoning.push('Outdoor referrer');
    }

    if (
      referrer.includes('parent') ||
      referrer.includes('mom') ||
      referrer.includes('dad') ||
      referrer.includes('family')
    ) {
      score.family += 0.3;
      reasoning.push('Family/parenting referrer');
    }

    if (
      referrer.includes('office') ||
      referrer.includes('productivity') ||
      referrer.includes('linkedin')
    ) {
      score.commuter += 0.3;
      reasoning.push('Professional referrer');
    }
  }

  if (context.sessionData) {
    const { searchTerms, viewedProducts, cartSize } = context.sessionData as {
      searchTerms?: string;
      viewedProducts?: unknown;
      cartSize?: number;
    };

    if (typeof searchTerms === 'string') {
      const terms = searchTerms.toLowerCase();
      if (terms.includes('sport') || terms.includes('gym')) score.athlete += 0.3;
      if (terms.includes('office') || terms.includes('work')) score.commuter += 0.3;
      if (terms.includes('hiking') || terms.includes('camping')) score.outdoor += 0.3;
      if (terms.includes('kids') || terms.includes('spill')) score.family += 0.3;
    }

    if (typeof cartSize === 'number' && cartSize > 2) {
      score.family += 0.2;
      reasoning.push('Multiple items in cart');
    }
  }

  score.commuter += 0.1;

  const personas = Object.entries(score);
  personas.sort((a, b) => b[1] - a[1]);

  const [topPersona, topScore] = personas[0];
  const [, secondScore] = personas[1];

  const margin = topScore - secondScore;
  const confidence = Math.min(0.95, Math.max(0.3, margin));

  if (confidence < 0.4 && topPersona !== 'commuter') {
    return {
      label: 'commuter',
      confidence: 0.4,
      reasoning: `Low confidence (${confidence.toFixed(2)}), defaulting to commuter. ${reasoning.join(', ')}`,
    };
  }

  return {
    label: topPersona,
    confidence,
    reasoning: reasoning.join(', ') || 'Default classification',
  };
}

export async function classifyPersona(context: PersonaContext): Promise<PersonaResult> {
  const validated = PersonaContextSchema.parse(context);
  const result = await withMetrics('persona', 'classify', () => _classifyPersona(validated));
  return PersonaResultSchema.parse(result);
}

export function extractPersonaContext(request: Request): PersonaContext {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || undefined;
  const referrer = request.headers.get('referer') || undefined;

  const utmParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key.startsWith('utm_')) {
      utmParams[key] = value;
    }
  });

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (userAgent) {
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      deviceType = /iPad|Tablet/.test(userAgent) ? 'tablet' : 'mobile';
    }
  }

  const now = new Date();

  return {
    userAgent,
    referrer,
    utmParams: Object.keys(utmParams).length > 0 ? utmParams : undefined,
    deviceType,
    timeOfDay: now.getHours(),
    dayOfWeek: now.getDay(),
  };
}

export function validatePersonaPoll(persona: string): string | null {
  if (['athlete', 'commuter', 'outdoor', 'family'].includes(persona)) {
    return persona;
  }
  return null;
}
