import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { trackEvent } from '@/lib/server/database';
import { recordConversion } from '@/lib/server/agents/strategist';
import { classifyPersona, extractPersonaContext, validatePersonaPoll } from '@/lib/server/agents/persona';
import { WaterBottlePersona } from '@/lib/personas';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Event schema
const EventSchema = z.object({
  storyId: z.string().uuid(),
  sectionKey: z.string(),
  variantHash: z.string().optional(),
  event: z.enum([
    'view', 'dwell', 'hover', 'scrollDepth', 'ctaClick',
    'pollPersona', 'bounce', 'conversion', 'engagement'
  ]),
  meta: z.record(z.string(), z.any()).optional().default({})
});

// Batch events schema
const BatchEventsSchema = z.object({
  events: z.array(EventSchema).max(10) // Limit batch size
});

// Rate limiting function
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // More generous for tracking

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

// Process individual event
async function processEvent(
  event: z.infer<typeof EventSchema>,
  persona: string,
  request: NextRequest
) {
  const { storyId, sectionKey, variantHash, event: eventType, meta } = event;

  // Handle persona poll events
  if (eventType === 'pollPersona' && meta.selectedPersona) {
    const validPersona = validatePersonaPoll(String(meta.selectedPersona));
    if (validPersona) {
      // Update persona for session (in real app, use cookies/session)
      await trackEvent(storyId, validPersona, sectionKey, variantHash || '', eventType, {
        ...meta,
        previousPersona: persona
      });
      return { personaUpdate: validPersona };
    }
  }

  // Handle conversion events
  if (eventType === 'ctaClick' || eventType === 'conversion') {
    if (variantHash) {
      // Record conversion for bandit
      await recordConversion(storyId, persona as WaterBottlePersona, sectionKey, variantHash, 1);
    }
  }

  // Track all events
  await trackEvent(storyId, persona as WaterBottlePersona, sectionKey, variantHash || '', eventType, meta);

  return { success: true };
}

// Single event tracking
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Check if it's a batch request
    if (body.events && Array.isArray(body.events)) {
      const { events } = BatchEventsSchema.parse(body);

      // Detect persona once for the batch
      const personaContext = extractPersonaContext(request);
      const personaResult = await classifyPersona(personaContext);

      const results = [];

      for (const event of events) {
        try {
          const result = await processEvent(event, personaResult.label, request);
          results.push({ ...result, eventId: event.event });
        } catch (error) {
          console.error('Error processing event:', error);
          results.push({ error: 'Failed to process event', eventId: event.event });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        processed: results.length
      });
    } else {
      // Single event
      const event = EventSchema.parse(body);

      // Detect persona
      const personaContext = extractPersonaContext(request);
      const personaResult = await classifyPersona(personaContext);

      const result = await processEvent(event, personaResult.label, request);

      return NextResponse.json({
        success: true,
        ...result,
        persona: {
          detected: personaResult.label,
          confidence: personaResult.confidence
        }
      });
    }

  } catch (error) {
    console.error('Error tracking event:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get event analytics
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('storyId');
  const minutesBack = parseInt(searchParams.get('minutesBack') || '60');

  if (!storyId) {
    return NextResponse.json(
      { error: 'Story ID required' },
      { status: 400 }
    );
  }

  try {
    // Import here to avoid circular dependency
    const { getRecentEvents } = await import('@/lib/server/database');
    const { analyzeConversionFunnel } = await import('@/lib/server/agents/data');

    const events = await getRecentEvents(storyId, minutesBack);
    const funnel = analyzeConversionFunnel(events);

    // Basic analytics
    const analytics = {
      totalEvents: events.length,
      uniquePersonas: [...new Set(events.map(e => e.persona))],
      eventTypes: events.reduce((acc, e) => {
        acc[e.event] = (acc[e.event] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      conversionFunnel: funnel,
      timeframe: `Last ${minutesBack} minutes`
    };

    return NextResponse.json({
      storyId,
      analytics,
      events: events.slice(0, 50) // Limit recent events
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Beacon tracking (for navigator.sendBeacon)
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      // For beacon, fail silently
      return new Response('', { status: 204 });
    }

    const body = await request.json();
    const event = EventSchema.parse(body);

    // Detect persona
    const personaContext = extractPersonaContext(request);
    const personaResult = await classifyPersona(personaContext);

    await processEvent(event, personaResult.label, request);

    // Beacon requests expect no content response
    return new Response('', { status: 204 });

  } catch (error) {
    console.error('Error tracking beacon event:', error);
    // Beacon requests should fail silently
    return new Response('', { status: 204 });
  }
}
