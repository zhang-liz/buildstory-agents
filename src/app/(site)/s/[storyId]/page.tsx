import { notFound } from 'next/navigation';
import { getStory, getLatestStoryboard } from '@/lib/server/database';
import { extractPersonaContext } from '@/lib/server/agents/persona';
import { classifyPersonaDynamic } from '@/lib/server/personaEngine';
import { assembleStoryboard } from '@/lib/server/assembleStoryboard';
import { StoryboardRenderer } from './StoryboardRenderer';
import { headers } from 'next/headers';

interface PageProps {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ persona?: string }>;
}

export default async function StoryPage({ params, searchParams }: PageProps) {
  const [{ storyId }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const [story, personaResult] = await Promise.all([
    getStory(storyId),
    (async () => {
      const headersList = await headers();
      const headersObject: Record<string, string> = {};
      for (const [key, value] of headersList.entries()) {
        headersObject[key] = value;
      }
      const mockRequest = new Request('http://localhost', { headers: headersObject });
      const personaContext = extractPersonaContext(mockRequest);
      if (resolvedSearchParams.persona) {
        personaContext.pollResult = resolvedSearchParams.persona;
      }
      const vertical = undefined; // Resolved from story below if needed
      return classifyPersonaDynamic(personaContext, vertical);
    })(),
  ]);

  if (!story) {
    notFound();
  }

  let storyboard = await getLatestStoryboard(storyId, personaResult.label);

  if (!storyboard) {
    const fallbackPersonas = ['commuter', 'athlete', 'outdoor', 'family'];
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
