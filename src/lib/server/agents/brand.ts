import 'server-only';
import { Section, Brand, parseSection } from '@/lib/storyboard';
import { BrandValidationInputSchema, BrandValidationResultSchema } from './contracts';
import type { BrandValidationResult } from './contracts';
import { openaiChat } from '../openai';
import { withMetrics } from '../metrics';

export type { BrandValidationResult };

async function _validateBrandAlignment(
  section: Section,
  brand: Brand
): Promise<BrandValidationResult> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  const toneResult = validateTone(section, brand.tone);
  score *= toneResult.score;
  issues.push(...toneResult.issues);
  suggestions.push(...toneResult.suggestions);

  const voiceResult = validateVoice(section, brand);
  score *= voiceResult.score;
  issues.push(...voiceResult.issues);
  suggestions.push(...voiceResult.suggestions);

  const qualityResult = validateContentQuality(section);
  score *= qualityResult.score;
  issues.push(...qualityResult.issues);
  suggestions.push(...qualityResult.suggestions);

  const isValid = score >= 0.7 && issues.length === 0;

  let correctedSection: Section | undefined;
  if (!isValid && score >= 0.5) {
    try {
      correctedSection = await correctBrandIssues(section, brand, issues);
    } catch (error) {
      console.error('Error correcting brand issues:', error);
    }
  }

  return { isValid, score, issues, suggestions, correctedSection };
}

export async function validateBrandAlignment(
  section: Section,
  brand: Brand
): Promise<BrandValidationResult> {
  BrandValidationInputSchema.parse({ section, brand });
  const result = await withMetrics('brand', 'validate', () =>
    _validateBrandAlignment(section, brand)
  );
  return BrandValidationResultSchema.parse(result);
}

function validateTone(
  section: Section,
  tone: string
): { score: number; issues: string[]; suggestions: string[] } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  const sectionText = extractTextFromSection(section).toLowerCase();

  const toneRules: Record<string, { avoid: string[]; prefer: string[]; patterns: RegExp[] }> = {
    professional: {
      avoid: ['awesome', 'amazing', 'super', 'crazy', 'insane'],
      prefer: ['optimize', 'enhance', 'streamline', 'efficient'],
      patterns: [/!{2,}/, /\b(lol|omg|wow)\b/],
    },
    friendly: {
      avoid: ['utilize', 'leverage', 'synergize', 'paradigm'],
      prefer: ['use', 'help', 'simple', 'easy'],
      patterns: [/\b(enterprise-grade|mission-critical)\b/],
    },
    authoritative: {
      avoid: ['maybe', 'perhaps', 'might', 'could'],
      prefer: ['proven', 'guaranteed', 'expert', 'leading'],
      patterns: [/\?\?\?/, /\b(i think|i believe)\b/],
    },
    conversational: {
      avoid: ['aforementioned', 'heretofore', 'pursuant'],
      prefer: ['you', 'your', 'we', 'our'],
      patterns: [/\b(per se|vis-à-vis)\b/],
    },
  };

  const rules = toneRules[tone.toLowerCase()];
  if (!rules) return { score, issues, suggestions };

  for (const word of rules.avoid) {
    if (sectionText.includes(word)) {
      issues.push(`Avoid "${word}" for ${tone} tone`);
      score -= 0.1;
    }
  }

  const preferredCount = rules.prefer.filter((word) => sectionText.includes(word)).length;
  if (preferredCount === 0) {
    suggestions.push(`Consider using words like: ${rules.prefer.slice(0, 3).join(', ')}`);
  }

  for (const pattern of rules.patterns) {
    if (pattern.test(sectionText)) {
      issues.push(`Pattern "${pattern.source}" doesn't match ${tone} tone`);
      score -= 0.15;
    }
  }

  return { score: Math.max(0, score), issues, suggestions };
}

function validateVoice(
  section: Section,
  brand: Brand
): { score: number; issues: string[]; suggestions: string[] } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  const sectionText = extractTextFromSection(section);

  if (brand.name && !sectionText.includes(brand.name)) {
    suggestions.push(`Consider mentioning brand name "${brand.name}"`);
  }

  const superlatives = ['best', 'greatest', 'ultimate', 'perfect', 'revolutionary', 'game-changing'];
  const superlativeCount = superlatives.reduce(
    (count, word) =>
      count + (sectionText.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length,
    0
  );

  if (superlativeCount > 2) {
    issues.push('Too many superlatives - be more specific and credible');
    score -= 0.2;
  }

  const unverifiableClaims = [
    /\b(the best|#1|world's leading|industry leader)\b/i,
    /\b(revolutionary|groundbreaking|game-changing)\b/i,
    /\b(100% guaranteed|never fails|always works)\b/i,
  ];

  for (const pattern of unverifiableClaims) {
    if (pattern.test(sectionText)) {
      issues.push('Avoid unverifiable claims - use specific metrics instead');
      score -= 0.15;
    }
  }

  return { score: Math.max(0, score), issues, suggestions };
}

function validateContentQuality(
  section: Section
): { score: number; issues: string[]; suggestions: string[] } {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  const sectionText = extractTextFromSection(section);

  const piiPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    /\b\d{3}-\d{3}-\d{4}\b/,
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(sectionText)) {
      issues.push('Contains potential PII - remove personal information');
      score = 0;
    }
  }

  const profanity = ['damn', 'hell', 'crap', 'sucks'];
  for (const word of profanity) {
    if (sectionText.toLowerCase().includes(word)) {
      issues.push(`Remove inappropriate language: "${word}"`);
      score -= 0.3;
    }
  }

  if (section.type === 'hero') {
    const heroSection = section;
    if (heroSection.headline && heroSection.headline.length > 80) {
      suggestions.push('Consider shorter headline for better impact');
    }
    if (heroSection.sub && heroSection.sub.length > 160) {
      suggestions.push('Subheadline is quite long - consider breaking it up');
    }
  }

  if (sectionText.trim().length < 10) {
    issues.push('Content too short - add more substance');
    score -= 0.5;
  }

  return { score: Math.max(0, score), issues, suggestions };
}

function extractTextFromSection(section: Section): string {
  let text = '';

  const extractFromObject = (obj: unknown): void => {
    if (typeof obj === 'string') {
      text += obj + ' ';
    } else if (Array.isArray(obj)) {
      obj.forEach(extractFromObject);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(extractFromObject);
    }
  };

  extractFromObject(section);
  return text.trim();
}

async function correctBrandIssues(
  section: Section,
  brand: Brand,
  issues: string[]
): Promise<Section> {
  const systemPrompt = `You are a brand guardian. Fix the provided section JSON to align with brand guidelines.
Brand tone: ${brand.tone}
Brand name: ${brand.name}

Issues to fix:
${issues.join('\n')}

Return ONLY the corrected JSON, maintaining the same structure and section type.`;

  const userPrompt = `Fix this section:\n${JSON.stringify(section, null, 2)}`;

  const content = await openaiChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const raw = JSON.parse(content);

  if (raw.type !== section.type || raw.key !== section.key) {
    throw new Error('Correction changed section structure');
  }

  return parseSection(raw);
}

export function getBrandScore(sections: Section[], brand: Brand): Promise<number> {
  return Promise.all(sections.map((section) => validateBrandAlignment(section, brand))).then(
    (results) => {
      const totalScore = results.reduce((sum, result) => sum + result.score, 0);
      return totalScore / results.length;
    }
  );
}

export async function generateBrandCompliantAlternative(
  section: Section,
  brand: Brand,
  targetTone?: string
): Promise<Section> {
  return withMetrics('brand', 'generateAlternative', async () => {
    const tone = targetTone || brand.tone;

    const systemPrompt = `You are a conversion copywriter. Rewrite the section to perfectly match the brand guidelines.
Brand: ${brand.name}
Tone: ${tone}
Palette colors: ${brand.palette.join(', ')}

Keep the same section type and structure. Make the copy more aligned with the brand voice.
Return ONLY the JSON, no explanations.`;

    const userPrompt = `Rewrite this section for better brand alignment:\n${JSON.stringify(section, null, 2)}`;

    try {
      const content = await openaiChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 800,
      });

      return parseSection(JSON.parse(content));
    } catch (error) {
      console.error('Error generating brand-compliant alternative:', error);
      return section;
    }
  });
}
