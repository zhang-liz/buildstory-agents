'use client';

import { motion } from 'framer-motion';
import { StepsSection } from '@/lib/storyboard';

interface StepsProps {
  section: StepsSection;
  onHover?: () => void;
  className?: string;
}

export function Steps({ section, onHover, className = '' }: StepsProps) {
  const { items } = section;

  return (
    <motion.section
      className={`py-16 px-6 ${className}`}
      onMouseEnter={onHover}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {items.map((item, index) => (
            <motion.div
              key={`${item}-${index}`}
              className="flex items-start space-x-4 p-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.02, x: 10 }}
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-semibold text-lg">{item}</p>
                {index < items.length - 1 && (
                  <motion.div
                    className="mt-4 w-8 h-8 text-blue-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (index * 0.2) + 0.3 }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                    </svg>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
