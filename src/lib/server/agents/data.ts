import 'server-only';
import { QuotesSection } from '@/lib/storyboard';
import { WaterBottlePersona } from '@/lib/personas';
import { getOpenAIModel } from '../config';
import { getRecentEvents, Event } from '../database';

export interface ProofInsight {
  type: 'usage' | 'conversion' | 'engagement' | 'performance';
  metric: string;
  value: number | string;
  timeframe: string;
  credibility: number; // 0-1 score
}

export interface GeneratedProof {
  quotes: Array<{
    text: string;
    role: string;
    source: 'generated' | 'real';
    credibility: number;
  }>;
  metrics: ProofInsight[];
  updated: string;
}

// Main function to generate proof from recent events
export async function generateProofFromEvents(
  storyId: string,
  persona: WaterBottlePersona,
  minutesBack: number = 60
): Promise<GeneratedProof> {
  const events = await getRecentEvents(storyId, minutesBack);

  const insights = analyzeEvents(events);
  const quotes = await generateQuotesFromInsights(insights, persona);

  return {
    quotes,
    metrics: insights,
    updated: new Date().toISOString()
  };
}

// Analyze events to extract meaningful insights
function analyzeEvents(events: Event[]): ProofInsight[] {
  const insights: ProofInsight[] = [];

  if (events.length === 0) return insights;

  // Engagement metrics
  const dwellEvents = events.filter(e => e.event === 'dwell');
  if (dwellEvents.length > 0) {
    const avgDwellTime = dwellEvents.reduce((sum, e) =>
      sum + (Number((e.meta as Record<string, unknown>)?.duration) || 0), 0) / dwellEvents.length;

    if (avgDwellTime > 30) { // 30+ seconds
      insights.push({
        type: 'engagement',
        metric: 'Average time on page',
        value: `${Math.round(avgDwellTime)}s`,
        timeframe: 'last hour',
        credibility: 0.8
      });
    }
  }

  // Conversion metrics
  const ctaClicks = events.filter(e => e.event === 'ctaClick');
  const views = events.filter(e => e.event === 'view');

  if (ctaClicks.length > 0 && views.length > 0) {
    const conversionRate = (ctaClicks.length / views.length) * 100;
    if (conversionRate > 5) { // 5%+ conversion rate
      insights.push({
        type: 'conversion',
        metric: 'Conversion rate',
        value: `${conversionRate.toFixed(1)}%`,
        timeframe: 'last hour',
        credibility: 0.9
      });
    }
  }

  // Usage patterns
  const uniquePersonas = new Set(events.map(e => e.persona));
  if (uniquePersonas.size > 1) {
    insights.push({
      type: 'usage',
      metric: 'User types engaged',
      value: `${uniquePersonas.size} different user segments`,
      timeframe: 'recent activity',
      credibility: 0.7
    });
  }

  // Performance indicators
  const scrollDepthEvents = events.filter(e => e.event === 'scrollDepth');
  if (scrollDepthEvents.length > 0) {
    const maxScrollDepth = Math.max(...scrollDepthEvents.map(e => Number((e.meta as Record<string, unknown>)?.depth) || 0));
    if (maxScrollDepth > 80) { // 80%+ scroll depth
      insights.push({
        type: 'engagement',
        metric: 'Content engagement',
        value: `Users scroll ${maxScrollDepth}% of page`,
        timeframe: 'active sessions',
        credibility: 0.8
      });
    }
  }

  return insights;
}

// Generate realistic quotes from insights
async function generateQuotesFromInsights(
  insights: ProofInsight[],
  persona: WaterBottlePersona
): Promise<Array<{
  text: string;
  role: string;
  source: 'generated' | 'real';
  credibility: number;
}>> {
  if (insights.length === 0) {
    return getDefaultQuotes(persona);
  }

  const systemPrompt = `You are a testimonial writer. Based on the provided metrics and insights,
generate 1-2 realistic, specific testimonials that a ${persona} might say.

Make them:
- Credible and specific (reference actual metrics)
- Appropriate for the persona type
- Not overly promotional
- Include realistic job titles

Return JSON array: [{"text": "quote", "role": "job title, company"}]`;

  const userPrompt = `Insights:
${insights.map(i => `- ${i.metric}: ${i.value} (${i.timeframe})`).join('\n')}

Generate testimonials for ${persona} persona.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const quotes = JSON.parse(content);

    return (quotes as Array<{ text: string; role: string }>).map((quote) => ({
      ...quote,
      source: 'generated' as const,
      credibility: 0.7
    }));

  } catch (error) {
    console.error('Error generating quotes:', error);
    return getDefaultQuotes(persona);
  }
}

// Default quotes as fallback
function getDefaultQuotes(persona: WaterBottlePersona): Array<{
  text: string;
  role: string;
  source: 'generated';
  credibility: number;
}> {
  const quotesByPersona: Record<WaterBottlePersona, Array<{ text: string; role: string }>> = {
    athlete: [
      { text: "Still ice-cold after my 3-hour marathon training.", role: "Marathon Runner" },
      { text: "The grip is perfect even with sweaty hands.", role: "CrossFit Athlete" }
    ],
    commuter: [
      { text: "Fits perfectly in my car cup holder.", role: "Sales Manager" },
      { text: "No more coffee rings on my desk.", role: "Software Engineer" }
    ],
    outdoor: [
      { text: "Survived a 14-day backcountry trip.", role: "Wilderness Guide" },
      { text: "Ice lasted 26 hours in Death Valley heat.", role: "Desert Photographer" }
    ],
    family: [
      { text: "My toddler hasn't spilled once in 6 months!", role: "Mom of 3" },
      { text: "Finally, a bottle I trust with my kids' health.", role: "Pediatric Nurse" }
    ]
  };

  return quotesByPersona[persona].map(quote => ({
    ...quote,
    source: 'generated' as const,
    credibility: 0.6
  }));
}

// Update proof section with fresh data
export async function updateProofSection(
  currentSection: QuotesSection,
  storyId: string,
  persona: WaterBottlePersona
): Promise<QuotesSection> {
  const freshProof = await generateProofFromEvents(storyId, persona);

  // Merge with existing quotes, keeping high-credibility ones
  const existingQuotes = currentSection.quotes.map(q => ({
    ...q,
    source: 'real' as const,
    credibility: 0.9 // Assume existing quotes are real/high quality
  }));

  const allQuotes = [...existingQuotes, ...freshProof.quotes];

  // Sort by credibility and take top 3
  const bestQuotes = allQuotes
    .sort((a, b) => b.credibility - a.credibility)
    .slice(0, 3)
    .map(q => ({ text: q.text, role: q.role }));

  return {
    ...currentSection,
    quotes: bestQuotes
  };
}

// Generate social proof metrics for display
export function generateSocialProofMetrics(insights: ProofInsight[]): Array<{
  label: string;
  value: string;
  highlight: boolean;
}> {
  return insights
    .filter(insight => insight.credibility > 0.7)
    .map(insight => ({
      label: insight.metric,
      value: insight.value.toString(),
      highlight: insight.type === 'conversion' || insight.type === 'performance'
    }))
    .slice(0, 3); // Limit to top 3 metrics
}

// Analyze conversion funnel from events
export function analyzeConversionFunnel(events: Event[]): {
  steps: Array<{
    name: string;
    count: number;
    conversionRate?: number;
  }>;
  insights: string[];
} {
  const views = events.filter(e => e.event === 'view').length;
  const hovers = events.filter(e => e.event === 'hover').length;
  const dwells = events.filter(e => e.event === 'dwell').length;
  const ctaClicks = events.filter(e => e.event === 'ctaClick').length;

  const steps = [
    { name: 'Page Views', count: views },
    { name: 'Engaged (Hover)', count: hovers, conversionRate: views > 0 ? (hovers / views) * 100 : 0 },
    { name: 'Time on Page', count: dwells, conversionRate: hovers > 0 ? (dwells / hovers) * 100 : 0 },
    { name: 'CTA Clicks', count: ctaClicks, conversionRate: dwells > 0 ? (ctaClicks / dwells) * 100 : 0 }
  ];

  const insights: string[] = [];

  if (views > 10) {
    const overallConversion = (ctaClicks / views) * 100;
    if (overallConversion > 5) {
      insights.push(`Strong ${overallConversion.toFixed(1)}% conversion rate`);
    } else if (overallConversion < 1) {
      insights.push('Low conversion - consider CTA optimization');
    }
  }

  if (dwells / views > 0.5) {
    insights.push('High engagement - users are reading content');
  }

  return { steps, insights };
}

// Get real-time proof updates
export async function getRealTimeProofUpdates(
  storyId: string,
  lastUpdate: string
): Promise<{ hasUpdates: boolean; proof?: GeneratedProof }> {
  const lastUpdateTime = new Date(lastUpdate);
  const events = await getRecentEvents(storyId, 5); // Last 5 minutes

  const recentEvents = events.filter(e => new Date(e.ts) > lastUpdateTime);

  if (recentEvents.length === 0) {
    return { hasUpdates: false };
  }

  // Only update if significant activity
  const significantEvents = recentEvents.filter(e =>
    ['ctaClick', 'dwell', 'conversion'].includes(e.event)
  );

  if (significantEvents.length === 0) {
    return { hasUpdates: false };
  }

  const proof = await generateProofFromEvents(storyId, 'commuter', 5);
  return { hasUpdates: true, proof };
}
