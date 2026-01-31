'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Storyboard, Section } from '@/lib/storyboard';
import { WaterBottlePersona, personaThemes } from '@/lib/personas';
import { PersonaBar } from '@/components/PersonaBar';
import { SmartCTA } from '@/components/SmartCTA';
import { MetricChips } from '@/components/MetricChips';
import { Hero } from '@/components/sections/Hero';
import { Bullets } from '@/components/sections/Bullets';
import { Steps } from '@/components/sections/Steps';
import { Quotes } from '@/components/sections/Quotes';
import { Tiers } from '@/components/sections/Tiers';
import { QnA } from '@/components/sections/QnA';
import {
  trackPageView,
  trackDwellTime,
  setupScrollDepthTracking,
  setupPageUnloadTracking,
  trackCtaClick,
  trackHover
} from '@/lib/tracking';

interface StoryboardRendererProps {
  storyboard: Storyboard;
  storyId: string;
  persona: {
    detected: WaterBottlePersona;
    confidence: number;
    reasoning: string;
  };
}

export function StoryboardRenderer({
  storyboard: initialStoryboard,
  storyId,
  persona: initialPersona
}: StoryboardRendererProps) {
  const [storyboard, setStoryboard] = useState(initialStoryboard);
  const [currentPersona, setCurrentPersona] = useState(initialPersona.detected);
  const [personaConfidence, setPersonaConfidence] = useState(initialPersona.confidence);
  const [isLoading, setIsLoading] = useState(false);

  // Tracking hooks
  const dwellTimeRef = useRef<() => void>();

  useEffect(() => {
    // Initialize tracking
    trackPageView(storyId);
    dwellTimeRef.current = trackDwellTime(storyId, 'page');
    const cleanupScroll = setupScrollDepthTracking(storyId);
    const cleanupUnload = setupPageUnloadTracking(storyId);

    return () => {
      dwellTimeRef.current?.();
      cleanupScroll?.();
      cleanupUnload?.();
    };
  }, [storyId]);

  // Handle persona change
  const handlePersonaChange = async (newPersona: WaterBottlePersona) => {
    if (newPersona === currentPersona) return;

    setIsLoading(true);
    try {
      // Fetch new storyboard for the persona
      const response = await fetch(`/api/story?storyId=${storyId}&persona=${newPersona}`);
      if (response.ok) {
        const data = await response.json();
        if (data.storyboard) {
          setStoryboard(data.storyboard);
          setCurrentPersona(newPersona);
          setPersonaConfidence(0.95); // High confidence for manual selection
        }
      }
    } catch (error) {
      console.error('Error changing persona:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CTA clicks
  const handleCtaClick = (sectionKey: string, variantHash: string, ctaIndex: number, ctaText: string) => {
    trackCtaClick(storyId, sectionKey, variantHash, ctaIndex, ctaText);

    // For demo purposes, you could implement actual actions here
    console.log('CTA clicked:', { sectionKey, ctaIndex, ctaText });
  };

  // Handle section hover
  const handleSectionHover = (sectionKey: string, variantHash?: string) => {
    trackHover(storyId, sectionKey, variantHash);
  };

  // Render section based on type (section narrowed per case for correct typing)
  const renderSection = (section: Section, index: number) => {
    const common = {
      onHover: () => handleSectionHover(section.key),
      className: index % 2 === 1 ? 'bg-gray-50' : 'bg-white'
    };

    switch (section.type) {
      case 'hero':
        return (
          <Hero
            {...common}
            section={section}
            persona={currentPersona}
            onCtaClick={(ctaIndex) =>
              handleCtaClick(section.key, '', ctaIndex, section.cta[ctaIndex]?.text ?? '')
            }
          />
        );

      case 'bullets':
        return <Bullets {...common} section={section} />;

      case 'steps':
        return <Steps {...common} section={section} />;

      case 'quotes':
        return <Quotes {...common} section={section} />;

      case 'tiers':
        return (
          <Tiers
            {...common}
            section={section}
            onCtaClick={(tierIndex) =>
              handleCtaClick(section.key, '', tierIndex, section.tiers[tierIndex]?.cta ?? '')
            }
          />
        );

      case 'qna':
        return <QnA {...common} section={section} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Loading overlay */}
      {isLoading && (
        <motion.div
          className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center space-x-3 text-blue-600">
            <motion.div
              className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-lg font-medium">Updating for {currentPersona}...</span>
          </div>
        </motion.div>
      )}

      {/* Persona Bar */}
      <PersonaBar
        currentPersona={currentPersona}
        confidence={personaConfidence}
        onPersonaChange={handlePersonaChange}
        storyId={storyId}
      />

      {/* Brand Header */}
      <motion.header
        className="bg-white border-b border-gray-100 px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {storyboard.brand.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {storyboard.brand.name}
            </h1>
          </div>

          <div className="text-sm text-gray-500">
            Optimized for {currentPersona}s
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main>
        {storyboard.sections.map((section, index) => (
          <motion.div
            key={`${section.key}-${section.type}-${currentPersona}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            {renderSection(section, index)}
          </motion.div>
        ))}
      </main>

      {/* Smart CTA Dock */}
      <SmartCTA
        persona={currentPersona}
        onCtaClick={() => handleCtaClick('smart-cta', '', 0, personaThemes[currentPersona].copy.cta)}
      />

      {/* Footer with Metrics */}
      <motion.footer
        className="bg-gray-900 text-white py-12 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Metric Chips */}
          <div className="mb-8">
            <MetricChips persona={currentPersona} />
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">{storyboard.brand.name}</h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              {personaThemes[currentPersona].copy.reassurance}
            </p>
            <div className="text-sm text-gray-500">
              Trusted by thousands of {currentPersona === 'athlete' ? 'athletes' :
                                       currentPersona === 'commuter' ? 'daily commuters' :
                                       currentPersona === 'outdoor' ? 'adventurers' : 'families'}
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
