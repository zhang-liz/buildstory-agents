import 'server-only';
import { z } from 'zod';
import { SectionSchema, BrandSchema } from '@/lib/storyboard';

// ---------------------------------------------------------------------------
// Persona Agent
// ---------------------------------------------------------------------------

export const PersonaContextSchema = z.object({
  userAgent: z.string().optional(),
  referrer: z.string().optional(),
  utmParams: z.record(z.string(), z.string()).optional(),
  pollResult: z.string().optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  sessionData: z.record(z.string(), z.unknown()).optional(),
  timeOfDay: z.number().int().min(0).max(23).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
});

export const PersonaResultSchema = z.object({
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// ---------------------------------------------------------------------------
// Strategist Agent
// ---------------------------------------------------------------------------

export const StrategistContextSchema = z.object({
  storyId: z.string().uuid(),
  persona: z.string().min(1),
  sectionKey: z.string().min(1),
  availableVariants: z.array(SectionSchema).min(1),
});

export const VariantChoiceSchema = z.object({
  sectionKey: z.string(),
  variantHash: z.string(),
  section: SectionSchema,
  confidence: z.number().min(0).max(1),
  isNew: z.boolean(),
});

// ---------------------------------------------------------------------------
// Brand Agent
// ---------------------------------------------------------------------------

export const BrandValidationInputSchema = z.object({
  section: SectionSchema,
  brand: BrandSchema,
});

export const BrandValidationResultSchema = z.object({
  isValid: z.boolean(),
  score: z.number().min(0).max(1),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  correctedSection: SectionSchema.optional(),
});

// ---------------------------------------------------------------------------
// Section Agent
// ---------------------------------------------------------------------------

export const SectionContextSchema = z.object({
  storyId: z.string(),
  persona: z.string().min(1),
  brief: z.string(),
  brand: z.object({
    name: z.string(),
    tone: z.string(),
    palette: z.array(z.string()),
    logoAlt: z.string(),
  }),
  existingSection: SectionSchema.optional(),
  goal: z.string().optional(),
});

// Section agent output is just SectionSchema (already defined in storyboard.ts)

// ---------------------------------------------------------------------------
// Data Agent
// ---------------------------------------------------------------------------

export const DataAgentInputSchema = z.object({
  storyId: z.string().uuid(),
  persona: z.string().min(1),
  minutesBack: z.number().int().positive().default(60),
});

export const ProofInsightSchema = z.object({
  type: z.enum(['usage', 'conversion', 'engagement', 'performance']),
  metric: z.string(),
  value: z.union([z.number(), z.string()]),
  timeframe: z.string(),
  credibility: z.number().min(0).max(1),
});

export const GeneratedProofSchema = z.object({
  quotes: z.array(
    z.object({
      text: z.string(),
      role: z.string(),
      source: z.enum(['generated', 'real']),
      credibility: z.number().min(0).max(1),
    })
  ),
  metrics: z.array(ProofInsightSchema),
  updated: z.string(),
});

// ---------------------------------------------------------------------------
// Deploy / Conversion helpers
// ---------------------------------------------------------------------------

export const DeployVariantInputSchema = z.object({
  storyId: z.string().uuid(),
  persona: z.string().min(1),
  sectionKey: z.string().min(1),
  section: SectionSchema,
});

export const RecordConversionInputSchema = z.object({
  storyId: z.string().uuid(),
  persona: z.string().min(1),
  sectionKey: z.string().min(1),
  variantHash: z.string().min(1),
  reward: z.number().min(0).max(1).default(1),
});

// ---------------------------------------------------------------------------
// Re-export types
// ---------------------------------------------------------------------------

export type PersonaContext = z.infer<typeof PersonaContextSchema>;
export type PersonaResult = z.infer<typeof PersonaResultSchema>;
export type StrategistContext = z.infer<typeof StrategistContextSchema>;
export type VariantChoice = z.infer<typeof VariantChoiceSchema>;
export type BrandValidationInput = z.infer<typeof BrandValidationInputSchema>;
export type BrandValidationResult = z.infer<typeof BrandValidationResultSchema>;
export type SectionContext = z.infer<typeof SectionContextSchema>;
export type DataAgentInput = z.infer<typeof DataAgentInputSchema>;
export type ProofInsight = z.infer<typeof ProofInsightSchema>;
export type GeneratedProof = z.infer<typeof GeneratedProofSchema>;
