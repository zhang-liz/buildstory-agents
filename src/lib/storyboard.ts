import { z } from 'zod';
import { WaterBottlePersona } from './personas';

// Brand schema
export const BrandSchema = z.object({
  name: z.string(),
  tone: z.string(),
  palette: z.array(z.string()),
  logoAlt: z.string()
});

// CTA schema
export const CTASchema = z.object({
  text: z.string(),
  goal: z.string()
});

// Base section schema
export const SectionBaseSchema = z.object({
  key: z.string(),
  type: z.string()
});

// Hero section
export const HeroSectionSchema = SectionBaseSchema.extend({
  type: z.literal('hero'),
  headline: z.string(),
  sub: z.string(),
  cta: z.array(CTASchema),
  demoIdea: z.string()
});

// Bullets section
export const BulletsSectionSchema = SectionBaseSchema.extend({
  type: z.literal('bullets'),
  items: z.array(z.string())
});

// Steps section
export const StepsSectionSchema = SectionBaseSchema.extend({
  type: z.literal('steps'),
  items: z.array(z.string())
});

// Quote schema
export const QuoteSchema = z.object({
  text: z.string(),
  role: z.string()
});

// Quotes section
export const QuotesSectionSchema = SectionBaseSchema.extend({
  type: z.literal('quotes'),
  quotes: z.array(QuoteSchema)
});

// Tier schema
export const TierSchema = z.object({
  name: z.string(),
  price: z.string(),
  features: z.array(z.string()),
  cta: z.string()
});

// Tiers section
export const TiersSectionSchema = SectionBaseSchema.extend({
  type: z.literal('tiers'),
  tiers: z.array(TierSchema)
});

// QnA section
export const QnASectionSchema = SectionBaseSchema.extend({
  type: z.literal('qna'),
  qna: z.array(z.tuple([z.string(), z.string()]))
});

// Union of all section types
export const SectionSchema = z.discriminatedUnion('type', [
  HeroSectionSchema,
  BulletsSectionSchema,
  StepsSectionSchema,
  QuotesSectionSchema,
  TiersSectionSchema,
  QnASectionSchema
]);

// Water bottle persona enum
export const PersonaEnum = z.enum(['athlete', 'commuter', 'outdoor', 'family']);

// Main Storyboard schema with water bottle personas
export const StoryboardSchema = z.object({
  version: z.literal(1),
  brand: BrandSchema,
  persona: PersonaEnum,
  sections: z.array(SectionSchema)
});

// TypeScript types
export type Brand = z.infer<typeof BrandSchema>;
export type CTA = z.infer<typeof CTASchema>;
export type SectionBase = z.infer<typeof SectionBaseSchema>;
export type HeroSection = z.infer<typeof HeroSectionSchema>;
export type BulletsSection = z.infer<typeof BulletsSectionSchema>;
export type StepsSection = z.infer<typeof StepsSectionSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type QuotesSection = z.infer<typeof QuotesSectionSchema>;
export type Tier = z.infer<typeof TierSchema>;
export type TiersSection = z.infer<typeof TiersSectionSchema>;
export type QnASection = z.infer<typeof QnASectionSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Storyboard = z.infer<typeof StoryboardSchema>;

// Parser function
export function parseStoryboard(json: unknown): Storyboard {
  return StoryboardSchema.parse(json);
}

// Section parser
export function parseSection(json: unknown): Section {
  return SectionSchema.parse(json);
}

// Variant hash generator
export async function generateVariantHash(section: Section): Promise<string> {
  const jsonString = JSON.stringify(section, Object.keys(section).sort());
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
