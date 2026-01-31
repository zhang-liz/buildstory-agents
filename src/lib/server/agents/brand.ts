import 'server-only';
import { Section, Brand } from '@/lib/storyboard';
import { getOpenAIModel } from '../config';

export interface BrandValidationResult {
  isValid: boolean;
  score: number; // 0-1 score for brand alignment
  issues: string[];
  suggestions: string[];
  correctedSection?: Section;
}

// Main brand validation function
export async function validateBrandAlignment(
  section: Section,
  brand: Brand
): Promise<BrandValidationResult> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  // Tone validation
  const toneResult = validateTone(section, brand.tone);
  score *= toneResult.score;
  issues.push(...toneResult.issues);
  suggestions.push(...toneResult.suggestions);

  // Voice consistency validation
  const voiceResult = validateVoice(section, brand);
  score *= voiceResult.score;
  issues.push(...voiceResult.issues);
  suggestions.push(...voiceResult.suggestions);

  // Content quality validation
  const qualityResult = validateContentQuality(section);
  score *= qualityResult.score;
  issues.push(...qualityResult.issues);
  suggestions.push(...qualityResult.suggestions);

  const isValid = score >= 0.7 && issues.length === 0;

  // If not valid, attempt correction
  let correctedSection: Section | undefined;
  if (!isValid && score >= 0.5) {
    try {
      correctedSection = await correctBrandIssues(section, brand, issues);
    } catch (error) {
      console.error('Error correcting brand issues:', error);
    }
  }

  return {
    isValid,
    score,
    issues,
    suggestions,
    correctedSection
  };
}

// Validate tone alignment
function validateTone(section: Section, tone: string): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  const sectionText = extractTextFromSection(section).toLowerCase();

  const toneRules: Record<string, {
    avoid: string[];
    prefer: string[];
    patterns: RegExp[];
  }> = {
    professional: {
      avoid: ['awesome', 'amazing', 'super', 'crazy', 'insane'],
      prefer: ['optimize', 'enhance', 'streamline', 'efficient'],
      patterns: [/!{2,}/, /\b(lol|omg|wow)\b/]
    },
    friendly: {
      avoid: ['utilize', 'leverage', 'synergize', 'paradigm'],
      prefer: ['use', 'help', 'simple', 'easy'],
      patterns: [/\b(enterprise-grade|mission-critical)\b/]
    },
    authoritative: {
      avoid: ['maybe', 'perhaps', 'might', 'could'],
      prefer: ['proven', 'guaranteed', 'expert', 'leading'],
      patterns: [/\?\?\?/, /\b(i think|i believe)\b/]
    },
    conversational: {
      avoid: ['aforementioned', 'heretofore', 'pursuant'],
      prefer: ['you', 'your', 'we', 'our'],
      patterns: [/\b(per se|vis-à-vis)\b/]
    }
  };

  const rules = toneRules[tone.toLowerCase()];
  if (!rules) return { score, issues, suggestions };

  // Check avoided words
  for (const word of rules.avoid) {
    if (sectionText.includes(word)) {
      issues.push(`Avoid "${word}" for ${tone} tone`);
      score -= 0.1;
    }
  }

  // Check preferred words (bonus for using them)
  const preferredCount = rules.prefer.filter(word =>
    sectionText.includes(word)
  ).length;
  if (preferredCount === 0) {
    suggestions.push(`Consider using words like: ${rules.prefer.slice(0, 3).join(', ')}`);
  }

  // Check patterns
  for (const pattern of rules.patterns) {
    if (pattern.test(sectionText)) {
      issues.push(`Pattern "${pattern.source}" doesn't match ${tone} tone`);
      score -= 0.15;
    }
  }

  return { score: Math.max(0, score), issues, suggestions };
}

// Validate voice consistency
function validateVoice(section: Section, brand: Brand): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  const sectionText = extractTextFromSection(section);

  // Check brand name consistency
  if (brand.name && !sectionText.includes(brand.name)) {
    suggestions.push(`Consider mentioning brand name "${brand.name}"`);
  }

  // Check for excessive superlatives
  const superlatives = ['best', 'greatest', 'ultimate', 'perfect', 'revolutionary', 'game-changing'];
  const superlativeCount = superlatives.reduce((count, word) =>
    count + (sectionText.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0
  );

  if (superlativeCount > 2) {
    issues.push('Too many superlatives - be more specific and credible');
    score -= 0.2;
  }

  // Check for unverifiable claims
  const unverifiableClaims = [
    /\b(the best|#1|world's leading|industry leader)\b/i,
    /\b(revolutionary|groundbreaking|game-changing)\b/i,
    /\b(100% guaranteed|never fails|always works)\b/i
  ];

  for (const pattern of unverifiableClaims) {
    if (pattern.test(sectionText)) {
      issues.push('Avoid unverifiable claims - use specific metrics instead');
      score -= 0.15;
    }
  }

  return { score: Math.max(0, score), issues, suggestions };
}

// Validate content quality
function validateContentQuality(section: Section): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  const sectionText = extractTextFromSection(section);

  // Check for PII patterns
  const piiPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ // Credit card
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(sectionText)) {
      issues.push('Contains potential PII - remove personal information');
      score = 0; // Immediate fail for PII
    }
  }

  // Check for profanity (simple list)
  const profanity = ['damn', 'hell', 'crap', 'sucks']; // Basic list
  for (const word of profanity) {
    if (sectionText.toLowerCase().includes(word)) {
      issues.push(`Remove inappropriate language: "${word}"`);
      score -= 0.3;
    }
  }

  // Check text length appropriateness
  if (section.type === 'hero') {
    const heroSection = section;
    if (heroSection.headline && heroSection.headline.length > 80) {
      suggestions.push('Consider shorter headline for better impact');
    }
    if (heroSection.sub && heroSection.sub.length > 160) {
      suggestions.push('Subheadline is quite long - consider breaking it up');
    }
  }

  // Check for empty or too short content
  if (sectionText.trim().length < 10) {
    issues.push('Content too short - add more substance');
    score -= 0.5;
  }

  return { score: Math.max(0, score), issues, suggestions };
}

// Extract all text from a section for analysis
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

// Correct brand issues using LLM
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

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for consistency
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse and validate corrected section
    const correctedSection = JSON.parse(content);

    // Basic validation to ensure structure is maintained
    if (correctedSection.type !== section.type || correctedSection.key !== section.key) {
      throw new Error('Correction changed section structure');
    }

    return correctedSection;

  } catch (error) {
    console.error('Error correcting brand issues:', error);
    throw error;
  }
}

// Get brand score for entire storyboard
export function getBrandScore(sections: Section[], brand: Brand): Promise<number> {
  return Promise.all(
    sections.map(section => validateBrandAlignment(section, brand))
  ).then(results => {
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    return totalScore / results.length;
  });
}

// Generate brand-compliant alternatives
export async function generateBrandCompliantAlternative(
  section: Section,
  brand: Brand,
  targetTone?: string
): Promise<Section> {
  const tone = targetTone || brand.tone;

  const systemPrompt = `You are a conversion copywriter. Rewrite the section to perfectly match the brand guidelines.
Brand: ${brand.name}
Tone: ${tone}
Palette colors: ${brand.palette.join(', ')}

Keep the same section type and structure. Make the copy more aligned with the brand voice.
Return ONLY the JSON, no explanations.`;

  const userPrompt = `Rewrite this section for better brand alignment:\n${JSON.stringify(section, null, 2)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return JSON.parse(content);

  } catch (error) {
    console.error('Error generating brand-compliant alternative:', error);
    return section; // Return original on error
  }
}
