import { notFound } from 'next/navigation';
import { getStory, getLatestStoryboard } from '@/lib/database';
import { classifyPersona, extractPersonaContext } from '@/lib/agents/persona';
import { chooseOptimalVariant } from '@/lib/agents/strategist';
import { generateSection } from '@/lib/agents/section';
import { StoryboardRenderer } from './StoryboardRenderer';
import { Storyboard } from '@/lib/storyboard';
import { WaterBottlePersona } from '@/lib/personas';
import { headers } from 'next/headers';

interface PageProps {
  params: { storyId: string };
  searchParams: { persona?: string };
}

// Assemble storyboard with agent decisions
async function assembleStoryboard(
  storyId: string,
  persona: WaterBottlePersona,
  baseStoryboard: Storyboard
): Promise<Storyboard> {
  const assembledSections = [];

  for (const section of baseStoryboard.sections) {
    try {
      // Get available variants for this section (for now, just use the existing one)
      const availableVariants = [section];

      // Let strategist choose optimal variant
      const chosenVariant = await chooseOptimalVariant({
        storyId,
        persona,
        sectionKey: section.key,
        availableVariants
      });

      assembledSections.push(chosenVariant.section);
    } catch (error) {
      console.error(`Error assembling section ${section.key}:`, error);
      // Fallback to original section
      assembledSections.push(section);
    }
  }

  return {
    ...baseStoryboard,
    persona,
    sections: assembledSections
  };
}

export default async function StoryPage({ params, searchParams }: PageProps) {
  const { storyId } = params;

  // Get story
  const story = await getStory(storyId);
  if (!story) {
    notFound();
  }

  // Extract persona context from request headers
  const headersList = await headers();
  const headersObject: Record<string, string> = {};

  // Convert headers to plain object
  for (const [key, value] of headersList.entries()) {
    headersObject[key] = value;
  }

  const mockRequest = new Request('http://localhost', {
    headers: headersObject
  });

  const personaContext = extractPersonaContext(mockRequest);

  // Override persona if specified in search params
  if (searchParams.persona && ['athlete', 'commuter', 'outdoor', 'family'].includes(searchParams.persona)) {
    personaContext.pollResult = searchParams.persona as WaterBottlePersona;
  }

  const personaResult = await classifyPersona(personaContext);

  // Get latest storyboard for this persona
  let storyboard = await getLatestStoryboard(storyId, personaResult.label);

  if (!storyboard) {
    // Fallback to any available storyboard
    const fallbackPersonas: WaterBottlePersona[] = ['commuter', 'athlete', 'outdoor', 'family'];
    for (const fallbackPersona of fallbackPersonas) {
      storyboard = await getLatestStoryboard(storyId, fallbackPersona);
      if (storyboard) break;
    }
  }

  if (!storyboard) {
    notFound();
  }

  // Assemble final storyboard with agent decisions
  const finalStoryboard = await assembleStoryboard(
    storyId,
    personaResult.label,
    storyboard.json
  );

  return (
    <StoryboardRenderer
      storyboard={finalStoryboard}
      storyId={storyId}
      persona={{
        detected: personaResult.label,
        confidence: personaResult.confidence,
        reasoning: personaResult.reasoning
      }}
    />
  );
}

// Enable ISR with revalidation
export const revalidate = 60; // Revalidate every minute

// Generate metadata
export async function generateMetadata({ params }: PageProps) {
  const story = await getStory(params.storyId);

  if (!story) {
    return {
      title: 'Story Not Found',
      description: 'The requested story could not be found.'
    };
  }

  return {
    title: `${story.brand?.name || 'Product'} - AI-Generated Landing Page`,
    description: story.brief,
    robots: 'noindex, nofollow' // Prevent indexing of generated pages
  };
}
