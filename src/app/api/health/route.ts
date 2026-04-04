import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; message?: string }> = {};

  // Supabase check
  const supaStart = Date.now();
  try {
    const { supabase } = await import('@/lib/server/database');
    const { error } = await supabase.from('stories').select('id').limit(1);
    checks.supabase = {
      ok: !error,
      latencyMs: Date.now() - supaStart,
      ...(error && { message: error.message }),
    };
  } catch (e) {
    checks.supabase = {
      ok: false,
      latencyMs: Date.now() - supaStart,
      message: e instanceof Error ? e.message : String(e),
    };
  }

  // OpenAI check
  const oaiStart = Date.now();
  try {
    const { openaiCheckConnection } = await import('@/lib/server/openai');
    const result = await openaiCheckConnection();
    checks.openai = { ok: result.ok, latencyMs: Date.now() - oaiStart, message: result.message };
  } catch (e) {
    checks.openai = {
      ok: false,
      latencyMs: Date.now() - oaiStart,
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: process.uptime(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
