import 'server-only';
import { Section, parseSection } from '@/lib/storyboard';
import { SectionContextSchema } from './contracts';
import type { SectionContext } from './contracts';
import { openaiChat } from '../openai';
import { getSectionPerformance } from './strategist';
import { withMetrics } from '../metrics';

export type { SectionContext };

async function _generateSection(sectionKey: string, context: SectionContext): Promise<Section> {
  const { persona, brief, brand, existingSection, goal } = context;

  const systemPrompt = getSystemPrompt(sectionKey, brand.tone);
  const userPrompt = getUserPrompt(sectionKey, persona, brief, brand, existingSection, goal);

  try {
    const content = await openaiChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const sectionJson = JSON.parse(content);
    return parseSection(sectionJson);
  } catch (error) {
    console.error('Error generating section:', error);
    return getTemplateSection(sectionKey, persona, brief);
  }
}

export async function generateSection(
  sectionKey: string,
  context: SectionContext
): Promise<Section> {
  const validated = SectionContextSchema.parse(context);
  return withMetrics('section', 'generate', () => _generateSection(sectionKey, validated), {
    sectionKey,
  });
}

export async function optimizeSection(
  sectionKey: string,
  context: SectionContext,
  goal: string = 'conversion'
): Promise<Section> {
  const validated = SectionContextSchema.parse(context);

  return withMetrics(
    'section',
    'optimize',
    async () => {
      const performance = await getSectionPerformance(validated.storyId, sectionKey);

      let optimizationHints = '';
      if (performance.totalTrials > 10) {
        const bestVariant = performance.variants.find(
          (v) => v.variantHash === performance.bestVariant
        );
        if (bestVariant && bestVariant.conversionRate > 0.1) {
          optimizationHints = `The current best variant has a ${(bestVariant.conversionRate * 100).toFixed(1)}% conversion rate. `;
        } else {
          optimizationHints = 'Current variants are underperforming. Try a different approach. ';
        }
      }

      const enhancedContext: SectionContext = {
        ...validated,
        goal: `${goal}. ${optimizationHints}Focus on improving engagement and conversions.`,
      };

      return _generateSection(sectionKey, enhancedContext);
    },
    { sectionKey }
  );
}

function getSystemPrompt(sectionKey: string, tone: string): string {
  const basePrompt = `You are a conversion copy expert. Generate ONLY valid JSON for a ${sectionKey} section.
Use tone: ${tone}. Be concise, avoid superlatives, focus on value proposition.
Respond with ONLY the JSON object, no explanations.`;

  const sectionSpecificPrompts: Record<string, string> = {
    hero: `${basePrompt} Create a hero section with compelling headline, supporting text, and clear CTA.`,
    problem: `${basePrompt} Create a bullets section highlighting key pain points the product solves.`,
    solution: `${basePrompt} Create a steps section showing how the product works or key benefits.`,
    proof: `${basePrompt} Create a quotes section with realistic testimonials or social proof.`,
    pricing: `${basePrompt} Create a tiers section with pricing options and features.`,
    faq: `${basePrompt} Create a qna section addressing common concerns or questions.`,
  };

  return sectionSpecificPrompts[sectionKey] || basePrompt;
}

function getUserPrompt(
  sectionKey: string,
  persona: string,
  brief: string,
  brand: SectionContext['brand'],
  existingSection?: Section,
  goal?: string
): string {
  let prompt = `Product: ${brief}\nBrand: ${brand.name}\nPersona: ${persona}\n`;

  if (goal) {
    prompt += `Goal: ${goal}\n`;
  }

  if (existingSection) {
    prompt += `Improve this existing section:\n${JSON.stringify(existingSection, null, 2)}\n`;
  }

  prompt += `\nGenerate a ${sectionKey} section targeting ${persona} persona. Use ${brand.tone} tone.`;

  return prompt;
}

function getTemplateSection(sectionKey: string, persona: string, brief: string): Section {
  const personaLabel =
    persona === 'athlete'
      ? 'Athletes'
      : persona === 'commuter'
        ? 'Daily Commuters'
        : persona === 'outdoor'
          ? 'Outdoor Adventures'
          : 'Families';

  const templates: Record<string, Section> = {
    hero: {
      key: 'hero',
      type: 'hero',
      headline: `Perfect Hydration for ${personaLabel}`,
      sub: `${brief} - designed for your lifestyle.`,
      cta: [{ text: 'Get Started', goal: 'signup' }],
      demoIdea: 'Interactive demo showing key workflow',
    },
    problem: {
      key: 'problem',
      type: 'bullets',
      items: [
        'Current solutions are too complex',
        'Time-consuming manual processes',
        'Lack of integration capabilities',
        'Poor user experience',
      ],
    },
    solution: {
      key: 'solution',
      type: 'steps',
      items: [
        'Connect your existing tools',
        'Configure automated workflows',
        'Monitor and optimize performance',
      ],
    },
    proof: {
      key: 'proof',
      type: 'quotes',
      quotes: [
        { text: 'This solution saved us 10 hours per week.', role: 'CTO, TechCorp' },
        { text: 'The ROI was immediate and substantial.', role: 'VP Engineering' },
      ],
    },
    pricing: {
      key: 'pricing',
      type: 'tiers',
      tiers: [
        {
          name: 'Starter',
          price: '$29/month',
          features: ['Basic features', 'Email support', '5 projects'],
          cta: 'Start Free Trial',
        },
        {
          name: 'Pro',
          price: '$99/month',
          features: ['Advanced features', 'Priority support', 'Unlimited projects'],
          cta: 'Get Started',
        },
      ],
    },
    faq: {
      key: 'faq',
      type: 'qna',
      qna: [
        ['How long does setup take?', 'Most customers are up and running in under 15 minutes.'],
        [
          'Do you offer integrations?',
          'Yes, we integrate with 100+ popular tools and platforms.',
        ],
        [
          'What support do you provide?',
          '24/7 email support with enterprise phone support available.',
        ],
      ],
    },
  } as Record<string, Section>;

  return templates[sectionKey] ?? templates.hero;
}

export function validateSectionBrand(
  section: Section,
  brand: { tone: string; palette: string[] }
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  const sectionText = JSON.stringify(section).toLowerCase();

  if (
    brand.tone === 'professional' &&
    (sectionText.includes('awesome') ||
      sectionText.includes('amazing') ||
      sectionText.includes('!!'))
  ) {
    issues.push('Language too casual for professional tone');
  }

  if (
    brand.tone === 'friendly' &&
    (sectionText.includes('utilize') ||
      sectionText.includes('enterprise-grade') ||
      sectionText.includes('leverage'))
  ) {
    issues.push('Language too formal for friendly tone');
  }

  const superlatives = ['best', 'greatest', 'ultimate', 'perfect', 'revolutionary'];
  const superlativeCount = superlatives.reduce(
    (count, word) => count + (sectionText.match(new RegExp(word, 'g')) || []).length,
    0
  );

  if (superlativeCount > 2) {
    issues.push('Too many superlatives - be more specific');
  }

  return { isValid: issues.length === 0, issues };
}

export async function generateVariants(
  sectionKey: string,
  context: SectionContext,
  count: number = 3
): Promise<Section[]> {
  const validated = SectionContextSchema.parse(context);
  const variants: Section[] = [];

  for (let i = 0; i < count; i++) {
    const variantContext: SectionContext = {
      ...validated,
      goal: `Create variant ${i + 1} with different messaging approach`,
    };

    try {
      const variant = await _generateSection(sectionKey, variantContext);
      variants.push(variant);
    } catch (error) {
      console.error(`Error generating variant ${i + 1}:`, error);
      variants.push(getTemplateSection(sectionKey, validated.persona, validated.brief));
    }
  }

  return variants;
}
