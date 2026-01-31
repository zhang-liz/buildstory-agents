'use client';

import { WaterBottlePersona } from './personas';

export interface TrackingEvent {
  storyId: string;
  sectionKey: string;
  variantHash?: string;
  event: 'view' | 'dwell' | 'hover' | 'scrollDepth' | 'ctaClick' | 'pollPersona' | 'bounce' | 'conversion' | 'engagement';
  meta?: Record<string, unknown>;
}

// Track single event
export function track(event: TrackingEvent): void {
  try {
    // Use sendBeacon for reliable tracking even on page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', JSON.stringify(event));
    } else {
      // Fallback to fetch for older browsers
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true
      }).catch(console.error);
    }
  } catch (error) {
    console.error('Tracking error:', error);
  }
}

// Track multiple events in batch
export function trackBatch(events: TrackingEvent[]): void {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true
    }).catch(console.error);
  } catch (error) {
    console.error('Batch tracking error:', error);
  }
}

// Track page view
export function trackPageView(storyId: string) {
  if (typeof window === 'undefined') return;

  track({
    storyId,
    sectionKey: 'page',
    event: 'view',
    meta: {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    }
  });
}

// Track dwell time
export function trackDwellTime(storyId: string, sectionKey: string, variantHash?: string) {
  if (typeof window === 'undefined') return () => {};

  const startTime = Date.now();

  return () => {
    const dwellTime = Date.now() - startTime;
    if (dwellTime > 1000) { // Only track if user stayed for more than 1 second
      track({
        storyId,
        sectionKey,
        variantHash,
        event: 'dwell',
        meta: { duration: dwellTime }
      });
    }
  };
}

// Track scroll depth
export function setupScrollDepthTracking(storyId: string, threshold: number = 25) {
  if (typeof window === 'undefined') return;

  let maxScrollDepth = 0;
  let lastReported = 0;

  const handleScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;

      // Report at thresholds (25%, 50%, 75%, 90%)
      const thresholds = [25, 50, 75, 90];
      for (const thresh of thresholds) {
        if (scrollPercent >= thresh && lastReported < thresh) {
          lastReported = thresh;
          track({
            storyId,
            sectionKey: 'page',
            event: 'scrollDepth',
            meta: { depth: thresh }
          });
          break;
        }
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => window.removeEventListener('scroll', handleScroll);
}

// Track CTA clicks
export function trackCtaClick(
  storyId: string,
  sectionKey: string,
  variantHash: string,
  ctaIndex: number,
  ctaText: string
): void {
  track({
    storyId,
    sectionKey,
    variantHash,
    event: 'ctaClick',
    meta: {
      ctaIndex,
      ctaText,
      timestamp: Date.now()
    }
  });
}

// Track hover events
export function trackHover(
  storyId: string,
  sectionKey: string,
  variantHash?: string
): void {
  track({
    storyId,
    sectionKey,
    variantHash,
    event: 'hover',
    meta: { timestamp: Date.now() }
  });
}

// Track engagement (complex interactions)
export function trackEngagement(
  storyId: string,
  sectionKey: string,
  variantHash: string,
  engagementType: string,
  metadata?: Record<string, unknown>
): void {
  track({
    storyId,
    sectionKey,
    variantHash,
    event: 'engagement',
    meta: {
      type: engagementType,
      timestamp: Date.now(),
      ...metadata
    }
  });
}

// Track page unload (bounce detection)
export function setupPageUnloadTracking(storyId: string) {
  if (typeof window === 'undefined') return;

  const startTime = Date.now();

  const handleUnload = () => {
    const sessionTime = Date.now() - startTime;

    // Consider it a bounce if user leaves within 30 seconds without meaningful interaction
    if (sessionTime < 30000) {
      track({
        storyId,
        sectionKey: 'page',
        event: 'bounce',
        meta: { sessionTime }
      });
    }
  };

  window.addEventListener('beforeunload', handleUnload);

  return () => window.removeEventListener('beforeunload', handleUnload);
}

// Utility to get current scroll position
export function getCurrentScrollDepth(): number {
  if (typeof window === 'undefined') return 0;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  return Math.round((scrollTop / docHeight) * 100);
}

// Utility to check if element is in viewport
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Advanced tracking for intersection observer
export function useIntersectionTracking(
  storyId: string,
  sectionKey: string,
  variantHash?: string,
  threshold: number = 0.5
) {
  if (typeof window === 'undefined') return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          track({
            storyId,
            sectionKey,
            variantHash,
            event: 'view',
            meta: {
              intersectionRatio: entry.intersectionRatio,
              timestamp: Date.now()
            }
          });
        }
      });
    },
    { threshold }
  );

  return (element: HTMLElement | null) => {
    if (element) {
      observer.observe(element);
      return () => observer.unobserve(element);
    }
    return () => {};
  };
}
