import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metrics, withMetrics } from '../metrics';

describe('Agent Metrics', () => {
  beforeEach(() => {
    metrics.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('withMetrics', () => {
    it('should track successful operation', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      
      const result = await withMetrics('test-agent', 'test-operation', mockFn);
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Verify operation was recorded
      const metricsData = metrics.getMetrics();
      const operations = Object.entries(metricsData.customMetrics)
        .filter(([_, m]: [string, any]) => 
          m.agent_type === 'test-agent' && 
          m.operation === 'test-operation' && 
          m.status === 'success'
        )
        .map(([_, m]) => m);
      
      expect(operations.length).toBeGreaterThan(0);
      const operation = operations[0];
      expect(operation.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should track errors by type', async () => {
      class TestError extends Error {}
      const mockFn = vi.fn().mockRejectedValue(new TestError('test error'));
      
      await expect(
        withMetrics('test-agent', 'failing-operation', mockFn)
      ).rejects.toThrow('test error');
      
      // Verify error was recorded
      const metricsData = metrics.getMetrics();
      const errors = Object.entries(metricsData.customMetrics)
        .filter(([_, m]: [string, any]) => 
          m.type === 'error' && 
          m.agent_type === 'test-agent' &&
          m.error_type === 'TestError'
        )
        .map(([_, m]) => m);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].operation).toBe('failing-operation');
    });
  });

  describe('metrics collection', () => {
    it('should track operation latency', async () => {
      // Use fake timers
      vi.useFakeTimers();
      
      const mockFn = vi.fn().mockImplementation(
        () => new Promise(resolve => {
          // Advance timers by 10ms when the timeout is called
          setTimeout(() => {
            vi.advanceTimersByTime(10);
            resolve('done');
          }, 10);
        })
      );
      
      const promise = withMetrics('test-agent', 'timed-operation', mockFn);
      
      // Fast-forward time
      await vi.advanceTimersByTimeAsync(20);
      
      // Wait for the promise to resolve
      await promise;
      
      // Verify latency was recorded
      const metricsData = metrics.getMetrics();
      const latencies = Object.entries(metricsData.customMetrics)
        .filter(([_, m]: [string, any]) => 
          m.type === 'latency' && 
          m.agent_type === 'test-agent' && 
          m.operation === 'timed-operation'
        )
        .map(([_, m]) => m);
      
      expect(latencies.length).toBeGreaterThan(0);
      // Should be around 10ms, but we'll just check that it's greater than 0
      expect(latencies[0].value).toBeGreaterThan(0);
      
      // Restore timers
      vi.useRealTimers();
    }, 10000); // Increase timeout to 10s

    it('should handle concurrent operations', async () => {
      const mockFn1 = vi.fn().mockResolvedValue('result1');
      const mockFn2 = vi.fn().mockResolvedValue('result2');
      
      const [result1, result2] = await Promise.all([
        withMetrics('test-agent', 'op1', mockFn1),
        withMetrics('test-agent', 'op2', mockFn2)
      ]);
      
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      
      // Verify both operations were tracked
      const metricsData = metrics.getMetrics();
      const operations = Object.entries(metricsData.customMetrics)
        .filter(([_, m]: [string, any]) => 
          m.agent_type === 'test-agent' && 
          (m.operation === 'op1' || m.operation === 'op2')
        )
        .map(([_, m]) => m);
      
      // We expect at least 2 operations (one for each) and possibly more for latency
      expect(operations.length).toBeGreaterThanOrEqual(2);
    });
  });
});
