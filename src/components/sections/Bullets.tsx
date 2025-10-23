'use client';

import { motion } from 'framer-motion';
import { BulletsSection } from '@/lib/storyboard';

interface BulletsProps {
  section: BulletsSection;
  onHover?: () => void;
  className?: string;
}

export function Bullets({ section, onHover, className = '' }: BulletsProps) {
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
          className="grid md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {items.map((item, index) => (
            <motion.div
              key={`${item}-${index}`}
              className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-6 h-6 rounded-full bg-red-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                <span className="text-white text-sm">✕</span>
              </div>
              <p className="text-gray-700 font-medium">{item}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
