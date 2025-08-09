import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseSection, generateVariantHash } from '@/lib/storyboard';
import { getStory, getLatestStoryboard, saveStoryboard, trackEvent } from '@/lib/database';
import { generateSection, optimizeSection } from '@/lib/agents/section';
import { validateBrandAlignment } from '@/lib/agents/brand';
import { deployVariant } from '@/lib/agents/strategist';
import { classifyPersona, extractPersonaContext } from '@/lib/agents/persona';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Request schema
const RewriteRequestSchema = z.object({
  storyId: z.string().uuid(),
  sectionKey: z.enum(['hero', 'problem', 'solution', 'proof', 'pricing', 'faq']),
  goal: z.string().optional().default('conversion'),
  optimize: z.boolean().optional().default(false)
});

// Rate limiting function
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  const current = rateLimitStore.get(ip);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const { storyId, sectionKey, goal, optimize } = RewriteRequestSchema.parse(body);

    // Get story and current storyboard
    const story = await getStory(storyId);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Detect persona
    const personaContext = extractPersonaContext(request);
    const personaResult = await classifyPersona(personaContext);

    // Get latest storyboard for this persona
    let storyboard = await getLatestStoryboard(storyId, personaResult.label);
    if (!storyboard) {
      // Fallback to default persona
      storyboard = await getLatestStoryboard(storyId, 'commuter');
      if (!storyboard) {
        return NextResponse.json(
          { error: 'No storyboard found for story' },
          { status: 404 }
        );
      }
    }

    // Find existing section
    const existingSection = storyboard.json.sections.find(s => s.key === sectionKey);
    if (!existingSection) {
      return NextResponse.json(
        { error: `Section ${sectionKey} not found` },
        { status: 404 }
      );
    }

    // Prepare context for section generation
    const sectionContext = {
      storyId,
      persona: personaResult.label,
      brief: story.brief,
      brand: storyboard.json.brand,
      existingSection,
      goal
    };

    // Generate new section
    let newSection;
    if (optimize) {
      newSection = await optimizeSection(sectionKey, sectionContext, goal);
    } else {
      newSection = await generateSection(sectionKey, sectionContext);
    }

    // Validate brand alignment
    const brandValidation = await validateBrandAlignment(newSection, storyboard.json.brand);

    // Use corrected section if brand validation failed but can be fixed
    if (!brandValidation.isValid && brandValidation.correctedSection) {
      newSection = brandValidation.correctedSection;
    } else if (!brandValidation.isValid && brandValidation.score < 0.5) {
      return NextResponse.json({
        error: 'Generated content does not meet brand guidelines',
        issues: brandValidation.issues,
        suggestions: brandValidation.suggestions
      }, { status: 400 });
    }

    // Generate variant hash
    const variantHash = await generateVariantHash(newSection);

    // Deploy variant (update bandit state)
    await deployVariant(storyId, personaResult.label, sectionKey, newSection);

    // Create new storyboard with updated section
    const updatedStoryboard = {
      ...storyboard.json,
      sections: storyboard.json.sections.map(s =>
        s.key === sectionKey ? newSection : s
      )
    };

    // Save new storyboard version
    await saveStoryboard(storyId, personaResult.label, variantHash, updatedStoryboard);

    // Track the rewrite event
    await trackEvent(storyId, personaResult.label, sectionKey, variantHash, 'sectionRewrite', {
      goal,
      optimize,
      brandScore: brandValidation.score
    });

    return NextResponse.json({
      success: true,
      section: newSection,
      variantHash,
      brandValidation: {
        score: brandValidation.score,
        issues: brandValidation.issues,
        suggestions: brandValidation.suggestions
      },
      persona: {
        detected: personaResult.label,
        confidence: personaResult.confidence
      }
    });

  } catch (error) {
    console.error('Error rewriting section:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('LLM API error')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method to get section performance data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('storyId');
  const sectionKey = searchParams.get('sectionKey');

  if (!storyId || !sectionKey) {
    return NextResponse.json(
      { error: 'Story ID and section key required' },
      { status: 400 }
    );
  }

  try {
    // Import here to avoid circular dependency
    const { getSectionPerformance } = await import('@/lib/agents/strategist');

    const performance = await getSectionPerformance(storyId, sectionKey);

    return NextResponse.json({
      sectionKey,
      performance
    });

  } catch (error) {
    console.error('Error getting section performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
