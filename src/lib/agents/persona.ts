import { WaterBottlePersona } from '../personas';

export interface PersonaResult {
  label: WaterBottlePersona;
  confidence: number;
  reasoning: string;
}

interface PersonaContext {
  userAgent?: string;
  referrer?: string;
  utmParams?: Record<string, string>;
  pollResult?: WaterBottlePersona;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  sessionData?: Record<string, any>;
  timeOfDay?: number;
  dayOfWeek?: number;
}

// Fast heuristic-based persona classification for water bottle buyers
export async function classifyPersona(context: PersonaContext): Promise<PersonaResult> {
  const score = { athlete: 0, commuter: 0, outdoor: 0, family: 0 };
  const reasoning: string[] = [];

  // Direct poll result takes precedence
  if (context.pollResult) {
    return {
      label: context.pollResult,
      confidence: 0.95,
      reasoning: 'Direct user selection via poll'
    };
  }

  // UTM parameter analysis
  if (context.utmParams) {
    const source = context.utmParams.utm_source?.toLowerCase();
    const medium = context.utmParams.utm_medium?.toLowerCase();
    const campaign = context.utmParams.utm_campaign?.toLowerCase();
    const content = context.utmParams.utm_content?.toLowerCase();

    // Athlete indicators
    if (source?.includes('fitness') || source?.includes('gym') ||
        source?.includes('strava') || campaign?.includes('sport')) {
      score.athlete += 0.4;
      reasoning.push(`Fitness source: ${source || campaign}`);
    }

    // Commuter indicators
    if (source?.includes('linkedin') || campaign?.includes('office') ||
        campaign?.includes('work') || content?.includes('daily')) {
      score.commuter += 0.4;
      reasoning.push(`Work/commute source: ${source || campaign}`);
    }

    // Outdoor indicators
    if (source?.includes('outdoor') || source?.includes('rei') ||
        source?.includes('trail') || campaign?.includes('adventure')) {
      score.outdoor += 0.4;
      reasoning.push('Outdoor source detected');
    }

    // Family indicators
    if (source?.includes('parent') || source?.includes('mom') ||
        source?.includes('family') || campaign?.includes('kids')) {
      score.family += 0.4;
      reasoning.push('Family/parenting source');
    }

    // Explicit persona UTM
    const utmPersona = context.utmParams.utm_persona;
    if (utmPersona && ['athlete', 'commuter', 'outdoor', 'family'].includes(utmPersona)) {
      score[utmPersona as WaterBottlePersona] += 0.6;
      reasoning.push(`UTM persona: ${utmPersona}`);
    }
  }

  // Time-based heuristics
  const hour = context.timeOfDay || new Date().getHours();
  const day = context.dayOfWeek || new Date().getDay();

  // Early morning (5-7am) = likely athlete
  if (hour >= 5 && hour <= 7) {
    score.athlete += 0.2;
    reasoning.push('Early morning visitor (athlete pattern)');
  }

  // Commute hours (7-9am, 5-7pm) weekdays = commuter
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    if (day >= 1 && day <= 5) { // Monday-Friday
      score.commuter += 0.3;
      reasoning.push('Commute hours on weekday');
    }
  }

  // Weekend = outdoor/family
  if (day === 0 || day === 6) {
    score.outdoor += 0.1;
    score.family += 0.1;
    reasoning.push('Weekend visitor');
  }

  // Device type analysis
  if (context.deviceType) {
    switch (context.deviceType) {
      case 'mobile':
        score.athlete += 0.1; // On-the-go fitness tracking
        score.family += 0.1; // Parents browsing on mobile
        reasoning.push('Mobile device');
        break;
      case 'desktop':
        score.commuter += 0.2; // Office browsing
        reasoning.push('Desktop (office pattern)');
        break;
      case 'tablet':
        score.family += 0.2; // Family tablet usage
        reasoning.push('Tablet device');
        break;
    }
  }

  // Referrer analysis
  if (context.referrer) {
    const referrer = context.referrer.toLowerCase();

    // Fitness sites
    if (referrer.includes('runner') || referrer.includes('fitness') ||
        referrer.includes('gym') || referrer.includes('training')) {
      score.athlete += 0.3;
      reasoning.push('Fitness referrer');
    }

    // Outdoor sites
    if (referrer.includes('outdoor') || referrer.includes('hiking') ||
        referrer.includes('camping') || referrer.includes('trail')) {
      score.outdoor += 0.3;
      reasoning.push('Outdoor referrer');
    }

    // Parenting sites
    if (referrer.includes('parent') || referrer.includes('mom') ||
        referrer.includes('dad') || referrer.includes('family')) {
      score.family += 0.3;
      reasoning.push('Family/parenting referrer');
    }

    // Professional/office
    if (referrer.includes('office') || referrer.includes('productivity') ||
        referrer.includes('linkedin')) {
      score.commuter += 0.3;
      reasoning.push('Professional referrer');
    }
  }

  // Session data analysis
  if (context.sessionData) {
    const { searchTerms, viewedProducts, cartSize } = context.sessionData;

    if (searchTerms) {
      const terms = searchTerms.toLowerCase();
      if (terms.includes('sport') || terms.includes('gym')) score.athlete += 0.3;
      if (terms.includes('office') || terms.includes('work')) score.commuter += 0.3;
      if (terms.includes('hiking') || terms.includes('camping')) score.outdoor += 0.3;
      if (terms.includes('kids') || terms.includes('spill')) score.family += 0.3;
    }

    if (cartSize > 2) {
      score.family += 0.2; // Multiple items suggests family shopping
      reasoning.push('Multiple items in cart');
    }
  }

  // Default baseline (slight bias toward commuter as most common)
  score.commuter += 0.1;

  // Find highest scoring persona
  const personas = Object.entries(score) as [WaterBottlePersona, number][];
  personas.sort((a, b) => b[1] - a[1]);

  const [topPersona, topScore] = personas[0];
  const [secondPersona, secondScore] = personas[1];

  // Calculate confidence based on margin
  const margin = topScore - secondScore;
  const confidence = Math.min(0.95, Math.max(0.3, margin));

  // If confidence is too low, default to 'commuter'
  if (confidence < 0.4 && topPersona !== 'commuter') {
    return {
      label: 'commuter',
      confidence: 0.4,
      reasoning: `Low confidence (${confidence.toFixed(2)}), defaulting to commuter. ${reasoning.join(', ')}`
    };
  }

  return {
    label: topPersona,
    confidence,
    reasoning: reasoning.join(', ') || 'Default classification'
  };
}

// Extract persona context from request
export function extractPersonaContext(request: Request): PersonaContext {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || undefined;
  const referrer = request.headers.get('referer') || undefined;

  // Extract UTM parameters
  const utmParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key.startsWith('utm_')) {
      utmParams[key] = value;
    }
  });

  // Basic device type detection
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
    dayOfWeek: now.getDay()
  };
}

// Validate persona poll result
export function validatePersonaPoll(persona: string): WaterBottlePersona | null {
  if (['athlete', 'commuter', 'outdoor', 'family'].includes(persona)) {
    return persona as WaterBottlePersona;
  }
  return null;
}
