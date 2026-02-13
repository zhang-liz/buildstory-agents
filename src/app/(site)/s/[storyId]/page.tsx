import { notFound } from 'next/navigation';
import { getStory, getLatestStoryboard } from '@/lib/server/database';
import { classifyPersona, extractPersonaContext } from '@/lib/server/agents/persona';
import { assembleStoryboard } from '@/lib/server/assembleStoryboard';
import { StoryboardRenderer } from './StoryboardRenderer';
import { WaterBottlePersona } from '@/lib/personas';
import { headers } from 'next/headers';

interface PageProps {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ persona?: string }>;
}

export default async function StoryPage({ params, searchParams }: PageProps) {
  const [{ storyId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  // Get story
  const story = await getStory(storyId);
  if (!story) {
    notFound();
  }

  // Extract persona context from request headers
  const headersList = await headers();
  const headersObject: Record<string, string> = {};
  for (const [key, value] of headersList.entries()) {
    headersObject[key] = value;
  }
  const mockRequest = new Request("http://localhost", {
    headers: headersObject,
  });
  const personaContext = extractPersonaContext(mockRequest);

  // Override persona if specified in search params
  if (
    resolvedSearchParams.persona &&
    ["athlete", "commuter", "outdoor", "family"].includes(
      resolvedSearchParams.persona
    )
  ) {
    personaContext.pollResult =
      resolvedSearchParams.persona as WaterBottlePersona;
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

  // Assemble final storyboard with agent decisions and variant hashes for tracking
  const { storyboard: finalStoryboard, sectionVariantHashes } = await assembleStoryboard(
    storyId,
    personaResult.label,
    storyboard.json
  );

  return (
    <StoryboardRenderer
      storyboard={finalStoryboard}
      storyId={storyId}
      sectionVariantHashes={sectionVariantHashes}
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
  const { storyId } = await params;
  const story = await getStory(storyId);

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
