import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const results: any = {};

  try {
    // 1. Test environment variables
    results.env = {
      openai: !!process.env.OPENAI_API_KEY,
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_ANON_KEY,
      openai_key_prefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...'
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
    } catch (dbError: any) {
      results.database = { status: 'error', message: dbError.message };
    }

    // 3. Test OpenAI connection (simple)
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        }
      });

      if (openaiResponse.ok) {
        results.openai = { status: 'success', message: 'API key valid' };
      } else {
        const errorText = await openaiResponse.text();
        results.openai = { status: 'error', message: `HTTP ${openaiResponse.status}: ${errorText}` };
      }
    } catch (openaiError: any) {
      results.openai = { status: 'error', message: openaiError.message };
    }

    // 4. Test persona agent
    try {
      const { extractPersonaContext, classifyPersona } = await import('@/lib/agents/persona');
      const mockRequest = new Request('http://localhost:3000');
      const personaContext = extractPersonaContext(mockRequest);
      const personaResult = await classifyPersona(personaContext);

      results.persona = {
        status: 'success',
        detected: personaResult.label,
        confidence: personaResult.confidence
      };
    } catch (personaError: any) {
      results.persona = { status: 'error', message: personaError.message };
    }

    return NextResponse.json({
      status: 'debug_complete',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'debug_failed',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
