'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { HeroSection } from '@/lib/storyboard';
import { WaterBottlePersona, personaThemes, bottleSizes, bottleColors, getThemeClasses } from '@/lib/personas';

interface HeroProps {
  section: HeroSection;
  persona: WaterBottlePersona;
  onCtaClick?: (ctaIndex: number) => void;
  onHover?: () => void;
  className?: string;
}

export function Hero({ section, persona, onCtaClick, onHover, className = '' }: HeroProps) {
  const { headline, sub, cta, demoIdea } = section;
  const theme = personaThemes[persona];
  const themeClasses = getThemeClasses(persona);

  // Variant state
  const [selectedSize, setSelectedSize] = useState(theme.copy.defaultSize);
  const [selectedColor, setSelectedColor] = useState<typeof bottleColors[number]>(bottleColors[0]);

  return (
    <motion.section
      className={`relative min-h-[90vh] overflow-hidden ${className}`}
      onMouseEnter={onHover}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background gradient with noise */}
      <div className={`absolute inset-0 bg-gradient-to-br ${themeClasses.gradient}`}>
        <div className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.03'%3E%3Cpolygon fill='%23000' points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.h1
              className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${
                theme.colors.surface === 'gray-50' ? 'text-gray-900' : 'text-white'
              }`}
              key={headline}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {headline || theme.copy.headline}
            </motion.h1>

            <motion.p
              className={`text-xl md:text-2xl mb-8 ${
                theme.colors.surface === 'gray-50' ? 'text-gray-700' : 'text-neutral-200'
              }`}
              key={sub}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {sub || theme.copy.subheadline}
            </motion.p>

            {/* Variant Picker */}
            <motion.div
              className="mb-8 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Size selector */}
              <div>
                <label className={`text-sm font-medium mb-2 block ${
                  theme.colors.surface === 'gray-50' ? 'text-gray-700' : 'text-neutral-300'
                }`}>
                  Size
                </label>
                <div className="flex gap-2">
                  {bottleSizes.map(size => (
                    <motion.button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedSize === size
                          ? `bg-${theme.colors.primary} text-white`
                          : `bg-white/10 backdrop-blur-sm border border-white/20 ${
                              theme.colors.surface === 'gray-50' ? 'text-gray-700' : 'text-white'
                            } hover:bg-white/20`
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {size}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Color selector */}
              <div>
                <label className={`text-sm font-medium mb-2 block ${
                  theme.colors.surface === 'gray-50' ? 'text-gray-700' : 'text-neutral-300'
                }`}>
                  Color
                </label>
                <div className="flex gap-2">
                  {bottleColors.map(color => (
                    <motion.button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`w-12 h-12 rounded-lg border-2 transition-all ${
                        selectedColor.name === color.name
                          ? 'border-white shadow-lg scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {(cta.length > 0 ? cta : [
                { text: theme.copy.cta, goal: 'purchase' },
                { text: theme.copy.ctaSecondary, goal: 'learn' }
              ]).map((button, index) => (
                <motion.button
                  key={`${button.text}-${index}`}
                  onClick={() => onCtaClick?.(index)}
                  className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all backdrop-blur-sm ${
                    index === 0
                      ? `bg-${theme.colors.primary} text-white hover:bg-${theme.colors.primary}/90 shadow-xl`
                      : `bg-white/10 border border-white/20 ${
                          theme.colors.surface === 'gray-50' ? 'text-gray-900' : 'text-white'
                        } hover:bg-white/20`
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {button.text}
                </motion.button>
              ))}
            </motion.div>

            {/* Reassurance */}
            <motion.p
              className={`mt-6 text-sm ${
                theme.colors.surface === 'gray-50' ? 'text-gray-600' : 'text-neutral-400'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {theme.copy.reassurance}
            </motion.p>
          </motion.div>

          {/* Product visualization */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Glass card backdrop */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-3xl" />

            {/* Bottle mockup placeholder */}
            <div className="relative p-12">
              <motion.div
                className="w-64 h-96 mx-auto rounded-3xl shadow-2xl flex items-center justify-center"
                style={{ backgroundColor: selectedColor.hex }}
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="text-white/20 text-6xl font-bold">
                  {selectedSize}
                </div>
              </motion.div>

              {/* Feature badges */}
              <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-2">
                {theme.copy.features.slice(0, 3).map((feature, i) => (
                  <motion.div
                    key={feature}
                    className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-gray-900"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    {feature}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className={`w-6 h-10 border-2 rounded-full flex justify-center ${
          theme.colors.surface === 'gray-50' ? 'border-gray-400' : 'border-white/40'
        }`}>
          <motion.div
            className={`w-1 h-3 rounded-full mt-2 ${
              theme.colors.surface === 'gray-50' ? 'bg-gray-400' : 'bg-white/60'
            }`}
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </motion.section>
  );
}
