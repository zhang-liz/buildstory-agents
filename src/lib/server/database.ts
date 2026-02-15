import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BanditState } from './bandit';
import { Storyboard } from '@/lib/storyboard';
import { WaterBottlePersona } from '@/lib/personas';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. ' +
    'Set them in .env.local or your deployment environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Story {
  id: string;
  brief: string;
  brand: Record<string, unknown>;
  created_at: string;
}

export interface StoryboardRecord {
  id: string;
  story_id: string;
  persona: WaterBottlePersona;
  variant_hash: string;
  json: Storyboard;
  created_at: string;
}

export interface BanditStateRecord {
  story_id: string;
  section_key: string;
  variant_hash: string;
  alpha: number;
  beta: number;
}

export interface Event {
  id: number;
  story_id: string;
  persona: WaterBottlePersona;
  section_key: string;
  variant_hash: string;
  event: string;
  meta: Record<string, unknown>; // event payload JSON
  ts: string;
}

// Story operations
export async function createStory(brief: string, brand: Record<string, unknown>): Promise<Story> {
  const { data, error } = await supabase
    .from('stories')
    .insert([{ brief, brand }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create story: ${error.message}`);
  return data;
}

/** Cached per request so page and generateMetadata share one fetch. */
export const getStory = cache(async (id: string): Promise<Story | null> => {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get story: ${error.message}`);
  }
  return data;
});

// Storyboard operations
export async function saveStoryboard(
  storyId: string,
  persona: WaterBottlePersona,
  variantHash: string,
  storyboard: Storyboard
): Promise<StoryboardRecord> {
  const { data, error } = await supabase
    .from('storyboards')
    .insert([{
      story_id: storyId,
      persona,
      variant_hash: variantHash,
      json: storyboard
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to save storyboard: ${error.message}`);
  return data;
}

export async function getLatestStoryboard(storyId: string, persona: WaterBottlePersona): Promise<StoryboardRecord | null> {
  const { data, error } = await supabase
    .from('storyboards')
    .select('*')
    .eq('story_id', storyId)
    .eq('persona', persona)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get storyboard: ${error.message}`);
  }
  return data;
}

/** Get all storyboard versions for a story + persona (for multi-variant bandit). */
export async function getAllStoryboardsForPersona(
  storyId: string,
  persona: WaterBottlePersona
): Promise<StoryboardRecord[]> {
  const { data, error } = await supabase
    .from('storyboards')
    .select('*')
    .eq('story_id', storyId)
    .eq('persona', persona)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get storyboards: ${error.message}`);
  return data || [];
}

// Bandit state operations
export async function getBanditState(
  storyId: string,
  sectionKey: string,
  variantHash: string
): Promise<BanditState | null> {
  const { data, error } = await supabase
    .from('bandit_state')
    .select('*')
    .eq('story_id', storyId)
    .eq('section_key', sectionKey)
    .eq('variant_hash', variantHash)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get bandit state: ${error.message}`);
  }

  // Convert snake_case to camelCase
  return {
    storyId: data.story_id,
    sectionKey: data.section_key,
    variantHash: data.variant_hash,
    alpha: data.alpha,
    beta: data.beta
  };
}

export async function updateBanditState(state: BanditState): Promise<void> {
  // Convert camelCase to snake_case for database
  const dbState = {
    story_id: state.storyId,
    section_key: state.sectionKey,
    variant_hash: state.variantHash,
    alpha: state.alpha,
    beta: state.beta
  };

  const { error } = await supabase
    .from('bandit_state')
    .upsert([dbState], {
      onConflict: 'story_id,section_key,variant_hash'
    });

  if (error) throw new Error(`Failed to update bandit state: ${error.message}`);
}

export async function getAllBanditStates(storyId: string, sectionKey: string): Promise<BanditState[]> {
  const { data, error } = await supabase
    .from('bandit_state')
    .select('*')
    .eq('story_id', storyId)
    .eq('section_key', sectionKey);

  if (error) throw new Error(`Failed to get bandit states: ${error.message}`);

  // Convert snake_case to camelCase
  return (data || []).map(item => ({
    storyId: item.story_id,
    sectionKey: item.section_key,
    variantHash: item.variant_hash,
    alpha: item.alpha,
    beta: item.beta
  }));
}

/** Get all bandit states for a story (all sections). Used by processTimeouts. */
export async function getBanditStatesForStory(storyId: string): Promise<BanditState[]> {
  const { data, error } = await supabase
    .from('bandit_state')
    .select('*')
    .eq('story_id', storyId);

  if (error) throw new Error(`Failed to get bandit states for story: ${error.message}`);

  return (data || []).map(item => ({
    storyId: item.story_id,
    sectionKey: item.section_key,
    variantHash: item.variant_hash,
    alpha: item.alpha,
    beta: item.beta
  }));
}

// Event operations
export async function trackEvent(
  storyId: string,
  persona: WaterBottlePersona,
  sectionKey: string,
  variantHash: string,
  event: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .insert([{
      story_id: storyId,
      persona,
      section_key: sectionKey,
      variant_hash: variantHash,
      event,
      meta
    }]);

  if (error) throw new Error(`Failed to track event: ${error.message}`);
}

export async function getRecentEvents(
  storyId: string,
  minutesBack: number = 60
): Promise<Event[]> {
  const cutoff = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('story_id', storyId)
    .gte('ts', cutoff)
    .order('ts', { ascending: false });

  if (error) throw new Error(`Failed to get recent events: ${error.message}`);
  return data || [];
}

export async function getConversionEvents(
  storyId: string,
  sectionKey: string,
  variantHash: string,
  timeoutMinutes: number = 5
): Promise<number> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('event')
    .eq('story_id', storyId)
    .eq('section_key', sectionKey)
    .eq('variant_hash', variantHash)
    .gte('ts', cutoff)
    .in('event', ['ctaClick']);

  if (error) throw new Error(`Failed to get conversion events: ${error.message}`);
  return data?.length || 0;
}
