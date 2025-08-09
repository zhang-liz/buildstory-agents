'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { QnASection } from '@/lib/storyboard';

interface QnAProps {
  section: QnASection;
  onHover?: () => void;
  className?: string;
}

export function QnA({ section, onHover, className = '' }: QnAProps) {
  const { qna } = section;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <motion.section
      className={`py-16 px-6 bg-gray-50 ${className}`}
      onMouseEnter={onHover}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {qna.map(([question, answer], index) => (
            <motion.div
              key={`${question}-${index}`}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <motion.button
                onClick={() => toggleQuestion(index)}
                className="w-full px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 transition-colors"
                whileHover={{ x: 5 }}
              >
                <div className="flex items-center justify-between">
                  <motion.h3
                    className="text-lg font-semibold text-gray-900 pr-4"
                    key={question} // Re-animate when content changes
                  >
                    {question}
                  </motion.h3>

                  <motion.div
                    className="flex-shrink-0"
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </motion.div>
                </div>
              </motion.button>

              <motion.div
                initial={false}
                animate={{
                  height: openIndex === index ? 'auto' : 0,
                  opacity: openIndex === index ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <motion.div
                  className="px-6 pb-4"
                  key={answer} // Re-animate when content changes
                >
                  <p className="text-gray-700 leading-relaxed">{answer}</p>
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
