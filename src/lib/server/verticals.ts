import 'server-only';
import { supabase } from './database';
import { Section, parseSection } from '@/lib/storyboard';

export interface VerticalTemplate {
  id: string;
  vertical: string;
  section_key: string;
  template: unknown;
  brand_defaults: Record<string, unknown>;
  created_at: string;
}

let _cache: { templates: VerticalTemplate[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function getVerticalTemplates(vertical: string): Promise<VerticalTemplate[]> {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) {
    return _cache.templates.filter((t) => t.vertical === vertical);
  }

  const { data, error } = await supabase
    .from('vertical_templates')
    .select('*')
    .order('vertical');

  if (error) {
    console.error('Failed to load vertical templates:', error.message);
    return [];
  }

  _cache = { templates: data ?? [], expiresAt: now + CACHE_TTL_MS };
  return _cache.templates.filter((t) => t.vertical === vertical);
}

export async function getVerticalSectionTemplate(
  vertical: string,
  sectionKey: string
): Promise<Section | null> {
  const templates = await getVerticalTemplates(vertical);
  const match = templates.find((t) => t.section_key === sectionKey);
  if (!match) return null;

  try {
    return parseSection(match.template);
  } catch {
    return null;
  }
}

export async function getVerticalBrandDefaults(
  vertical: string
): Promise<Record<string, unknown> | null> {
  const templates = await getVerticalTemplates(vertical);
  if (templates.length === 0) return null;
  return templates[0].brand_defaults ?? null;
}

export const SUPPORTED_VERTICALS = [
  'general',
  'saas',
  'ecommerce',
  'healthcare',
  'fintech',
  'education',
  'real-estate',
  'fitness',
  'food-beverage',
  'travel',
] as const;

export type Vertical = (typeof SUPPORTED_VERTICALS)[number];
