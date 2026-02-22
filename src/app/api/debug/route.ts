import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openaiCheckConnection } from '@/lib/server/openai';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  const results: Record<string, unknown> = {};

  try {
    // 1. Test environment variables (never expose key or key prefix)
    results.env = {
      openai: !!process.env.OPENAI_API_KEY,
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_ANON_KEY,
    };

    // 2. Test Supabase connection
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('stories')
        .select('count', { count: 'exact', head: true });

      if (error) {
        results.database = { status: 'error', message: error.message };
      } else {
        results.database = { status: 'success', message: 'Connected to stories table' };
      }
    } catch (dbError: unknown) {
      results.database = { status: 'error', message: dbError instanceof Error ? dbError.message : String(dbError) };
    }

    // 3. Test OpenAI connection (via shared helper; no key in this file)
    try {
      const openaiResult = await openaiCheckConnection();
      results.openai = openaiResult.ok
        ? { status: 'success', message: openaiResult.message }
        : { status: 'error', message: openaiResult.message };
    } catch (openaiError: unknown) {
      results.openai = { status: 'error', message: openaiError instanceof Error ? openaiError.message : String(openaiError) };
    }

    // 4. Test persona agent
    try {
      const { extractPersonaContext, classifyPersona } = await import('@/lib/server/agents/persona');
      const mockRequest = new Request('http://localhost:3000');
      const personaContext = extractPersonaContext(mockRequest);
      const personaResult = await classifyPersona(personaContext);

      results.persona = {
        status: 'success',
        detected: personaResult.label,
        confidence: personaResult.confidence
      };
    } catch (personaError: unknown) {
      results.persona = { status: 'error', message: personaError instanceof Error ? personaError.message : String(personaError) };
    }

    return NextResponse.json({
      status: 'debug_complete',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    const payload: Record<string, unknown> = {
      status: 'debug_failed',
      error: error instanceof Error ? error.message : String(error),
    };
    if ((process.env.NODE_ENV as string) !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
