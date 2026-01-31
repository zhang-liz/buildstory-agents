import { describe, it, expect } from 'vitest';
import {
  personaThemes,
  getThemeClasses,
  bottleSizes,
  bottleColors,
  personaPricing,
  type WaterBottlePersona,
} from '../personas';

const personas: WaterBottlePersona[] = ['athlete', 'commuter', 'outdoor', 'family'];

describe('Personas', () => {
  describe('personaThemes', () => {
    it('should have a theme for each persona', () => {
      for (const p of personas) {
        expect(personaThemes[p]).toBeDefined();
        expect(personaThemes[p].name).toBeTruthy();
        expect(personaThemes[p].icon).toBeTruthy();
        expect(personaThemes[p].description).toBeTruthy();
      }
    });

    it('each theme should have gradient, colors, and copy', () => {
      for (const p of personas) {
        const theme = personaThemes[p];
        expect(theme.gradient).toEqual(
          expect.objectContaining({ from: expect.any(String), via: expect.any(String), to: expect.any(String) })
        );
        expect(theme.colors).toEqual(
          expect.objectContaining({
            primary: expect.any(String),
            accent: expect.any(String),
            surface: expect.any(String),
            text: expect.any(String),
          })
        );
        expect(theme.copy).toEqual(
          expect.objectContaining({
            headline: expect.any(String),
            subheadline: expect.any(String),
            cta: expect.any(String),
            features: expect.any(Array),
          })
        );
      }
    });

    it('athlete theme should have expected copy', () => {
      expect(personaThemes.athlete.copy.headline).toContain('Hydrate');
      expect(personaThemes.athlete.copy.features.length).toBeGreaterThan(0);
    });
  });

  describe('getThemeClasses', () => {
    it('should return gradient and color class strings for each persona', () => {
      for (const p of personas) {
        const classes = getThemeClasses(p);
        expect(classes.gradient).toBeTruthy();
        expect(classes.primary).toMatch(/^bg-/);
        expect(classes.text).toMatch(/^text-/);
        expect(classes.surface).toMatch(/^bg-/);
        expect(classes.border).toMatch(/^border-/);
        expect(classes.ring).toMatch(/^ring-/);
      }
    });

    it('should return different gradient for athlete vs family', () => {
      const athlete = getThemeClasses('athlete');
      const family = getThemeClasses('family');
      expect(athlete.gradient).not.toBe(family.gradient);
    });
  });

  describe('bottleSizes', () => {
    it('should include expected sizes', () => {
      expect(bottleSizes).toContain('16oz');
      expect(bottleSizes).toContain('24oz');
      expect(bottleSizes).toContain('32oz');
    });

    it('should have at least 4 sizes', () => {
      expect(bottleSizes.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('bottleColors', () => {
    it('should have name, hex, and class for each color', () => {
      for (const c of bottleColors) {
        expect(c.name).toBeTruthy();
        expect(c.hex).toMatch(/^#[a-fA-F0-9]{6}$/);
        expect(c.class).toMatch(/^bg-/);
      }
    });
  });

  describe('personaPricing', () => {
    it('should have pricing for each persona', () => {
      for (const p of personas) {
        const pricing = personaPricing[p];
        expect(pricing).toBeDefined();
        expect(pricing.name).toBeTruthy();
        expect(pricing.price).toBeTruthy();
        expect(Array.isArray(pricing.features)).toBe(true);
      }
    });

    it('popular flag should be boolean when present', () => {
      for (const p of personas) {
        const pricing = personaPricing[p];
        if ('popular' in pricing && pricing.popular !== undefined) {
          expect(typeof pricing.popular).toBe('boolean');
        }
      }
    });
  });
});
