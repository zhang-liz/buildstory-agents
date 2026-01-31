import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseStoryboard, generateVariantHash, Storyboard } from '@/lib/storyboard';
import { createStory, saveStoryboard } from '@/lib/server/database';
import { getOpenAIModel } from '@/lib/server/config';
import { classifyPersona, extractPersonaContext } from '@/lib/server/agents/persona';
import { validateBrandAlignment } from '@/lib/server/agents/brand';
import { WaterBottlePersona, personaThemes } from '@/lib/personas';

// Request schema
const StoryRequestSchema = z.object({
  brief: z.string().min(10).max(500),
  tone: z.string().optional().default('professional'),
  palette: z.array(z.string()).optional().default(['#059669', '#15803d', '#0d9488']),
  brandName: z.string().optional().default('HydroFlow')
});

// Generate water bottle storyboard using LLM
async function generateWaterBottleStoryboard(
  brief: string,
  tone: string,
  persona: WaterBottlePersona,
  brandName: string
): Promise<Storyboard> {
  const personaTheme = personaThemes[persona];

  const systemPrompt = `You are a conversion copy expert for water bottle products. Given a product brief and buyer persona, output ONLY a complete Storyboard JSON matching this exact schema:

{
  "version": 1,
  "brand": {"name": string, "tone": string, "palette": string[], "logoAlt": string},
  "persona": "${persona}",
  "sections": [
    {"key":"hero","type":"hero","headline":string,"sub":string,"cta":[{"text":string,"goal":"purchase"}],"demoIdea":string},
    {"key":"problem","type":"bullets","items":string[]},
    {"key":"solution","type":"steps","items":string[]},
    {"key":"proof","type":"quotes","quotes":[{"text":string,"role":string}]},
    {"key":"pricing","type":"tiers","tiers":[{"name":string,"price":string,"features":string[],"cta":string}]},
    {"key":"faq","type":"qna","qna":[[string,string]]}
  ]
}

Target ${persona} persona specifically:
- Athlete: performance, training, endurance focus
- Commuter: daily use, convenience, office-friendly
- Outdoor: durability, insulation, adventure-ready
- Family: safety, spill-proof, kid-friendly

Keep strings concise, avoid superlatives, use tone: ${tone}.`;

  const userPrompt = `Product: ${brief}
Brand: ${brandName}
Persona: ${persona}
Tone: ${tone}
Key Features: ${personaTheme.copy.features.join(', ')}

Generate complete water bottle storyboard JSON for ${persona} buyers.`;

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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse and validate JSON
    const storyboardJson = JSON.parse(content);
    return parseStoryboard(storyboardJson);

  } catch (error) {
    console.error('Error generating storyboard:', error);
    // Return template storyboard as fallback
    return getWaterBottleTemplateStoryboard(brief, tone, persona, brandName);
  }
}

// Template water bottle storyboard as fallback
function getWaterBottleTemplateStoryboard(
  brief: string,
  tone: string,
  persona: WaterBottlePersona,
  brandName: string
): Storyboard {
  const theme = personaThemes[persona];

  return {
    version: 1,
    brand: {
      name: brandName,
      tone,
      palette: ['#059669', '#15803d', '#0d9488'],
      logoAlt: `${brandName} logo`
    },
    persona,
    sections: [
      {
        key: 'hero',
        type: 'hero',
        headline: theme.copy.headline,
        sub: theme.copy.subheadline,
        cta: [
          { text: theme.copy.cta, goal: 'purchase' },
          { text: theme.copy.ctaSecondary, goal: 'learn' }
        ],
        demoIdea: 'Interactive 360° bottle view with feature highlights'
      },
      {
        key: 'problem',
        type: 'bullets',
        items: persona === 'athlete' ? [
          'Standard bottles don\'t keep drinks cold during long training sessions',
          'Difficult to grip with sweaty hands',
          'Hard to drink from while running',
          'Frequent refills interrupt workout flow'
        ] : persona === 'commuter' ? [
          'Coffee spills in your bag are a nightmare',
          'Bottles that don\'t fit cup holders are useless',
          'Condensation ruins desk surfaces',
          'Cleaning narrow-mouth bottles is frustrating'
        ] : persona === 'outdoor' ? [
          'Cheap bottles crack or dent on trails',
          'Poor insulation ruins outdoor experiences',
          'No reliable way to attach to backpacks',
          'Can\'t trust them in extreme conditions'
        ] : [
          'Kids spill drinks constantly',
          'Worried about harmful plastics',
          'Multiple bottles for family trips are heavy',
          'Hard to track whose bottle is whose'
        ]
      },
      {
        key: 'solution',
        type: 'steps',
        items: theme.copy.features
      },
      {
        key: 'proof',
        type: 'quotes',
        quotes: persona === 'athlete' ? [
          { text: 'Still ice-cold after my 3-hour marathon training. Game changer.', role: 'Marathon Runner' },
          { text: 'The grip is perfect even with sweaty hands. Never drops.', role: 'CrossFit Athlete' },
          { text: 'One-handed operation while running is flawless.', role: 'Trail Runner' }
        ] : persona === 'commuter' ? [
          { text: 'Fits perfectly in my car and never leaks in my work bag.', role: 'Sales Manager' },
          { text: 'No more coffee rings on my desk. Professional and practical.', role: 'Software Engineer' },
          { text: 'The silent cap is perfect for meetings.', role: 'Consultant' }
        ] : persona === 'outdoor' ? [
          { text: 'Survived a 14-day backcountry trip. Still looks new.', role: 'Wilderness Guide' },
          { text: 'Ice lasted 26 hours in Death Valley heat.', role: 'Desert Photographer' },
          { text: 'Dropped it off a cliff. Not even a dent.', role: 'Rock Climber' }
        ] : [
          { text: 'My toddler hasn\'t spilled once in 6 months!', role: 'Mom of 3' },
          { text: 'Love that each kid has their own color. No more mix-ups.', role: 'Teacher & Parent' },
          { text: 'Finally, a bottle I trust with my kids\' health.', role: 'Pediatric Nurse' }
        ]
      },
      {
        key: 'pricing',
        type: 'tiers',
        tiers: [
          {
            name: theme.copy.bundleName,
            price: persona === 'athlete' ? '$39' :
                   persona === 'commuter' ? '$29' :
                   persona === 'outdoor' ? '$49' : '$89',
            features: theme.copy.features.slice(0, 4),
            cta: theme.copy.cta
          }
        ]
      },
      {
        key: 'faq',
        type: 'qna',
        qna: [
          ['What sizes are available?', persona === 'athlete' ? '20oz, 24oz, and 32oz to match your training needs.' :
                                        persona === 'commuter' ? '16oz and 20oz - perfect for cup holders.' :
                                        persona === 'outdoor' ? '24oz, 32oz, and 40oz for extended adventures.' :
                                        '12oz kids, 16oz, 20oz, and family bundle options.'],
          ['Is it dishwasher safe?', 'Yes! Top rack dishwasher safe for easy cleaning.'],
          ['What\'s the warranty?', persona === 'outdoor' ? 'Lifetime warranty against defects and dents.' :
                                    '2-year warranty with lifetime support.'],
          ['What materials are used?', persona === 'family' ? 'BPA-free, BPS-free, medical-grade materials approved by pediatricians.' :
                                      'Premium stainless steel with food-grade coating.']
        ]
      }
    ]
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { brief, tone, palette, brandName } = StoryRequestSchema.parse(body);

    // Extract persona context from request
    const personaContext = extractPersonaContext(request);
    const personaResult = await classifyPersona(personaContext);

    // Generate water bottle storyboard
    const storyboard = await generateWaterBottleStoryboard(
      brief || 'Premium insulated water bottle for active lifestyles',
      tone,
      personaResult.label,
      brandName
    );

    // Update brand in storyboard
    storyboard.brand = {
      name: brandName,
      tone,
      palette,
      logoAlt: `${brandName} logo`
    };
    storyboard.persona = personaResult.label;

    // Validate brand alignment
    const brandValidation = await validateBrandAlignment(
      storyboard.sections[0], // Check hero section
      storyboard.brand
    );

    // Use corrected section if brand validation failed
    if (!brandValidation.isValid && brandValidation.correctedSection) {
      storyboard.sections[0] = brandValidation.correctedSection;
    }

    // Save to database
    const story = await createStory(brief || 'Premium water bottle', storyboard.brand);
    const variantHash = await generateVariantHash(storyboard.sections[0]);

    await saveStoryboard(story.id, personaResult.label, variantHash, storyboard);

    // Return response
    return NextResponse.json({
      storyId: story.id,
      storyboard,
      persona: {
        detected: personaResult.label,
        confidence: personaResult.confidence,
        reasoning: personaResult.reasoning
      },
      brandValidation: {
        score: brandValidation.score,
        issues: brandValidation.issues
      }
    });

  } catch (error) {
    console.error('=== ERROR CREATING STORY ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('============================');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    // Return more detailed error in development
    const isDev = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(isDev && {
          details: error instanceof Error ? error.message : String(error),
          type: error?.constructor?.name
        })
      },
      { status: 500 }
    );
  }
}

const STORY_GET_PERSONAS: WaterBottlePersona[] = ['athlete', 'commuter', 'outdoor', 'family'];

// GET method to retrieve existing story
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get('storyId');
  const personaParam = searchParams.get('persona');

  if (!storyId) {
    return NextResponse.json(
      { error: 'Story ID required' },
      { status: 400 }
    );
  }

  try {
    const { getStory, getLatestStoryboard } = await import('@/lib/server/database');

    const story = await getStory(storyId);

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Use requested persona if valid, otherwise fallback order
    const personasToTry: WaterBottlePersona[] = personaParam && STORY_GET_PERSONAS.includes(personaParam as WaterBottlePersona)
      ? [personaParam as WaterBottlePersona]
      : ['commuter', 'athlete', 'outdoor', 'family'];

    let storyboard = null;
    for (const persona of personasToTry) {
      storyboard = await getLatestStoryboard(storyId, persona);
      if (storyboard) break;
    }

    return NextResponse.json({
      story,
      storyboard: storyboard?.json
    });

  } catch (error) {
    console.error('Error retrieving story:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
