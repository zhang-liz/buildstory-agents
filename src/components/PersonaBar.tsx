'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { WaterBottlePersona, personaThemes } from '@/lib/personas';

interface PersonaBarProps {
  currentPersona: WaterBottlePersona;
  confidence: number;
  onPersonaChange: (persona: WaterBottlePersona) => void;
  storyId: string;
  className?: string;
}

export function PersonaBar({
  currentPersona,
  confidence,
  onPersonaChange,
  storyId,
  className = ''
}: PersonaBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const currentTheme = personaThemes[currentPersona];

  const handlePersonaClick = async (persona: WaterBottlePersona) => {
    if (persona === currentPersona) return;

    setIsPolling(true);

    try {
      // Track persona poll event
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          sectionKey: 'persona-bar',
          event: 'pollPersona',
          meta: { selectedPersona: persona, previousPersona: currentPersona }
        })
      });

      onPersonaChange(persona);
    } catch (error) {
      console.error('Error tracking persona change:', error);
      // Still change persona even if tracking fails
      onPersonaChange(persona);
    } finally {
      setIsPolling(false);
      setIsExpanded(false);
    }
  };

  const confidenceColor = confidence > 0.8 ? 'text-green-500' :
                         confidence > 0.6 ? 'text-yellow-500' : 'text-orange-500';

  return (
    <motion.div
      className={`fixed top-4 right-4 z-50 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
        layout
      >
        {/* Current Persona Display */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-4 flex items-center space-x-3 hover:bg-white/5 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="text-2xl">{currentTheme.icon}</div>
          <div className="flex-1 text-left">
            <div className="font-bold text-gray-900">
              {currentTheme.name}
            </div>
            <div className={`text-xs ${confidenceColor} font-medium`}>
              {(confidence * 100).toFixed(0)}% match
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.button>

        {/* Persona Selection */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-white/10"
            >
              <div className="p-3 space-y-1">
                <div className="text-xs text-gray-600 px-3 py-2 font-semibold uppercase tracking-wide">
                  Choose your profile
                </div>

                {(Object.keys(personaThemes) as WaterBottlePersona[]).map((persona) => {
                  const theme = personaThemes[persona];
                  const isActive = persona === currentPersona;

                  return (
                    <motion.button
                      key={persona}
                      onClick={() => handlePersonaClick(persona)}
                      disabled={isPolling || isActive}
                      className={`w-full px-3 py-3 rounded-xl flex items-center space-x-3 text-left transition-all ${
                        isActive
                          ? `bg-${theme.colors.primary}/20 border-2 border-${theme.colors.primary}/50 cursor-default`
                          : `hover:bg-white/10 border-2 border-transparent`
                      } ${isPolling ? 'opacity-50 cursor-not-allowed' : ''}`}
                      whileHover={!isActive ? { x: 4 } : {}}
                      whileTap={!isActive ? { scale: 0.98 } : {}}
                    >
                      <span className="text-2xl">{theme.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {theme.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {theme.description}
                        </div>
                      </div>
                      {isActive && (
                        <motion.div
                          className={`w-2 h-2 bg-${theme.colors.primary} rounded-full`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', damping: 15 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isPolling && (
          <motion.div
            className="absolute inset-0 bg-white/90 backdrop-blur flex items-center justify-center rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center space-x-2">
              <motion.div
                className={`w-5 h-5 border-2 border-${currentTheme.colors.primary} border-t-transparent rounded-full`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-sm font-semibold text-gray-900">Updating...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
