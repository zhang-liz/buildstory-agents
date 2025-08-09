'use client';

import { motion } from 'framer-motion';
import { QuotesSection } from '@/lib/storyboard';

interface QuotesProps {
  section: QuotesSection;
  onHover?: () => void;
  className?: string;
}

export function Quotes({ section, onHover, className = '' }: QuotesProps) {
  const { quotes } = section;

  return (
    <motion.section
      className={`py-16 px-6 bg-gray-50 ${className}`}
      onMouseEnter={onHover}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {quotes.map((quote, index) => (
            <motion.div
              key={`${quote.text}-${index}`}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              whileHover={{ y: -5 }}
            >
              <div className="mb-4">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 32 32"
                >
                  <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14h-4c0-2.2 1.8-4 4-4V8zm12 0c-3.3 0-6 2.7-6 6v10h10V14h-4c0-2.2 1.8-4 4-4V8z" />
                </svg>
              </div>

              <motion.blockquote
                className="text-gray-700 mb-4 leading-relaxed"
                key={quote.text} // Re-animate when content changes
              >
                &ldquo;{quote.text}&rdquo;
              </motion.blockquote>

              <motion.footer
                className="flex items-center"
                key={quote.role} // Re-animate when content changes
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-semibold text-sm">
                    {quote.role.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <cite className="text-sm font-semibold text-gray-900 not-italic">
                    {quote.role}
                  </cite>
                </div>
              </motion.footer>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
