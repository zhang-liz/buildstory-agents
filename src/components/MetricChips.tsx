'use client';

import { motion } from 'framer-motion';
import { WaterBottlePersona, personaThemes } from '@/lib/personas';

interface Metric {
  label: string;
  value: string;
  highlight?: boolean;
}

interface MetricChipsProps {
  persona: WaterBottlePersona;
  metrics?: Metric[];
  className?: string;
}

export function MetricChips({ persona, metrics, className = '' }: MetricChipsProps) {
  const theme = personaThemes[persona];

  // Default metrics based on persona
  const defaultMetrics = getPersonaMetrics(persona);
  const displayMetrics = metrics || defaultMetrics;

  return (
    <div className={`flex flex-wrap gap-3 justify-center ${className}`}>
      {displayMetrics.map((metric, index) => (
        <motion.div
          key={`${metric.label}-${index}`}
          className={`px-4 py-2 rounded-full backdrop-blur-sm ${
            metric.highlight
              ? `bg-${theme.colors.primary} text-white`
              : `bg-white/10 border border-white/20 ${
                  theme.colors.surface === 'gray-50' ? 'text-gray-700' : 'text-white'
                }`
          }`}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: index * 0.1, type: 'spring', damping: 15 }}
          whileHover={{ scale: 1.05 }}
        >
          <span className="font-bold mr-2">{metric.value}</span>
          <span className="opacity-90 text-sm">{metric.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function getPersonaMetrics(persona: WaterBottlePersona): Metric[] {
  const metricsByPersona: Record<WaterBottlePersona, Metric[]> = {
    athlete: [
      { label: 'Cold', value: '24h', highlight: true },
      { label: 'Drop-tested', value: '6ft' },
      { label: 'Athletes trust us', value: '10K+' },
      { label: 'Hydration zones', value: '3' }
    ],
    commuter: [
      { label: 'Leak-tested', value: '1000x', highlight: true },
      { label: 'Daily users', value: '50K+' },
      { label: 'Cup holder fit', value: '✓' },
      { label: 'Silent cap', value: '✓' }
    ],
    outdoor: [
      { label: 'Insulated', value: '24h/12h', highlight: true },
      { label: 'Trail-tested', value: '500+' },
      { label: 'Bear-proof', value: '✓' },
      { label: 'Lifetime warranty', value: '✓' }
    ],
    family: [
      { label: 'BPA-free', value: '100%', highlight: true },
      { label: 'Spill tests passed', value: '2000+' },
      { label: 'Happy families', value: '25K+' },
      { label: 'Kid-approved', value: '✓' }
    ]
  };

  return metricsByPersona[persona];
}
