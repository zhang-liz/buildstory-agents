'use client';

import { motion } from 'framer-motion';
import { TiersSection } from '@/lib/storyboard';

interface TiersProps {
  section: TiersSection;
  onCtaClick?: (tierIndex: number) => void;
  onHover?: () => void;
  className?: string;
}

export function Tiers({ section, onCtaClick, onHover, className = '' }: TiersProps) {
  const { tiers } = section;

  return (
    <motion.section
      className={`py-16 px-6 ${className}`}
      onMouseEnter={onHover}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className={`grid gap-8 ${
            tiers.length === 2 ? 'md:grid-cols-2' :
            tiers.length === 3 ? 'md:grid-cols-3' :
            'md:grid-cols-2 lg:grid-cols-4'
          } justify-center`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {tiers.map((tier, index) => {
            const isPopular = index === 1 && tiers.length === 3; // Middle tier is popular

            return (
              <motion.div
                key={`${tier.name}-${index}`}
                className={`relative p-8 rounded-xl border-2 transition-all duration-200 ${
                  isPopular
                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                {isPopular && (
                  <motion.div
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Popular
                    </span>
                  </motion.div>
                )}

                <div className="text-center">
                  <motion.h3
                    className="text-xl font-bold text-gray-900 mb-2"
                    key={tier.name} // Re-animate when content changes
                  >
                    {tier.name}
                  </motion.h3>

                  <motion.div
                    className="mb-6"
                    key={tier.price} // Re-animate when content changes
                  >
                    <span className="text-3xl font-bold text-gray-900">
                      {tier.price}
                    </span>
                  </motion.div>

                  <motion.ul
                    className="space-y-3 mb-8 text-left"
                    key={tier.features.join(',')} // Re-animate when features change
                  >
                    {tier.features.map((feature, featureIndex) => (
                      <motion.li
                        key={`${feature}-${featureIndex}`}
                        className="flex items-start space-x-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index * 0.1) + (featureIndex * 0.05) }}
                      >
                        <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </motion.li>
                    ))}
                  </motion.ul>

                  <motion.button
                    onClick={() => onCtaClick?.(index)}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                      isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={tier.cta} // Re-animate when CTA changes
                  >
                    {tier.cta}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
