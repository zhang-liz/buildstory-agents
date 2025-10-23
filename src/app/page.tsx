'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    brief: 'Premium insulated water bottle designed for active lifestyles. Features double-wall vacuum insulation, leak-proof cap, and ergonomic design.',
    tone: 'professional',
    brandName: 'HydroFlow',
    palette: '#059669'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const palette = [formData.palette, '#15803d', '#0d9488']; // Generate palette from selected color

      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: formData.brief,
          tone: formData.tone,
          brandName: formData.brandName || 'HydroFlow',
          palette
        })
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/s/${data.storyId}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating story:', error);
      alert('Failed to create story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toneOptions = [
    { value: 'professional', label: 'Professional', description: 'Clean, trustworthy' },
    { value: 'friendly', label: 'Friendly', description: 'Approachable, warm' },
    { value: 'bold', label: 'Bold', description: 'Energetic, confident' },
    { value: 'premium', label: 'Premium', description: 'Sophisticated, quality' }
  ];

  const colorOptions = [
    { value: '#059669', label: 'Emerald', bg: 'bg-emerald-600' },
    { value: '#0d9488', label: 'Teal', bg: 'bg-teal-600' },
    { value: '#d97706', label: 'Amber', bg: 'bg-amber-600' },
    { value: '#e11d48', label: 'Rose', bg: 'bg-rose-600' },
    { value: '#15803d', label: 'Green', bg: 'bg-green-700' },
    { value: '#0891b2', label: 'Cyan', bg: 'bg-cyan-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <motion.header
        className="bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            HydroFlow<span className="text-emerald-600">.AI</span>
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered landing pages that adapt to each water bottle buyer persona
          </p>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section
        className="py-20 px-6 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Landing Pages That Know Your
            <span className="text-emerald-600"> Water Bottle Buyers</span>
          </h2>

          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Our AI agents instantly detect if visitors are athletes, commuters, outdoor enthusiasts,
            or families—then adapt the entire page to match their needs and boost conversions.
          </p>

          {/* Persona Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: '🏃',
                title: 'Athletes',
                description: 'Performance-focused messaging, training features, endurance benefits'
              },
              {
                icon: '💼',
                title: 'Commuters',
                description: 'Daily convenience, office-friendly, cup holder compatibility'
              },
              {
                icon: '⛰️',
                title: 'Outdoor',
                description: 'Durability emphasis, insulation stats, adventure-ready features'
              },
              {
                icon: '👨‍👩‍👧‍👦',
                title: 'Families',
                description: 'Safety certifications, spill-proof design, kid-friendly options'
              }
            ].map((persona, index) => (
              <motion.div
                key={persona.title}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              >
                <div className="text-3xl mb-4">{persona.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{persona.title}</h3>
                <p className="text-gray-600 text-sm">{persona.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Feature Points */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="text-emerald-500">✓</span>
              <span>Real-time persona detection</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="text-emerald-500">✓</span>
              <span>Dynamic copy adaptation</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="text-emerald-500">✓</span>
              <span>A/B testing built-in</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="text-emerald-500">✓</span>
              <span>Conversion optimization</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Form Section */}
      <motion.section
        className="py-16 px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Generate Your AI-Optimized Water Bottle Landing Page
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Brief */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.brief}
                  onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                  placeholder="Describe your water bottle's key features and benefits..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  rows={4}
                  required
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.brief.length}/500 characters
                </p>
              </div>

              {/* Brand Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  placeholder="HydroFlow"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Brand Voice
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {toneOptions.map((tone) => (
                    <label
                      key={tone.value}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.tone === tone.value
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tone"
                        value={tone.value}
                        checked={formData.tone === tone.value}
                        onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                        className="sr-only"
                      />
                      <div className="font-medium text-gray-900">{tone.label}</div>
                      <div className="text-sm text-gray-600">{tone.description}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Primary Brand Color
                </label>
                <div className="flex space-x-3">
                  {colorOptions.map((color) => (
                    <label
                      key={color.value}
                      className={`w-12 h-12 rounded-lg cursor-pointer transition-all ${
                        color.bg
                      } ${
                        formData.palette === color.value
                          ? 'ring-4 ring-offset-2 ring-gray-400'
                          : 'hover:scale-110'
                      }`}
                    >
                      <input
                        type="radio"
                        name="palette"
                        value={color.value}
                        checked={formData.palette === color.value}
                        onChange={(e) => setFormData({ ...formData, palette: e.target.value })}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading || !formData.brief.trim()}
                className="w-full bg-emerald-600 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <motion.div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Creating Your Water Bottle Landing Page...</span>
                  </div>
                ) : (
                  'Generate Landing Page'
                )}
              </motion.button>
            </form>

            {/* Demo Note */}
            <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-emerald-800 text-center">
                <strong>Try it:</strong> Visit your generated page from different devices or with UTM parameters
                like ?utm_source=fitness to see persona adaptation in action!
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        className="py-16 px-6 bg-white/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">AI Detects Visitor</h4>
              <p className="text-gray-600 text-sm">
                Our PersonaAgent analyzes UTM params, device, time, and behavior to identify buyer type
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Content Adapts</h4>
              <p className="text-gray-600 text-sm">
                Headlines, features, testimonials, and CTAs instantly morph to match persona needs
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Conversion Optimizes</h4>
              <p className="text-gray-600 text-sm">
                Multi-armed bandit testing continuously improves each persona's experience
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-lg font-semibold mb-4">HydroFlow.AI</h3>
          <p className="text-gray-400 mb-6">
            AI-powered landing pages for water bottle brands
          </p>
          <div className="text-sm text-gray-500">
            Built with Next.js, TypeScript, and AI • Powered by Multi-Agent Systems
          </div>
        </div>
      </footer>
    </div>
  );
}
