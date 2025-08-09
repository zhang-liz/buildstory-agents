export type WaterBottlePersona = 'athlete' | 'commuter' | 'outdoor' | 'family';

export interface PersonaTheme {
  name: string;
  icon: string;
  description: string;
  gradient: {
    from: string;
    via: string;
    to: string;
  };
  colors: {
    primary: string;
    accent: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
  };
  copy: {
    headline: string;
    subheadline: string;
    cta: string;
    ctaSecondary: string;
    reassurance: string;
    bundleName: string;
    defaultSize: string;
    features: string[];
  };
}

export const personaThemes: Record<WaterBottlePersona, PersonaTheme> = {
  athlete: {
    name: 'Athlete',
    icon: '🏃',
    description: 'Performance-focused hydration for training',
    gradient: {
      from: 'from-lime-500',
      via: 'via-lime-600',
      to: 'to-emerald-700'
    },
    colors: {
      primary: 'lime-600',
      accent: 'lime-400',
      surface: 'neutral-900',
      surfaceAlt: 'neutral-800',
      text: 'white',
      textMuted: 'neutral-300'
    },
    copy: {
      headline: 'Crush Your Splits. Hydrate Smarter.',
      subheadline: 'The performance bottle that keeps up with your training intensity.',
      cta: 'Train With It Today',
      ctaSecondary: 'See Pro Features',
      reassurance: 'BPA-free • Dishwasher safe • Leak-proof cap',
      bundleName: 'Sport Edition 24oz',
      defaultSize: '24oz',
      features: [
        'Sweat-proof grip technology',
        'One-handed flip cap',
        'Drop-tested from 6ft',
        'Ergonomic carry loop'
      ]
    }
  },
  commuter: {
    name: 'Commuter',
    icon: '💼',
    description: 'Daily hydration for work and commute',
    gradient: {
      from: 'from-teal-500',
      via: 'via-teal-600',
      to: 'to-cyan-700'
    },
    colors: {
      primary: 'teal-600',
      accent: 'teal-400',
      surface: 'gray-50',
      surfaceAlt: 'white',
      text: 'gray-900',
      textMuted: 'gray-600'
    },
    copy: {
      headline: 'Your Daily Hydration, Zero Spills',
      subheadline: 'The smart bottle that fits your cup holder and your life.',
      cta: 'Make It Your Daily Bottle',
      ctaSecondary: 'View Office Colors',
      reassurance: 'Lifetime warranty • 60-day returns • Free shipping',
      bundleName: 'Daily Essential 20oz',
      defaultSize: '20oz',
      features: [
        'Fits standard cup holders',
        'No-sweat double wall',
        'Easy-clean wide mouth',
        'Silent flip cap'
      ]
    }
  },
  outdoor: {
    name: 'Outdoor',
    icon: '⛰️',
    description: 'Rugged durability for adventures',
    gradient: {
      from: 'from-green-600',
      via: 'via-emerald-600',
      to: 'to-green-800'
    },
    colors: {
      primary: 'green-700',
      accent: 'emerald-500',
      surface: 'slate-900',
      surfaceAlt: 'slate-800',
      text: 'white',
      textMuted: 'slate-300'
    },
    copy: {
      headline: 'Cold for 24h. Hot for 12h. Trail-Proof.',
      subheadline: 'The insulated bottle built for your wildest adventures.',
      cta: 'Pack It For Your Next Trip',
      ctaSecondary: 'See Durability Tests',
      reassurance: 'Lifetime dent warranty • Replaceable parts • Bear-proof tested',
      bundleName: 'Trail Master 32oz',
      defaultSize: '32oz',
      features: [
        'Steel double-wall insulation',
        'D-ring carabiner loop',
        'Bear-claw grip texture',
        'Impact-resistant base'
      ]
    }
  },
  family: {
    name: 'Family',
    icon: '👨‍👩‍👧‍👦',
    description: 'Safe and spill-proof for the whole family',
    gradient: {
      from: 'from-rose-500',
      via: 'via-pink-500',
      to: 'to-rose-600'
    },
    colors: {
      primary: 'rose-600',
      accent: 'rose-400',
      surface: 'neutral-50',
      surfaceAlt: 'white',
      text: 'neutral-900',
      textMuted: 'neutral-600'
    },
    copy: {
      headline: 'Kid-Friendly. Truly Spill-Proof.',
      subheadline: 'The safe bottle your whole family will love to use daily.',
      cta: 'Choose Your Family Set',
      ctaSecondary: 'See Safety Certifications',
      reassurance: 'BPA/BPS-free • Pediatrician reviewed • Dishwasher safe',
      bundleName: 'Family 4-Pack Mix',
      defaultSize: '16oz',
      features: [
        'Flip-lock spill-proof lid',
        'Gentle flow spout',
        'Name label band included',
        'Shatter-proof material'
      ]
    }
  }
};

// Helper to get theme classes
export function getThemeClasses(persona: WaterBottlePersona) {
  const theme = personaThemes[persona];
  return {
    gradient: `${theme.gradient.from} ${theme.gradient.via} ${theme.gradient.to}`,
    primary: `bg-${theme.colors.primary}`,
    primaryHover: `hover:bg-${theme.colors.primary}/90`,
    accent: `bg-${theme.colors.accent}`,
    text: `text-${theme.colors.text}`,
    textMuted: `text-${theme.colors.textMuted}`,
    surface: `bg-${theme.colors.surface}`,
    surfaceAlt: `bg-${theme.colors.surfaceAlt}`,
    border: `border-${theme.colors.primary}/20`,
    ring: `ring-${theme.colors.primary}/50`
  };
}

// Bottle variants (sizes and colors)
export const bottleSizes = ['16oz', '20oz', '24oz', '32oz'] as const;
export const bottleColors = [
  { name: 'Onyx', hex: '#1a1a1a', class: 'bg-gray-900' },
  { name: 'Arctic', hex: '#ffffff', class: 'bg-white' },
  { name: 'Ocean', hex: '#0891b2', class: 'bg-cyan-600' },
  { name: 'Forest', hex: '#15803d', class: 'bg-green-700' },
  { name: 'Sunset', hex: '#ea580c', class: 'bg-orange-600' },
  { name: 'Berry', hex: '#e11d48', class: 'bg-rose-600' }
] as const;

// Pricing by persona
export const personaPricing: Record<WaterBottlePersona, {
  name: string;
  price: string;
  originalPrice?: string;
  features: string[];
  popular?: boolean;
}> = {
  athlete: {
    name: 'Sport Edition',
    price: '$39',
    originalPrice: '$49',
    features: [
      '24oz capacity',
      'Performance grip',
      'Quick-flow cap',
      'Free training stickers'
    ],
    popular: true
  },
  commuter: {
    name: 'Daily Essential',
    price: '$29',
    features: [
      '20oz capacity',
      'Cup holder fit',
      'Silent cap',
      'Office-friendly colors'
    ]
  },
  outdoor: {
    name: 'Trail Master',
    price: '$49',
    originalPrice: '$59',
    features: [
      '32oz capacity',
      'Military-grade steel',
      'Carabiner loop',
      'Lifetime warranty'
    ],
    popular: true
  },
  family: {
    name: 'Family Bundle',
    price: '$89',
    originalPrice: '$120',
    features: [
      '4 bottles (mix sizes)',
      'Spill-proof lids',
      'Name labels',
      'Free color mixing'
    ]
  }
};
