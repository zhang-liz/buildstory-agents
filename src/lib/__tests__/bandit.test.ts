import { describe, it, expect, vi } from 'vitest';
import { updateBanditState, chooseVariant, initializeBanditArm, sampleBeta, BanditState } from '../server/bandit';

describe('Bandit', () => {

  describe('updateBanditState', () => {
    it('should update bandit state with success (reward = 1)', () => {
      const initialState: BanditState = {
        storyId: 'test-story',
        sectionKey: 'hero',
        variantHash: 'variant-1',
        alpha: 1,
        beta: 1,
      };

      const updated = updateBanditState(initialState, 1);
      
      expect(updated).toEqual({
        storyId: 'test-story',
        sectionKey: 'hero',
        variantHash: 'variant-1',
        alpha: 2,  // alpha should increase by 1
        beta: 1,   // beta stays the same for success
      });
    });

    it('should update bandit state with failure (reward = 0)', () => {
      const initialState: BanditState = {
        storyId: 'test-story',
        sectionKey: 'hero',
        variantHash: 'variant-1',
        alpha: 3,
        beta: 2,
      };

      const updated = updateBanditState(initialState, 0);
      
      expect(updated).toEqual({
        storyId: 'test-story',
        sectionKey: 'hero',
        variantHash: 'variant-1',
        alpha: 3,  // alpha stays the same for failure
        beta: 3,   // beta should increase by 1
      });
    });
  });

  describe('chooseVariant', () => {
    it('should choose the arm with highest sample value', async () => {
      // sampleBeta uses Gamma(alpha)+Gamma(beta); with all U=0.5, -ln(0.5)≈0.693, so both arms get 0.5
      const mockRandom = vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const arms = [
        { arm: { storyId: 's1', section: 'hero', variant: 'v1' }, alpha: 1, beta: 1 },
        { arm: { storyId: 's1', section: 'hero', variant: 'v2' }, alpha: 2, beta: 2 },
      ];

      const selected = await chooseVariant(arms);

      expect(selected).toEqual(arms[0].arm);

      mockRandom.mockRestore();
    });

    it('should prefer arms with higher conversion rates', async () => {
      // Beta(alpha,beta) sampler: X~Gamma(alpha), Y~Gamma(beta), return X/(X+Y).
      // Arm1 (10,1): want high sample -> high X, low Y. Arm2 (1,10): want low sample -> low X, high Y.
      // Small U => -ln(U) large. So: 10 small values for arm1's Gamma(10), 1 large for Gamma(1); then 1 large for arm2's Gamma(1), 10 small for Gamma(10).
      const small = 0.01; // -ln(0.01) ~ 4.6
      const large = 0.99; // -ln(0.99) ~ 0.01
      const mockRandom = vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => small) // 10x for Gamma(10) arm1
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => large) // 1x for Gamma(1) arm1 -> arm1 sample high
        .mockImplementationOnce(() => large) // 1x for Gamma(1) arm2
        .mockImplementationOnce(() => small) // 10x for Gamma(10) arm2
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small)
        .mockImplementationOnce(() => small);

      const arms = [
        { arm: { storyId: 's1', section: 'hero', variant: 'v1' }, alpha: 10, beta: 1 },
        { arm: { storyId: 's1', section: 'hero', variant: 'v2' }, alpha: 1, beta: 10 },
      ];

      const selected = await chooseVariant(arms);

      expect(selected).toEqual(arms[0].arm);

      mockRandom.mockRestore();
    });

    it('sampleBeta returns value in (0, 1)', () => {
      for (let i = 0; i < 50; i++) {
        const s = sampleBeta(2, 2);
        expect(s).toBeGreaterThan(0);
        expect(s).toBeLessThan(1);
      }
    });
  });

  describe('initializeBanditArm', () => {
    it('should create a new bandit arm with default priors', () => {
      const arm = initializeBanditArm('test-story', 'hero', 'variant-1');
      
      expect(arm).toEqual({
        storyId: 'test-story',
        sectionKey: 'hero',
        variantHash: 'variant-1',
        alpha: 1,
        beta: 1,
      });
    });
  });
});
