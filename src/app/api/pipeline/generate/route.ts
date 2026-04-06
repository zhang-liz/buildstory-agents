import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStory, getLatestStoryboard, saveStoryboard, getAllBanditStates } from '@/lib/server/database';
import { generateVariants } from '@/lib/server/agents/section';
import { validateBrandAlignment } from '@/lib/server/agents/brand';
import { deployVariant, processTimeouts, getSectionPerformance } from '@/lib/server/agents/strategist';
import { logger } from '@/lib/server/logger';

const SECTION_KEYS = ['hero', 'problem', 'solution', 'proof', 'pricing', 'faq'] as const;
const TARGET_VARIANTS_PER_SECTION = 12;
const PRUNE_THRESHOLD = 0.15;
const PRUNE_MIN_TRIALS = 20;
const PROMOTE_CONFIDENCE_GAP = 0.1;
const PROMOTE_MIN_TRIALS = 50;

const PipelineRequestSchema = z.object({
  storyId: z.string().uuid(),
  persona: z.string().min(1).optional().default('commuter'),
  targetVariants: z.number().int().positive().optional().default(TARGET_VARIANTS_PER_SECTION),
  runTimeouts: z.boolean().optional().default(true),
  runPrune: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const pipelineLog = logger.child({ pipeline: 'generate' });

  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storyId, persona, targetVariants, runTimeouts, runPrune } =
      PipelineRequestSchema.parse(body);

    pipelineLog.info('Pipeline started', { storyId, persona, targetVariants });

    const story = await getStory(storyId);
    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const storyboard = await getLatestStoryboard(storyId, persona);
    if (!storyboard) {
      return NextResponse.json({ error: 'No storyboard found' }, { status: 404 });
    }

    // 1. Process timeouts to penalize non-converting variants
    if (runTimeouts) {
      pipelineLog.info('Processing timeouts', { storyId });
      await processTimeouts(storyId, 5);
    }

    // 2. Generate missing variants per section
    const generationResults: Record<
      string,
      { existing: number; generated: number; deployed: number }
    > = {};

    for (const sectionKey of SECTION_KEYS) {
      const existingStates = await getAllBanditStates(storyId, sectionKey);
      const existingCount = existingStates.length;

      if (existingCount >= targetVariants) {
        generationResults[sectionKey] = {
          existing: existingCount,
          generated: 0,
          deployed: 0,
        };
        continue;
      }

      const needed = targetVariants - existingCount;
      const existingSection = storyboard.json.sections.find((s) => s.key === sectionKey);
      if (!existingSection) continue;

      pipelineLog.info('Generating variants', { sectionKey, needed, existingCount });

      const sectionContext = {
        storyId,
        persona,
        brief: story.brief,
        brand: storyboard.json.brand,
        existingSection,
        goal: `Create a distinct variant (${existingCount + 1} of ${targetVariants}) with a unique messaging angle`,
      };

      const newVariants = await generateVariants(sectionKey, sectionContext, needed);

      let deployed = 0;
      for (const variant of newVariants) {
        const brandCheck = await validateBrandAlignment(variant, storyboard.json.brand);
        const finalVariant =
          !brandCheck.isValid && brandCheck.correctedSection
            ? brandCheck.correctedSection
            : brandCheck.isValid
              ? variant
              : null;

        if (!finalVariant) continue;

        await deployVariant(storyId, persona, sectionKey, finalVariant);

        const updatedStoryboard = {
          ...storyboard.json,
          sections: storyboard.json.sections.map((s) =>
            s.key === sectionKey ? finalVariant : s
          ),
        };

        const { generateVariantHash } = await import('@/lib/storyboard');
        const hash = await generateVariantHash(finalVariant);
        await saveStoryboard(storyId, persona, hash, updatedStoryboard);
        deployed++;
      }

      generationResults[sectionKey] = {
        existing: existingCount,
        generated: newVariants.length,
        deployed,
      };
    }

    // 3. Prune underperforming variants
    const pruneResults: Record<string, { pruned: string[]; promoted: string | null }> = {};

    if (runPrune) {
      for (const sectionKey of SECTION_KEYS) {
        const performance = await getSectionPerformance(storyId, sectionKey);
        const pruned: string[] = [];
        let promoted: string | null = null;

        if (performance.variants.length < 2) {
          pruneResults[sectionKey] = { pruned, promoted };
          continue;
        }

        // Prune: freeze variants with low posterior mean after enough trials
        for (const v of performance.variants) {
          if (v.trials >= PRUNE_MIN_TRIALS && v.conversionRate < PRUNE_THRESHOLD) {
            // "Freeze" by setting beta very high so it's almost never sampled
            const { updateBanditState: saveBanditState } = await import(
              '@/lib/server/database'
            );
            await saveBanditState({
              storyId,
              sectionKey,
              variantHash: v.variantHash,
              alpha: v.alpha,
              beta: v.beta + 1000,
            });
            pruned.push(v.variantHash);
            pipelineLog.info('Pruned variant', {
              sectionKey,
              variantHash: v.variantHash.slice(0, 8),
              conversionRate: v.conversionRate,
            });
          }
        }

        // Promote: if best variant is well above rest with tight CI
        const bestVariant = performance.variants.find(
          (v) => v.variantHash === performance.bestVariant
        );
        if (bestVariant && bestVariant.trials >= PROMOTE_MIN_TRIALS) {
          const others = performance.variants.filter(
            (v) => v.variantHash !== performance.bestVariant && v.trials >= PRUNE_MIN_TRIALS
          );
          const allBelow = others.every(
            (v) => bestVariant.conversionRate - v.conversionRate > PROMOTE_CONFIDENCE_GAP
          );
          const ciWidth = bestVariant.confidence[1] - bestVariant.confidence[0];

          if (allBelow && ciWidth < 0.1) {
            promoted = bestVariant.variantHash;
            const { trackEvent } = await import('@/lib/server/database');
            await trackEvent(storyId, persona, sectionKey, promoted, 'variantPromoted', {
              conversionRate: bestVariant.conversionRate,
              trials: bestVariant.trials,
            });
            pipelineLog.info('Promoted variant', {
              sectionKey,
              variantHash: promoted.slice(0, 8),
              conversionRate: bestVariant.conversionRate,
            });
          }
        }

        pruneResults[sectionKey] = { pruned, promoted };
      }
    }

    pipelineLog.info('Pipeline completed', { storyId, generationResults, pruneResults });

    return NextResponse.json({
      success: true,
      storyId,
      persona,
      generation: generationResults,
      pruning: pruneResults,
    });
  } catch (error) {
    pipelineLog.error('Pipeline failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
