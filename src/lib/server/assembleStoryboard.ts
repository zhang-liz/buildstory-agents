import 'server-only';
import { chooseOptimalVariant } from './agents/strategist';
import { getAllStoryboardsForPersona } from './database';
import { Storyboard, Section, SectionVariantHashes, generateVariantHash } from '@/lib/storyboard';
import { WaterBottlePersona } from '@/lib/personas';

/**
 * Collect unique section variants for a section key from all storyboard versions.
 * Dedupes by variant hash so the bandit sees one entry per distinct variant.
 * Hashes all candidate sections in parallel.
 */
async function getSectionVariants(
  sectionKey: string,
  allStoryboards: { json: Storyboard }[],
  baseSection: Section
): Promise<Section[]> {
  const sectionsToHash: Section[] = [baseSection];
  for (const record of allStoryboards) {
    const section = record.json.sections.find((s) => s.key === sectionKey);
    if (section) sectionsToHash.push(section);
  }

  const hashes = await Promise.all(
    sectionsToHash.map((s) => generateVariantHash(s))
  );

  const seen = new Set<string>();
  const variants: Section[] = [];
  for (let i = 0; i < sectionsToHash.length; i++) {
    const hash = hashes[i];
    if (seen.has(hash)) continue;
    seen.add(hash);
    variants.push(sectionsToHash[i]);
  }

  return variants;
}

/**
 * Assembles a storyboard by running the strategist (Thompson sampling) per section.
 * Uses all saved storyboard versions to get multiple variants per section when available.
 * Sections are processed in parallel for lower latency.
 * Returns the final storyboard plus section -> variant hash for client tracking.
 */
export async function assembleStoryboard(
  storyId: string,
  persona: WaterBottlePersona,
  baseStoryboard: Storyboard
): Promise<{ storyboard: Storyboard; sectionVariantHashes: SectionVariantHashes }> {
  const allStoryboards = await getAllStoryboardsForPersona(storyId, persona);

  const results = await Promise.all(
    baseStoryboard.sections.map(async (section) => {
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

        return {
          key: section.key,
          section: chosenVariant.section,
          variantHash: chosenVariant.variantHash
        };
      } catch (error) {
        console.error(`Error assembling section ${section.key}:`, error);
        return { key: section.key, section, variantHash: '' };
      }
    })
  );

  const assembledSections = results.map((r) => r.section);
  const sectionVariantHashes: SectionVariantHashes = {};
  for (const r of results) {
    if (r.variantHash) sectionVariantHashes[r.key] = r.variantHash;
  }

  const storyboard: Storyboard = {
    ...baseStoryboard,
    persona,
    sections: assembledSections
  };

  return { storyboard, sectionVariantHashes };
}
