import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (utils)', () => {
  it('should merge single class', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('should merge multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should filter falsy values', () => {
    expect(cn('foo', false, 'bar', null, undefined, 0, 'baz')).toBe('foo bar baz');
  });

  it('should merge tailwind classes with later override', () => {
    // tailwind-merge: later class overrides conflicting earlier
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('should handle array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });
});
