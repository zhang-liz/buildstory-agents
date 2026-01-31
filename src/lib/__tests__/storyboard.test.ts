import { describe, it, expect } from 'vitest';
import {
  parseStoryboard,
  parseSection,
  generateVariantHash,
  StoryboardSchema,
  SectionSchema,
  type HeroSection,
  type BulletsSection,
} from '../storyboard';

const validHeroSection: HeroSection = {
  key: 'hero',
  type: 'hero',
  headline: 'Test Headline',
  sub: 'Test subheadline',
  cta: [{ text: 'Get Started', goal: 'signup' }],
  demoIdea: 'Demo idea',
};

const validBulletsSection: BulletsSection = {
  key: 'bullets',
  type: 'bullets',
  items: ['Item 1', 'Item 2'],
};

describe('Storyboard', () => {
  describe('parseStoryboard', () => {
    it('should parse a valid storyboard', () => {
      const json = {
        version: 1,
        brand: {
          name: 'TestBrand',
          tone: 'friendly',
          palette: ['#059669', '#0d9488'],
          logoAlt: 'Test logo',
        },
        persona: 'athlete',
        sections: [validHeroSection, validBulletsSection],
      };

      const result = parseStoryboard(json);
      expect(result.version).toBe(1);
      expect(result.brand.name).toBe('TestBrand');
      expect(result.persona).toBe('athlete');
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].type).toBe('hero');
      expect(result.sections[1].type).toBe('bullets');
    });

    it('should reject invalid version', () => {
      const json = {
        version: 2,
        brand: { name: 'X', tone: 'x', palette: [], logoAlt: 'x' },
        persona: 'athlete',
        sections: [],
      };
      expect(() => parseStoryboard(json)).toThrow();
    });

    it('should reject missing required brand fields', () => {
      const json = {
        version: 1,
        brand: { name: 'X' },
        persona: 'athlete',
        sections: [],
      };
      expect(() => parseStoryboard(json)).toThrow();
    });

    it('should reject invalid persona', () => {
      const json = {
        version: 1,
        brand: { name: 'X', tone: 'x', palette: [], logoAlt: 'x' },
        persona: 'invalid',
        sections: [],
      };
      expect(() => parseStoryboard(json)).toThrow();
    });
  });

  describe('parseSection', () => {
    it('should parse hero section', () => {
      const result = parseSection(validHeroSection);
      expect(result.type).toBe('hero');
      expect(result.key).toBe('hero');
      if (result.type === 'hero') {
        expect(result.headline).toBe('Test Headline');
        expect(result.cta).toHaveLength(1);
      }
    });

    it('should parse bullets section', () => {
      const result = parseSection(validBulletsSection);
      expect(result.type).toBe('bullets');
      if (result.type === 'bullets') {
        expect(result.items).toEqual(['Item 1', 'Item 2']);
      }
    });

    it('should reject section with unknown type', () => {
      const invalid = { key: 'x', type: 'unknown', extra: true };
      expect(() => parseSection(invalid)).toThrow();
    });
  });

  describe('StoryboardSchema', () => {
    it('should accept valid storyboard', () => {
      const json = {
        version: 1,
        brand: { name: 'X', tone: 'x', palette: [], logoAlt: 'x' },
        persona: 'commuter',
        sections: [validHeroSection],
      };
      const result = StoryboardSchema.safeParse(json);
      expect(result.success).toBe(true);
    });

    it('should reject non-object', () => {
      expect(StoryboardSchema.safeParse(null).success).toBe(false);
      expect(StoryboardSchema.safeParse('string').success).toBe(false);
    });
  });

  describe('SectionSchema', () => {
    it('should accept all section types', () => {
      const sections = [
        validHeroSection,
        validBulletsSection,
        { key: 'steps', type: 'steps', items: ['Step 1'] },
        { key: 'quotes', type: 'quotes', quotes: [{ text: 'Quote', role: 'Person' }] },
        {
          key: 'tiers',
          type: 'tiers',
          tiers: [{ name: 'Pro', price: '$10', features: ['F1'], cta: 'Buy' }],
        },
        { key: 'qna', type: 'qna', qna: [['Q?', 'A.']] },
      ];
      for (const section of sections) {
        const result = SectionSchema.safeParse(section);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('generateVariantHash', () => {
    it('should return a 64-char hex string for SHA-256', async () => {
      const hash = await generateVariantHash(validHeroSection);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic for same section', async () => {
      const a = await generateVariantHash(validHeroSection);
      const b = await generateVariantHash(validHeroSection);
      expect(a).toBe(b);
    });

    it('should differ for different sections', async () => {
      const other: BulletsSection = { key: 'bullets', type: 'bullets', items: ['Other'] };
      const h1 = await generateVariantHash(validHeroSection);
      const h2 = await generateVariantHash(other);
      expect(h1).not.toBe(h2);
    });
  });
});
