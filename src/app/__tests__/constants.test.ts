import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BRIEF,
  TONE_OPTIONS,
  COLOR_OPTIONS,
  PERSONA_CARDS,
  DEFAULT_BRAND_NAME,
  PALETTE_EXTRA,
} from '../constants';

describe('Constants', () => {
  describe('DEFAULT_BRIEF', () => {
    it('should be a non-empty string', () => {
      expect(typeof DEFAULT_BRIEF).toBe('string');
      expect(DEFAULT_BRIEF.length).toBeGreaterThan(0);
    });

    it('should mention water bottle', () => {
      expect(DEFAULT_BRIEF.toLowerCase()).toContain('water bottle');
    });
  });

  describe('TONE_OPTIONS', () => {
    it('should have value, label, and description for each option', () => {
      for (const opt of TONE_OPTIONS) {
        expect(opt.value).toBeTruthy();
        expect(opt.label).toBeTruthy();
        expect(opt.description).toBeTruthy();
      }
    });

    it('should include expected tone values', () => {
      const values = TONE_OPTIONS.map((o) => o.value);
      expect(values).toContain('professional');
      expect(values).toContain('friendly');
      expect(values).toContain('bold');
      expect(values).toContain('premium');
    });
  });

  describe('COLOR_OPTIONS', () => {
    it('should have value (hex), label, and bg for each option', () => {
      for (const opt of COLOR_OPTIONS) {
        expect(opt.value).toMatch(/^#[a-fA-F0-9]{6}$/);
        expect(opt.label).toBeTruthy();
        expect(opt.bg).toMatch(/^bg-/);
      }
    });
  });

  describe('PERSONA_CARDS', () => {
    it('should have icon, title, and description for each card', () => {
      expect(PERSONA_CARDS.length).toBe(4);
      for (const card of PERSONA_CARDS) {
        expect(card.icon).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.description).toBeTruthy();
      }
    });

    it('should include Athletes, Commuters, Outdoor, Families', () => {
      const titles = PERSONA_CARDS.map((c) => c.title);
      expect(titles).toContain('Athletes');
      expect(titles).toContain('Commuters');
      expect(titles).toContain('Outdoor');
      expect(titles).toContain('Families');
    });
  });

  describe('DEFAULT_BRAND_NAME', () => {
    it('should be a non-empty string', () => {
      expect(typeof DEFAULT_BRAND_NAME).toBe('string');
      expect(DEFAULT_BRAND_NAME.length).toBeGreaterThan(0);
    });
  });

  describe('PALETTE_EXTRA', () => {
    it('should be an array of hex colors', () => {
      expect(Array.isArray(PALETTE_EXTRA)).toBe(true);
      for (const hex of PALETTE_EXTRA) {
        expect(hex).toMatch(/^#[a-fA-F0-9]{6}$/);
      }
    });
  });
});
