import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE endpoint that pushes event aggregates every few seconds.
 * Usage: GET /api/analytics/stream?storyId=<uuid>
 */
export async function GET(request: NextRequest) {
  const storyId = request.nextUrl.searchParams.get('storyId');

  if (!storyId) {
    return new Response(JSON.stringify({ error: 'storyId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const poll = async () => {
        if (closed) return;

        try {
          const { getRecentEvents } = await import('@/lib/server/database');
          const { analyzeConversionFunnel } = await import('@/lib/server/agents/data');

          const events = await getRecentEvents(storyId, 5);
          const funnel = analyzeConversionFunnel(events);

          const uniquePersonas = [...new Set(events.map((e) => e.persona))];
          const eventTypes = events.reduce(
            (acc, e) => {
              acc[e.event] = (acc[e.event] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          const sectionEvents = events.reduce(
            (acc, e) => {
              if (e.section_key) {
                acc[e.section_key] = (acc[e.section_key] || 0) + 1;
              }
              return acc;
            },
            {} as Record<string, number>
          );

          send({
            timestamp: new Date().toISOString(),
            storyId,
            totalEvents: events.length,
            uniquePersonas,
            eventTypes,
            sectionEvents,
            conversionFunnel: funnel,
          });
        } catch (error) {
          send({ error: 'Failed to fetch analytics', timestamp: new Date().toISOString() });
        }
      };

      // Initial push
      await poll();

      // Poll every 3 seconds
      const interval = setInterval(poll, 3000);

      // Respect client disconnection
      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
