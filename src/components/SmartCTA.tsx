'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { WaterBottlePersona, personaThemes, getThemeClasses } from '@/lib/personas';

interface SmartCTAProps {
  persona: WaterBottlePersona;
  onCtaClick: () => void;
  threshold?: number; // Scroll percentage to show
}

export function SmartCTA({ persona, onCtaClick, threshold = 30 }: SmartCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const theme = personaThemes[persona];
  const themeClasses = getThemeClasses(persona);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setIsVisible(scrollPercent > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-0 inset-x-0 z-40 p-4 sm:p-6"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="relative overflow-hidden rounded-2xl shadow-2xl"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              {/* Glass background */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />

              {/* Gradient accent */}
              <div className={`absolute inset-0 bg-gradient-to-r ${themeClasses.gradient} opacity-90`} />

              {/* Content */}
              <div className="relative px-6 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <motion.h3
                    className="text-lg sm:text-xl font-bold text-white mb-1"
                    key={`${persona}-headline`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {getSmartHeadline(persona)}
                  </motion.h3>
                  <motion.p
                    className="text-sm text-white/90"
                    key={`${persona}-reassurance`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {theme.copy.reassurance}
                  </motion.p>
                </div>

                <motion.button
                  onClick={onCtaClick}
                  className="px-8 py-3 bg-white text-gray-900 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {theme.copy.cta}
                </motion.button>
              </div>

              {/* Animated background effect */}
              <motion.div
                className="absolute inset-0 opacity-30"
                animate={{
                  background: [
                    'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                    'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                    'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getSmartHeadline(persona: WaterBottlePersona): string {
  const headlines = {
    athlete: "Ready to upgrade your training hydration?",
    commuter: "Your perfect daily bottle is waiting",
    outdoor: "Built for your next adventure",
    family: "The safe choice for your family"
  };
  return headlines[persona];
}
