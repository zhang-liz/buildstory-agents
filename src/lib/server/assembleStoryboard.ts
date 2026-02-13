import 'server-only';
import { chooseOptimalVariant } from './agents/strategist';
import { Storyboard } from '@/lib/storyboard';
import { WaterBottlePersona } from '@/lib/personas';
import type { SectionVariantHashes } from '@/lib/storyboard';

/**
 * Assembles a storyboard by running the strategist (Thompson sampling) per section
 * and returns the final storyboard plus section -> variant hash for client tracking.
 */
export async function assembleStoryboard(
  storyId: string,
  persona: WaterBottlePersona,
  baseStoryboard: Storyboard
): Promise<{ storyboard: Storyboard; sectionVariantHashes: SectionVariantHashes }> {
  const assembledSections = [];
  const sectionVariantHashes: SectionVariantHashes = {};

  for (const section of baseStoryboard.sections) {
    try {
      const availableVariants = [section];
      const chosenVariant = await chooseOptimalVariant({
        storyId,
        persona,
        sectionKey: section.key,
        availableVariants
      });

      assembledSections.push(chosenVariant.section);
      sectionVariantHashes[section.key] = chosenVariant.variantHash;
    } catch (error) {
      console.error(`Error assembling section ${section.key}:`, error);
      assembledSections.push(section);
    }
  }

  const storyboard: Storyboard = {
    ...baseStoryboard,
    persona,
    sections: assembledSections
  };

  return { storyboard, sectionVariantHashes };
}
