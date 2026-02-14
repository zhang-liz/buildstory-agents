import 'server-only';
import { chooseOptimalVariant } from './agents/strategist';
import { getAllStoryboardsForPersona } from './database';
import { Storyboard, Section, SectionVariantHashes, generateVariantHash } from '@/lib/storyboard';
import { WaterBottlePersona } from '@/lib/personas';

/**
 * Collect unique section variants for a section key from all storyboard versions.
 * Dedupes by variant hash so the bandit sees one entry per distinct variant.
 */
async function getSectionVariants(
  sectionKey: string,
  allStoryboards: { json: Storyboard }[],
  baseSection: Section
): Promise<Section[]> {
  const seen = new Set<string>();
  const variants: Section[] = [baseSection];

  const baseHash = await generateVariantHash(baseSection);
  seen.add(baseHash);

  for (const record of allStoryboards) {
    const section = record.json.sections.find(s => s.key === sectionKey);
    if (!section) continue;

    const hash = await generateVariantHash(section);
    if (seen.has(hash)) continue;
    seen.add(hash);
    variants.push(section);
  }

  return variants;
}

/**
 * Assembles a storyboard by running the strategist (Thompson sampling) per section.
 * Uses all saved storyboard versions to get multiple variants per section when available.
 * Returns the final storyboard plus section -> variant hash for client tracking.
 */
export async function assembleStoryboard(
  storyId: string,
  persona: WaterBottlePersona,
  baseStoryboard: Storyboard
): Promise<{ storyboard: Storyboard; sectionVariantHashes: SectionVariantHashes }> {
  const assembledSections = [];
  const sectionVariantHashes: SectionVariantHashes = {};

  const allStoryboards = await getAllStoryboardsForPersona(storyId, persona);

  for (const section of baseStoryboard.sections) {
    try {
      const availableVariants = await getSectionVariants(
        section.key,
        allStoryboards,
        section
      );

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
