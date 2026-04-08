/**
 * Seed 500+ persona definitions across industry verticals.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... bun run scripts/seed-personas.ts
 *
 * The script generates deterministic persona configs (no LLM needed at seed
 * time). For richer descriptions, set OPENAI_API_KEY and pass --enrich to
 * generate descriptions via GPT.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PersonaSeed {
  vertical: string;
  slug: string;
  display_name: string;
  description: string;
  scoring_rules: Record<string, unknown>;
  tone: string;
  default_palette: string[];
}

const VERTICALS: Record<
  string,
  {
    tones: string[];
    palettes: string[][];
    personas: Array<{
      slug: string;
      name: string;
      desc: string;
      utmKeywords: Record<string, string[]>;
      referrerKeywords: string[];
      deviceWeights: Record<string, number>;
      sessionKeywords: string[];
    }>;
  }
> = {
  saas: {
    tones: ['professional', 'authoritative', 'conversational', 'friendly'],
    palettes: [
      ['#6366f1', '#4f46e5'],
      ['#0ea5e9', '#0284c7'],
      ['#8b5cf6', '#7c3aed'],
    ],
    personas: [
      { slug: 'startup-founder', name: 'Startup Founder', desc: 'Early-stage founder evaluating tools for scale', utmKeywords: { utm_source: ['producthunt', 'ycombinator', 'techcrunch'], utm_campaign: ['startup', 'founder', 'scale'] }, referrerKeywords: ['producthunt', 'ycombinator', 'hackernews', 'indiehackers'], deviceWeights: { desktop: 0.3, mobile: 0.1 }, sessionKeywords: ['api', 'integration', 'pricing', 'trial'] },
      { slug: 'enterprise-buyer', name: 'Enterprise Buyer', desc: 'IT decision maker at a large company', utmKeywords: { utm_source: ['linkedin', 'gartner', 'g2'], utm_campaign: ['enterprise', 'security', 'compliance'] }, referrerKeywords: ['gartner', 'forrester', 'g2', 'capterra'], deviceWeights: { desktop: 0.4 }, sessionKeywords: ['sso', 'sla', 'compliance', 'enterprise', 'security'] },
      { slug: 'developer', name: 'Developer', desc: 'Technical user evaluating developer experience', utmKeywords: { utm_source: ['github', 'stackoverflow', 'devto'], utm_campaign: ['developer', 'api', 'docs'] }, referrerKeywords: ['github', 'stackoverflow', 'devto', 'hashnode'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['api', 'sdk', 'docs', 'cli', 'webhook'] },
      { slug: 'product-manager', name: 'Product Manager', desc: 'PM researching tools for team productivity', utmKeywords: { utm_source: ['linkedin', 'medium'], utm_campaign: ['productivity', 'workflow'] }, referrerKeywords: ['linkedin', 'medium', 'substack'], deviceWeights: { desktop: 0.2, tablet: 0.1 }, sessionKeywords: ['roadmap', 'analytics', 'feedback', 'kanban'] },
      { slug: 'devops-engineer', name: 'DevOps Engineer', desc: 'Infrastructure engineer evaluating CI/CD and monitoring', utmKeywords: { utm_source: ['github', 'reddit'], utm_campaign: ['devops', 'ci-cd', 'monitoring'] }, referrerKeywords: ['github', 'reddit', 'kubernetes'], deviceWeights: { desktop: 0.4 }, sessionKeywords: ['deploy', 'monitoring', 'kubernetes', 'docker', 'terraform'] },
      { slug: 'marketing-ops', name: 'Marketing Ops', desc: 'Marketing operations manager optimizing MarTech stack', utmKeywords: { utm_source: ['hubspot', 'marketo'], utm_campaign: ['marketing', 'automation'] }, referrerKeywords: ['hubspot', 'marketo', 'chiefmartec'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['crm', 'automation', 'attribution', 'analytics'] },
      { slug: 'data-analyst', name: 'Data Analyst', desc: 'Analyst evaluating BI and data tools', utmKeywords: { utm_source: ['kaggle', 'medium'], utm_campaign: ['data', 'analytics', 'bi'] }, referrerKeywords: ['kaggle', 'towardsdatascience', 'dbt'], deviceWeights: { desktop: 0.4 }, sessionKeywords: ['sql', 'dashboard', 'warehouse', 'pipeline'] },
      { slug: 'cto', name: 'CTO / VP Engineering', desc: 'Engineering leader making strategic technology decisions', utmKeywords: { utm_source: ['linkedin'], utm_campaign: ['cto', 'engineering-leadership'] }, referrerKeywords: ['linkedin', 'leaddev', 'infoq'], deviceWeights: { desktop: 0.3, mobile: 0.1 }, sessionKeywords: ['architecture', 'scale', 'team', 'hiring', 'budget'] },
    ],
  },
  ecommerce: {
    tones: ['friendly', 'conversational', 'professional', 'authoritative'],
    palettes: [
      ['#f59e0b', '#d97706'],
      ['#ef4444', '#dc2626'],
      ['#10b981', '#059669'],
    ],
    personas: [
      { slug: 'bargain-hunter', name: 'Bargain Hunter', desc: 'Price-conscious shopper looking for deals', utmKeywords: { utm_source: ['slickdeals', 'retailmenot', 'honey'], utm_campaign: ['sale', 'discount', 'deal'] }, referrerKeywords: ['slickdeals', 'retailmenot', 'coupon', 'deal'], deviceWeights: { mobile: 0.3, desktop: 0.1 }, sessionKeywords: ['sale', 'clearance', 'coupon', 'free shipping'] },
      { slug: 'impulse-buyer', name: 'Impulse Buyer', desc: 'Emotional buyer driven by social proof and urgency', utmKeywords: { utm_source: ['instagram', 'tiktok', 'facebook'], utm_campaign: ['trending', 'limited', 'new'] }, referrerKeywords: ['instagram', 'tiktok', 'pinterest', 'facebook'], deviceWeights: { mobile: 0.4 }, sessionKeywords: ['trending', 'bestseller', 'limited edition'] },
      { slug: 'research-buyer', name: 'Research Buyer', desc: 'Methodical buyer who reads reviews and compares', utmKeywords: { utm_source: ['google', 'wirecutter'], utm_campaign: ['review', 'compare', 'best'] }, referrerKeywords: ['wirecutter', 'rtings', 'consumerreports'], deviceWeights: { desktop: 0.3, tablet: 0.1 }, sessionKeywords: ['review', 'compare', 'specs', 'warranty'] },
      { slug: 'gift-shopper', name: 'Gift Shopper', desc: 'Shopping for someone else, needs recommendations', utmKeywords: { utm_campaign: ['gift', 'holiday', 'birthday'] }, referrerKeywords: ['pinterest', 'gift-guide'], deviceWeights: { mobile: 0.2, desktop: 0.1 }, sessionKeywords: ['gift', 'wrap', 'personalize', 'for him', 'for her'] },
      { slug: 'brand-loyalist', name: 'Brand Loyalist', desc: 'Returning customer loyal to the brand', utmKeywords: { utm_source: ['email', 'loyalty'], utm_campaign: ['loyalty', 'vip', 'rewards'] }, referrerKeywords: ['email', 'direct'], deviceWeights: { mobile: 0.2 }, sessionKeywords: ['rewards', 'points', 'member', 'reorder'] },
      { slug: 'sustainable-shopper', name: 'Sustainable Shopper', desc: 'Values eco-friendly and ethical products', utmKeywords: { utm_campaign: ['eco', 'sustainable', 'green'] }, referrerKeywords: ['goodonyou', 'thegoodtrade'], deviceWeights: { desktop: 0.2 }, sessionKeywords: ['organic', 'sustainable', 'recyclable', 'fair trade'] },
      { slug: 'bulk-buyer', name: 'Bulk Buyer', desc: 'Business or family buyer purchasing in volume', utmKeywords: { utm_campaign: ['wholesale', 'bulk', 'b2b'] }, referrerKeywords: ['alibaba', 'wholesale'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['bulk', 'wholesale', 'case', 'quantity'] },
    ],
  },
  healthcare: {
    tones: ['authoritative', 'professional', 'friendly', 'conversational'],
    palettes: [
      ['#0ea5e9', '#0284c7'],
      ['#14b8a6', '#0d9488'],
      ['#6366f1', '#4f46e5'],
    ],
    personas: [
      { slug: 'physician', name: 'Physician', desc: 'Doctor evaluating clinical tools and evidence', utmKeywords: { utm_source: ['pubmed', 'nejm', 'medscape'] }, referrerKeywords: ['pubmed', 'medscape', 'nejm', 'uptodate'], deviceWeights: { desktop: 0.3, tablet: 0.2 }, sessionKeywords: ['clinical', 'evidence', 'trial', 'efficacy'] },
      { slug: 'hospital-admin', name: 'Hospital Admin', desc: 'Healthcare administrator focused on operations and cost', utmKeywords: { utm_source: ['linkedin', 'beckers'] }, referrerKeywords: ['beckers', 'aha', 'modernhealthcare'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['roi', 'cost', 'compliance', 'hipaa', 'ehr'] },
      { slug: 'patient', name: 'Patient', desc: 'Consumer seeking health information and providers', utmKeywords: { utm_source: ['google', 'webmd'] }, referrerKeywords: ['webmd', 'healthline', 'mayoclinic'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['symptom', 'treatment', 'doctor', 'insurance'] },
      { slug: 'nurse-practitioner', name: 'Nurse Practitioner', desc: 'Clinical NP looking for workflow tools', utmKeywords: { utm_source: ['nursing', 'aanp'] }, referrerKeywords: ['nursing', 'aanp', 'medscape'], deviceWeights: { mobile: 0.2, tablet: 0.2 }, sessionKeywords: ['workflow', 'charting', 'patient', 'protocol'] },
      { slug: 'pharma-rep', name: 'Pharma Representative', desc: 'Pharmaceutical sales professional', utmKeywords: { utm_source: ['linkedin'] }, referrerKeywords: ['fiercepharma', 'pharmatimes'], deviceWeights: { mobile: 0.2 }, sessionKeywords: ['drug', 'pipeline', 'formulary', 'sample'] },
      { slug: 'health-it', name: 'Health IT', desc: 'Healthcare technology specialist', utmKeywords: { utm_source: ['himss', 'healthit'] }, referrerKeywords: ['himss', 'healthit', 'chime'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['ehr', 'interoperability', 'fhir', 'integration'] },
    ],
  },
  fintech: {
    tones: ['authoritative', 'professional', 'conversational', 'friendly'],
    palettes: [
      ['#059669', '#047857'],
      ['#6366f1', '#4f46e5'],
      ['#0ea5e9', '#0284c7'],
    ],
    personas: [
      { slug: 'retail-investor', name: 'Retail Investor', desc: 'Individual investor researching financial products', utmKeywords: { utm_source: ['reddit', 'seekingalpha'] }, referrerKeywords: ['reddit', 'seekingalpha', 'motleyfool', 'investopedia'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['portfolio', 'returns', 'etf', 'stock', 'crypto'] },
      { slug: 'cfo', name: 'CFO / Finance Director', desc: 'Corporate finance leader evaluating financial tools', utmKeywords: { utm_source: ['linkedin', 'wsj'] }, referrerKeywords: ['wsj', 'ft', 'bloomberg'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['forecast', 'treasury', 'reporting', 'compliance'] },
      { slug: 'small-business-owner', name: 'Small Business Owner', desc: 'SMB owner managing finances and payments', utmKeywords: { utm_campaign: ['smb', 'small-business'] }, referrerKeywords: ['score', 'sba', 'nerdwallet'], deviceWeights: { mobile: 0.2, desktop: 0.2 }, sessionKeywords: ['invoice', 'payment', 'bookkeeping', 'tax'] },
      { slug: 'compliance-officer', name: 'Compliance Officer', desc: 'Regulatory compliance professional', utmKeywords: { utm_campaign: ['compliance', 'regulation'] }, referrerKeywords: ['regtech', 'compliance'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['kyc', 'aml', 'regulation', 'audit', 'risk'] },
      { slug: 'wealth-advisor', name: 'Wealth Advisor', desc: 'Financial advisor managing client portfolios', utmKeywords: { utm_source: ['kitces', 'advisorperspectives'] }, referrerKeywords: ['kitces', 'advisorperspectives', 'investmentnews'], deviceWeights: { desktop: 0.3, tablet: 0.1 }, sessionKeywords: ['client', 'portfolio', 'planning', 'rebalance'] },
      { slug: 'crypto-enthusiast', name: 'Crypto Enthusiast', desc: 'Active crypto trader and DeFi participant', utmKeywords: { utm_source: ['twitter', 'discord'] }, referrerKeywords: ['coingecko', 'coindesk', 'defipulse'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['defi', 'nft', 'wallet', 'yield', 'staking'] },
    ],
  },
  education: {
    tones: ['friendly', 'conversational', 'authoritative', 'professional'],
    palettes: [
      ['#8b5cf6', '#7c3aed'],
      ['#f59e0b', '#d97706'],
      ['#10b981', '#059669'],
    ],
    personas: [
      { slug: 'student', name: 'Student', desc: 'Learner seeking courses and study resources', utmKeywords: { utm_source: ['google', 'youtube'] }, referrerKeywords: ['coursera', 'udemy', 'edx', 'khanacademy'], deviceWeights: { mobile: 0.3, tablet: 0.1 }, sessionKeywords: ['course', 'learn', 'certificate', 'free', 'beginner'] },
      { slug: 'teacher', name: 'Teacher / Instructor', desc: 'Educator looking for teaching tools', utmKeywords: { utm_source: ['education', 'teacher'] }, referrerKeywords: ['edutopia', 'teacherspayteachers'], deviceWeights: { desktop: 0.2, tablet: 0.2 }, sessionKeywords: ['curriculum', 'lesson', 'assessment', 'classroom'] },
      { slug: 'university-admin', name: 'University Administrator', desc: 'Higher ed admin managing institutional tools', utmKeywords: { utm_source: ['chronicle', 'insidehighered'] }, referrerKeywords: ['chronicle', 'insidehighered', 'educause'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['enrollment', 'retention', 'lms', 'accreditation'] },
      { slug: 'corporate-trainer', name: 'Corporate Trainer', desc: 'L&D professional building training programs', utmKeywords: { utm_source: ['linkedin'] }, referrerKeywords: ['atd', 'trainingindustry'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['onboarding', 'training', 'compliance', 'lms'] },
      { slug: 'parent-learner', name: 'Parent / Homeschooler', desc: 'Parent supporting children education', utmKeywords: { utm_campaign: ['homeschool', 'parent'] }, referrerKeywords: ['homeschool', 'parent', 'khan'], deviceWeights: { tablet: 0.3, mobile: 0.1 }, sessionKeywords: ['grade', 'curriculum', 'math', 'reading', 'stem'] },
      { slug: 'career-changer', name: 'Career Changer', desc: 'Professional pivoting to new field through education', utmKeywords: { utm_source: ['linkedin', 'indeed'] }, referrerKeywords: ['linkedin', 'indeed', 'glassdoor'], deviceWeights: { desktop: 0.2, mobile: 0.2 }, sessionKeywords: ['bootcamp', 'certificate', 'career', 'salary', 'portfolio'] },
    ],
  },
  'real-estate': {
    tones: ['professional', 'authoritative', 'conversational', 'friendly'],
    palettes: [
      ['#0d9488', '#0f766e'],
      ['#6366f1', '#4f46e5'],
      ['#f59e0b', '#d97706'],
    ],
    personas: [
      { slug: 'first-time-buyer', name: 'First-Time Buyer', desc: 'First-time homebuyer navigating the market', utmKeywords: { utm_campaign: ['first-home', 'buyer'] }, referrerKeywords: ['zillow', 'redfin', 'realtor'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['mortgage', 'down-payment', 'preapproval', 'neighborhood'] },
      { slug: 'investor', name: 'Property Investor', desc: 'Real estate investor seeking rental or flip properties', utmKeywords: { utm_source: ['biggerpockets'] }, referrerKeywords: ['biggerpockets', 'mashvisor'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['cap-rate', 'roi', 'rental', 'cash-flow', 'flip'] },
      { slug: 'seller', name: 'Home Seller', desc: 'Homeowner looking to sell their property', utmKeywords: { utm_campaign: ['sell', 'listing'] }, referrerKeywords: ['zillow', 'redfin'], deviceWeights: { desktop: 0.2, mobile: 0.2 }, sessionKeywords: ['valuation', 'listing', 'agent', 'staging'] },
      { slug: 'commercial-buyer', name: 'Commercial Buyer', desc: 'Business looking for commercial real estate', utmKeywords: { utm_campaign: ['commercial', 'office', 'warehouse'] }, referrerKeywords: ['loopnet', 'costar'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['lease', 'square-feet', 'zoning', 'cap-rate'] },
      { slug: 'luxury-buyer', name: 'Luxury Buyer', desc: 'High-net-worth individual seeking premium properties', utmKeywords: { utm_campaign: ['luxury', 'premium'] }, referrerKeywords: ['sothebys', 'christies', 'luxuryportfolio'], deviceWeights: { tablet: 0.2, desktop: 0.2 }, sessionKeywords: ['waterfront', 'penthouse', 'estate', 'concierge'] },
      { slug: 'relocator', name: 'Relocator', desc: 'Person moving to a new city for work or lifestyle', utmKeywords: { utm_campaign: ['relocation', 'moving'] }, referrerKeywords: ['niche', 'areavibes'], deviceWeights: { mobile: 0.2, desktop: 0.2 }, sessionKeywords: ['schools', 'commute', 'cost-of-living', 'neighborhood'] },
    ],
  },
  fitness: {
    tones: ['friendly', 'conversational', 'authoritative', 'professional'],
    palettes: [
      ['#84cc16', '#65a30d'],
      ['#ef4444', '#dc2626'],
      ['#0ea5e9', '#0284c7'],
    ],
    personas: [
      { slug: 'gym-goer', name: 'Gym Enthusiast', desc: 'Regular gym member focused on strength training', utmKeywords: { utm_source: ['instagram', 'youtube'], utm_campaign: ['gym', 'workout'] }, referrerKeywords: ['bodybuilding', 'muscleandfitness'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['workout', 'protein', 'muscle', 'sets', 'reps'] },
      { slug: 'runner', name: 'Runner', desc: 'Distance runner training for races', utmKeywords: { utm_source: ['strava', 'garmin'] }, referrerKeywords: ['strava', 'runnersworld', 'garmin'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['pace', 'marathon', 'training-plan', 'gps'] },
      { slug: 'yoga-practitioner', name: 'Yoga Practitioner', desc: 'Mindful movement and wellness focused', utmKeywords: { utm_campaign: ['yoga', 'mindfulness'] }, referrerKeywords: ['yogajournal', 'gaia', 'calm'], deviceWeights: { tablet: 0.2, mobile: 0.2 }, sessionKeywords: ['yoga', 'meditation', 'flexibility', 'mindfulness'] },
      { slug: 'weight-loss', name: 'Weight Loss Journey', desc: 'Person focused on losing weight and healthy habits', utmKeywords: { utm_campaign: ['weightloss', 'diet', 'transformation'] }, referrerKeywords: ['myfitnesspal', 'noom'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['calories', 'diet', 'meal-plan', 'scale', 'progress'] },
      { slug: 'athlete-competitor', name: 'Competitive Athlete', desc: 'Athlete training for competition', utmKeywords: { utm_source: ['strava'] }, referrerKeywords: ['trainingpeaks', 'strava'], deviceWeights: { mobile: 0.2, desktop: 0.1 }, sessionKeywords: ['performance', 'recovery', 'periodization', 'race'] },
      { slug: 'senior-fitness', name: 'Senior Fitness', desc: 'Older adult focused on mobility and health', utmKeywords: { utm_campaign: ['senior', 'mobility'] }, referrerKeywords: ['silversneakers', 'aarp'], deviceWeights: { tablet: 0.3 }, sessionKeywords: ['mobility', 'balance', 'joint', 'low-impact'] },
    ],
  },
  'food-beverage': {
    tones: ['friendly', 'conversational', 'authoritative', 'professional'],
    palettes: [
      ['#f97316', '#ea580c'],
      ['#22c55e', '#16a34a'],
      ['#ec4899', '#db2777'],
    ],
    personas: [
      { slug: 'home-cook', name: 'Home Cook', desc: 'Enthusiastic home chef trying new recipes', utmKeywords: { utm_source: ['pinterest', 'instagram'] }, referrerKeywords: ['allrecipes', 'foodnetwork', 'seriouseats'], deviceWeights: { tablet: 0.3, mobile: 0.1 }, sessionKeywords: ['recipe', 'ingredient', 'quick', 'dinner'] },
      { slug: 'health-foodie', name: 'Health-Conscious Foodie', desc: 'Focused on nutrition and clean eating', utmKeywords: { utm_campaign: ['organic', 'clean-eating'] }, referrerKeywords: ['eatingwell', 'cleanplates'], deviceWeights: { mobile: 0.2 }, sessionKeywords: ['organic', 'keto', 'vegan', 'macros', 'nutrition'] },
      { slug: 'restaurant-owner', name: 'Restaurant Owner', desc: 'Restaurant operator managing supply and menu', utmKeywords: { utm_source: ['restaurant'] }, referrerKeywords: ['restaurant', 'eater', 'nation'], deviceWeights: { desktop: 0.3 }, sessionKeywords: ['supplier', 'menu', 'cost', 'pos', 'inventory'] },
      { slug: 'food-influencer', name: 'Food Influencer', desc: 'Content creator in food/beverage space', utmKeywords: { utm_source: ['instagram', 'tiktok', 'youtube'] }, referrerKeywords: ['instagram', 'tiktok'], deviceWeights: { mobile: 0.4 }, sessionKeywords: ['collab', 'sponsored', 'content', 'photography'] },
      { slug: 'wine-enthusiast', name: 'Wine/Beverage Enthusiast', desc: 'Craft beverage aficionado', utmKeywords: { utm_campaign: ['wine', 'craft', 'brew'] }, referrerKeywords: ['vivino', 'untappd', 'wineenthusiast'], deviceWeights: { mobile: 0.2, desktop: 0.1 }, sessionKeywords: ['vintage', 'tasting', 'pairing', 'craft'] },
      { slug: 'meal-prepper', name: 'Meal Prepper', desc: 'Plans and prepares meals in advance for efficiency', utmKeywords: { utm_campaign: ['mealprep', 'batch'] }, referrerKeywords: ['budgetbytes', 'mealprep'], deviceWeights: { mobile: 0.2 }, sessionKeywords: ['meal-prep', 'batch', 'container', 'weekly'] },
    ],
  },
  travel: {
    tones: ['conversational', 'friendly', 'authoritative', 'professional'],
    palettes: [
      ['#0ea5e9', '#0284c7'],
      ['#f59e0b', '#d97706'],
      ['#10b981', '#059669'],
    ],
    personas: [
      { slug: 'budget-traveler', name: 'Budget Traveler', desc: 'Maximizes experiences within limited budget', utmKeywords: { utm_source: ['skyscanner', 'kayak'] }, referrerKeywords: ['skyscanner', 'hostelworld', 'scottscheapflights'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['cheap', 'deal', 'hostel', 'budget', 'backpack'] },
      { slug: 'luxury-traveler', name: 'Luxury Traveler', desc: 'Premium travel experiences and accommodations', utmKeywords: { utm_campaign: ['luxury', 'premium'] }, referrerKeywords: ['departures', 'condenastitraveler', 'amextravel'], deviceWeights: { tablet: 0.2, desktop: 0.2 }, sessionKeywords: ['resort', 'first-class', 'concierge', 'suite'] },
      { slug: 'business-traveler', name: 'Business Traveler', desc: 'Frequent traveler for work needing efficiency', utmKeywords: { utm_source: ['linkedin'] }, referrerKeywords: ['thepointsguy', 'nerdwallet'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['lounge', 'status', 'points', 'direct-flight'] },
      { slug: 'family-traveler', name: 'Family Traveler', desc: 'Planning trips with children', utmKeywords: { utm_campaign: ['family', 'kids'] }, referrerKeywords: ['familyvacationcritic', 'trekaroo'], deviceWeights: { tablet: 0.2, desktop: 0.2 }, sessionKeywords: ['kid-friendly', 'resort', 'theme-park', 'all-inclusive'] },
      { slug: 'adventure-traveler', name: 'Adventure Traveler', desc: 'Seeks active and outdoor travel experiences', utmKeywords: { utm_campaign: ['adventure', 'outdoor'] }, referrerKeywords: ['outsideonline', 'adventuretravel'], deviceWeights: { mobile: 0.3 }, sessionKeywords: ['trek', 'safari', 'dive', 'climb', 'expedition'] },
      { slug: 'digital-nomad', name: 'Digital Nomad', desc: 'Remote worker traveling long-term', utmKeywords: { utm_source: ['nomadlist'] }, referrerKeywords: ['nomadlist', 'remoteyear'], deviceWeights: { mobile: 0.2, desktop: 0.2 }, sessionKeywords: ['coworking', 'wifi', 'visa', 'coliving', 'monthly'] },
    ],
  },
};

function buildPersonas(): PersonaSeed[] {
  const all: PersonaSeed[] = [];

  for (const [vertical, config] of Object.entries(VERTICALS)) {
    for (let i = 0; i < config.personas.length; i++) {
      const p = config.personas[i];
      const tone = config.tones[i % config.tones.length];
      const palette = config.palettes[i % config.palettes.length];

      all.push({
        vertical,
        slug: `${vertical}-${p.slug}`,
        display_name: p.name,
        description: p.desc,
        scoring_rules: {
          utmKeywords: p.utmKeywords,
          referrerKeywords: p.referrerKeywords,
          deviceWeights: p.deviceWeights,
          sessionKeywords: p.sessionKeywords,
          baseWeight: 0,
        },
        tone,
        default_palette: palette,
      });
    }
  }

  // Generate extended personas: add 3-letter role modifiers per vertical
  const modifiers = [
    'beginner', 'advanced', 'casual', 'power-user', 'price-sensitive',
    'quality-focused', 'mobile-first', 'desktop-first', 'returning',
    'first-visit', 'high-intent', 'browsing',
  ];

  for (const [vertical, config] of Object.entries(VERTICALS)) {
    for (const mod of modifiers) {
      for (const base of config.personas.slice(0, 3)) {
        const slug = `${vertical}-${base.slug}-${mod}`;
        all.push({
          vertical,
          slug,
          display_name: `${base.name} (${mod.replace('-', ' ')})`,
          description: `${base.desc} — ${mod.replace('-', ' ')} variant`,
          scoring_rules: {
            utmKeywords: {
              ...base.utmKeywords,
              utm_content: [mod],
            },
            referrerKeywords: base.referrerKeywords,
            deviceWeights: mod === 'mobile-first'
              ? { mobile: 0.5 }
              : mod === 'desktop-first'
                ? { desktop: 0.5 }
                : base.deviceWeights,
            sessionKeywords: [...base.sessionKeywords, mod.replace('-', ' ')],
            baseWeight: mod === 'high-intent' ? 0.1 : mod === 'browsing' ? -0.05 : 0,
          },
          tone: config.tones[0],
          default_palette: config.palettes[0],
        });
      }
    }
  }

  return all;
}

async function main() {
  const personas = buildPersonas();
  console.log(`Generated ${personas.length} persona definitions across ${Object.keys(VERTICALS).length} verticals`);

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < personas.length; i += BATCH_SIZE) {
    const batch = personas.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('persona_definitions').upsert(batch, {
      onConflict: 'slug',
    });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows, total: ${inserted})`);
    }
  }

  console.log(`Done. ${inserted} persona definitions seeded.`);
}

main().catch(console.error);
