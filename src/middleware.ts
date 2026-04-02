import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware for fast persona detection. Reads UTM params, cookies, and
 * headers to set an x-persona header before the request reaches server
 * components. This avoids running the full classifier on every page load.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Skip non-page routes
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Check for existing persona cookie
  const personaCookie = request.cookies.get('bs_persona')?.value;
  if (personaCookie) {
    response.headers.set('x-persona', personaCookie);
    return response;
  }

  // Fast heuristic at the edge (no DB calls)
  const persona = detectPersonaFromRequest(request);
  response.headers.set('x-persona', persona);

  // Set cookie so subsequent requests skip detection
  response.cookies.set('bs_persona', persona, {
    maxAge: 30 * 60, // 30 minutes
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}

function detectPersonaFromRequest(request: NextRequest): string {
  const url = request.nextUrl;
  const ua = request.headers.get('user-agent') ?? '';
  const referer = request.headers.get('referer') ?? '';

  // Explicit persona param
  const explicitPersona = url.searchParams.get('persona');
  if (explicitPersona) return explicitPersona;

  // UTM-based detection
  const utmSource = url.searchParams.get('utm_source')?.toLowerCase() ?? '';
  const utmCampaign = url.searchParams.get('utm_campaign')?.toLowerCase() ?? '';
  const utmPersona = url.searchParams.get('utm_persona');
  if (utmPersona) return utmPersona;

  // Quick keyword scoring
  const signals: Record<string, number> = {};

  const keywordMap: Record<string, string[]> = {
    athlete: ['fitness', 'gym', 'strava', 'sport', 'training', 'runner'],
    commuter: ['linkedin', 'office', 'work', 'daily', 'productivity'],
    outdoor: ['outdoor', 'rei', 'trail', 'adventure', 'hiking', 'camping'],
    family: ['parent', 'mom', 'dad', 'family', 'kids'],
  };

  const combined = `${utmSource} ${utmCampaign} ${referer.toLowerCase()}`;

  for (const [persona, keywords] of Object.entries(keywordMap)) {
    signals[persona] = keywords.reduce((score, kw) => score + (combined.includes(kw) ? 1 : 0), 0);
  }

  // Device heuristic
  if (/Mobile|Android|iPhone/.test(ua)) {
    signals.athlete = (signals.athlete ?? 0) + 0.5;
    signals.family = (signals.family ?? 0) + 0.5;
  } else if (!/iPad|Tablet/.test(ua)) {
    signals.commuter = (signals.commuter ?? 0) + 0.5;
  }

  // Hour heuristic (UTC-based, rough)
  const hour = new Date().getUTCHours();
  if (hour >= 5 && hour <= 7) signals.athlete = (signals.athlete ?? 0) + 0.5;
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    signals.commuter = (signals.commuter ?? 0) + 0.5;
  }

  const entries = Object.entries(signals).sort((a, b) => b[1] - a[1]);
  const best = entries[0];

  if (best && best[1] > 0) return best[0];

  return 'commuter';
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
