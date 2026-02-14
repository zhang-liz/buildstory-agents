import 'server-only';
import { Section, generateVariantHash } from '@/lib/storyboard';
import { WaterBottlePersona } from '@/lib/personas';
import {
  chooseVariant,
  initializeBanditArm,
  updateBanditState,
  BanditArm,
  BanditState
} from '../bandit';
import {
  getBanditState,
  updateBanditState as saveBanditState,
  getAllBanditStates,
  getBanditStatesForStory,
  getConversionEvents,
  trackEvent
} from '../database';

export interface VariantChoice {
  sectionKey: string;
  variantHash: string;
  section: Section;
  confidence: number;
  isNew: boolean;
}

export interface StrategistContext {
  storyId: string;
  persona: WaterBottlePersona;
  sectionKey: string;
  availableVariants: Section[];
}

// Main strategist function - chooses best variant using Thompson Sampling
export async function chooseOptimalVariant(context: StrategistContext): Promise<VariantChoice> {
  const { storyId, persona, sectionKey, availableVariants } = context;

  if (availableVariants.length === 0) {
    throw new Error(`No variants available for section ${sectionKey}`);
  }

  if (availableVariants.length === 1) {
    const variant = availableVariants[0];
    const variantHash = await generateVariantHash(variant);

    // Initialize bandit state if doesn't exist
    await ensureBanditState(storyId, sectionKey, variantHash);

    return {
      sectionKey,
      variantHash,
      section: variant,
      confidence: 1.0,
      isNew: false
    };
  }

  // Get bandit states for all variants
  const banditArms: BanditArm[] = [];

  for (const variant of availableVariants) {
    const variantHash = await generateVariantHash(variant);
    let banditState = await getBanditState(storyId, sectionKey, variantHash);

    if (!banditState) {
      banditState = initializeBanditArm(storyId, sectionKey, variantHash);
      await saveBanditState(banditState);
    }

    banditArms.push({
      arm: { storyId, section: sectionKey, variant: variantHash },
      alpha: banditState.alpha,
      beta: banditState.beta
    });
  }

  // Use Thompson Sampling to choose variant
  const chosenArm = await chooseVariant(banditArms);
  const chosenIndex = banditArms.findIndex(arm => arm.arm.variant === chosenArm.variant);
  const chosenVariant = chosenIndex >= 0 ? availableVariants[chosenIndex] : undefined;

  if (!chosenVariant) {
    throw new Error('Could not find chosen variant');
  }

  // Calculate confidence based on bandit state
  const chosenBanditArm = banditArms.find(arm => arm.arm.variant === chosenArm.variant);
  const confidence = chosenBanditArm ?
    chosenBanditArm.alpha / (chosenBanditArm.alpha + chosenBanditArm.beta) : 0.5;

  // Track the selection
  await trackEvent(storyId, persona, sectionKey, chosenArm.variant, 'variantSelected', {
    confidence,
    alpha: chosenBanditArm?.alpha,
    beta: chosenBanditArm?.beta
  });

  return {
    sectionKey,
    variantHash: chosenArm.variant,
    section: chosenVariant,
    confidence,
    isNew: chosenBanditArm?.alpha === 1 && chosenBanditArm?.beta === 1
  };
}

// Deploy new variant and update bandit state
export async function deployVariant(
  storyId: string,
  persona: WaterBottlePersona,
  sectionKey: string,
  section: Section
): Promise<string> {
  const variantHash = await generateVariantHash(section);

  // Ensure bandit state exists
  await ensureBanditState(storyId, sectionKey, variantHash);

  // Track deployment
  await trackEvent(storyId, persona, sectionKey, variantHash, 'variantDeployed', {
    section: section
  });

  return variantHash;
}

// Record reward for conversion event
export async function recordConversion(
  storyId: string,
  persona: WaterBottlePersona,
  sectionKey: string,
  variantHash: string,
  reward: number = 1
): Promise<void> {
  const banditState = await getBanditState(storyId, sectionKey, variantHash);

  if (!banditState) {
    // Initialize if doesn't exist
    const newState = initializeBanditArm(storyId, sectionKey, variantHash);
    await saveBanditState(updateBanditState(newState, reward));
  } else {
    const updatedState = updateBanditState(banditState, reward);
    await saveBanditState(updatedState);
  }

  // Track the conversion
  await trackEvent(storyId, persona, sectionKey, variantHash, 'conversion', {
    reward
  });
}

// Process timeout events to record no-conversion (all sections for the story)
export async function processTimeouts(storyId: string, timeoutMinutes: number = 5): Promise<void> {
  const allStates = await getBanditStatesForStory(storyId);

  for (const state of allStates) {
    const conversions = await getConversionEvents(
      storyId,
      state.sectionKey,
      state.variantHash,
      timeoutMinutes
    );

    if (conversions === 0) {
      const updatedState = updateBanditState(state, 0);
      await saveBanditState(updatedState);
    }
  }
}

// Get performance metrics for a section
export async function getSectionPerformance(
  storyId: string,
  sectionKey: string
): Promise<{
  variants: Array<{
    variantHash: string;
    alpha: number;
    beta: number;
    conversionRate: number;
    confidence: [number, number];
    trials: number;
  }>;
  bestVariant: string;
  totalTrials: number;
}> {
  const banditStates = await getAllBanditStates(storyId, sectionKey);

  const variants = banditStates.map(state => {
    const conversionRate = state.alpha / (state.alpha + state.beta);
    const trials = state.alpha + state.beta - 2;

    // Simple confidence interval calculation
    const variance = (state.alpha * state.beta) /
      ((state.alpha + state.beta) ** 2 * (state.alpha + state.beta + 1));
    const stdError = Math.sqrt(variance);
    const margin = 1.96 * stdError; // 95% confidence

    return {
      variantHash: state.variantHash,
      alpha: state.alpha,
      beta: state.beta,
      conversionRate,
      confidence: [
        Math.max(0, conversionRate - margin),
        Math.min(1, conversionRate + margin)
      ] as [number, number],
      trials
    };
  });

  // Find best performing variant
  const bestVariant = variants.reduce((best, current) =>
    current.conversionRate > best.conversionRate ? current : best,
    variants[0]
  );

  const totalTrials = variants.reduce((sum, v) => sum + v.trials, 0);

  return {
    variants,
    bestVariant: bestVariant?.variantHash || '',
    totalTrials
  };
}

// Ensure bandit state exists for a variant
async function ensureBanditState(
  storyId: string,
  sectionKey: string,
  variantHash: string
): Promise<BanditState> {
  let state = await getBanditState(storyId, sectionKey, variantHash);

  if (!state) {
    state = initializeBanditArm(storyId, sectionKey, variantHash);
    await saveBanditState(state);
  }

  return state;
}

// Reset bandit for a section (useful for testing)
export async function resetSectionBandit(
  storyId: string,
  sectionKey: string
): Promise<void> {
  const states = await getAllBanditStates(storyId, sectionKey);

  for (const state of states) {
    const resetState = {
      ...state,
      alpha: 1,
      beta: 1
    };
    await saveBanditState(resetState);
  }

  await trackEvent(storyId, 'commuter', sectionKey, '', 'banditReset', {});
}
