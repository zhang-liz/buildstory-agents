import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateBanditState, chooseVariant, initializeBanditArm, BanditState } from '../server/bandit';
import { metrics } from '../server/metrics';

describe('Bandit', () => {
  beforeEach(() => {
    metrics.reset();
  });

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
      const mockRandom = vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
      
      const arms = [
        { arm: { storyId: 's1', section: 'hero', variant: 'v1' }, alpha: 1, beta: 1 },
        { arm: { storyId: 's1', section: 'hero', variant: 'v2' }, alpha: 2, beta: 2 },
      ];

      const selected = await chooseVariant(arms);
      
      // With our mock, the sample values will be deterministic
      // sampleBeta(1,1) = 0.5 / (0.5 + 0.5) = 0.5
      // sampleBeta(2,2) = 0.25 / (0.25 + 0.25) = 0.5
      // First one will be selected due to array order
      expect(selected).toEqual(arms[0].arm);
      
      mockRandom.mockRestore();
    });

    it('should prefer arms with higher conversion rates', async () => {
      // Mock Math.random to control the sampleBeta results
      const mockRandom = vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.9) // High sample for first arm
        .mockImplementationOnce(() => 0.1); // Low sample for second arm
      
      const arms = [
        { arm: { storyId: 's1', section: 'hero', variant: 'v1' }, alpha: 10, beta: 1 }, // High conversion rate
        { arm: { storyId: 's1', section: 'hero', variant: 'v2' }, alpha: 1, beta: 10 }, // Low conversion rate
      ];

      const selected = await chooseVariant(arms);
      
      // Should select the first arm because it has higher sample value
      expect(selected).toEqual(arms[0].arm);
      
      mockRandom.mockRestore();
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
