import 'server-only';
import { Section, generateVariantHash } from '@/lib/storyboard';
import {
  StrategistContextSchema,
  VariantChoiceSchema,
  DeployVariantInputSchema,
  RecordConversionInputSchema,
} from './contracts';
import type { StrategistContext, VariantChoice } from './contracts';
import {
  chooseVariant,
  initializeBanditArm,
  updateBanditState,
  BanditArm,
  BanditState,
} from '../bandit';
import {
  getBanditState,
  updateBanditState as saveBanditState,
  getAllBanditStates,
  getBanditStatesForStory,
  getConversionEvents,
  trackEvent,
} from '../database';
import { withMetrics } from '../metrics';

export type { StrategistContext, VariantChoice };

async function _chooseOptimalVariant(context: StrategistContext): Promise<VariantChoice> {
  const { storyId, persona, sectionKey, availableVariants } = context;

  if (availableVariants.length === 0) {
    throw new Error(`No variants available for section ${sectionKey}`);
  }

  if (availableVariants.length === 1) {
    const variant = availableVariants[0];
    const variantHash = await generateVariantHash(variant);
    await ensureBanditState(storyId, sectionKey, variantHash);

    return {
      sectionKey,
      variantHash,
      section: variant,
      confidence: 1.0,
      isNew: false,
    };
  }

  const variantHashes = await Promise.all(availableVariants.map((v) => generateVariantHash(v)));

  const banditStates = await Promise.all(
    variantHashes.map((variantHash) => getBanditState(storyId, sectionKey, variantHash))
  );

  const resolvedStates = await Promise.all(
    banditStates.map(async (banditState, i) => {
      const variantHash = variantHashes[i];
      let state = banditState;
      if (!state) {
        state = initializeBanditArm(storyId, sectionKey, variantHash);
        await saveBanditState(state);
      }
      return { variantHash, state };
    })
  );

  const banditArms: BanditArm[] = resolvedStates.map(({ variantHash, state }) => ({
    arm: { storyId, section: sectionKey, variant: variantHash },
    alpha: state.alpha,
    beta: state.beta,
  }));

  const chosenArm = await chooseVariant(banditArms);
  const chosenIndex = banditArms.findIndex((arm) => arm.arm.variant === chosenArm.variant);
  const chosenVariant = chosenIndex >= 0 ? availableVariants[chosenIndex] : undefined;

  if (!chosenVariant) {
    throw new Error('Could not find chosen variant');
  }

  const chosenBanditArm = banditArms.find((arm) => arm.arm.variant === chosenArm.variant);
  const confidence = chosenBanditArm
    ? chosenBanditArm.alpha / (chosenBanditArm.alpha + chosenBanditArm.beta)
    : 0.5;

  await trackEvent(storyId, persona, sectionKey, chosenArm.variant, 'variantSelected', {
    confidence,
    alpha: chosenBanditArm?.alpha,
    beta: chosenBanditArm?.beta,
  });

  return {
    sectionKey,
    variantHash: chosenArm.variant,
    section: chosenVariant,
    confidence,
    isNew: chosenBanditArm?.alpha === 1 && chosenBanditArm?.beta === 1,
  };
}

export async function chooseOptimalVariant(context: StrategistContext): Promise<VariantChoice> {
  const validated = StrategistContextSchema.parse(context);
  const result = await withMetrics('strategist', 'chooseVariant', () =>
    _chooseOptimalVariant(validated)
  );
  return VariantChoiceSchema.parse(result);
}

export async function deployVariant(
  storyId: string,
  persona: string,
  sectionKey: string,
  section: Section
): Promise<string> {
  DeployVariantInputSchema.parse({ storyId, persona, sectionKey, section });

  return withMetrics('strategist', 'deployVariant', async () => {
    const variantHash = await generateVariantHash(section);
    await ensureBanditState(storyId, sectionKey, variantHash);
    await trackEvent(storyId, persona, sectionKey, variantHash, 'variantDeployed', { section });
    return variantHash;
  });
}

export async function recordConversion(
  storyId: string,
  persona: string,
  sectionKey: string,
  variantHash: string,
  reward: number = 1
): Promise<void> {
  RecordConversionInputSchema.parse({ storyId, persona, sectionKey, variantHash, reward });

  return withMetrics('strategist', 'recordConversion', async () => {
    const banditState = await getBanditState(storyId, sectionKey, variantHash);

    if (!banditState) {
      const newState = initializeBanditArm(storyId, sectionKey, variantHash);
      await saveBanditState(updateBanditState(newState, reward));
    } else {
      const updatedState = updateBanditState(banditState, reward);
      await saveBanditState(updatedState);
    }

    await trackEvent(storyId, persona, sectionKey, variantHash, 'conversion', { reward });
  });
}

export async function processTimeouts(
  storyId: string,
  timeoutMinutes: number = 5
): Promise<void> {
  return withMetrics('strategist', 'processTimeouts', async () => {
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
  });
}

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
  return withMetrics('strategist', 'getSectionPerformance', async () => {
    const banditStates = await getAllBanditStates(storyId, sectionKey);

    const variants = banditStates.map((state) => {
      const conversionRate = state.alpha / (state.alpha + state.beta);
      const trials = state.alpha + state.beta - 2;

      const variance =
        (state.alpha * state.beta) /
        ((state.alpha + state.beta) ** 2 * (state.alpha + state.beta + 1));
      const stdError = Math.sqrt(variance);
      const margin = 1.96 * stdError;

      return {
        variantHash: state.variantHash,
        alpha: state.alpha,
        beta: state.beta,
        conversionRate,
        confidence: [Math.max(0, conversionRate - margin), Math.min(1, conversionRate + margin)] as [
          number,
          number,
        ],
        trials,
      };
    });

    const bestVariant = variants.reduce(
      (best, current) => (current.conversionRate > best.conversionRate ? current : best),
      variants[0]
    );

    const totalTrials = variants.reduce((sum, v) => sum + v.trials, 0);

    return {
      variants,
      bestVariant: bestVariant?.variantHash || '',
      totalTrials,
    };
  });
}

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

export async function resetSectionBandit(storyId: string, sectionKey: string): Promise<void> {
  const states = await getAllBanditStates(storyId, sectionKey);

  for (const state of states) {
    const resetState = { ...state, alpha: 1, beta: 1 };
    await saveBanditState(resetState);
  }

  await trackEvent(storyId, 'commuter', sectionKey, '', 'banditReset', {});
}
