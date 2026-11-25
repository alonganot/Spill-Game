import { describe, expect, it } from 'vitest';
import { flowReducer, INITIAL_STACK } from './screenFlow';

describe('flowReducer', () => {
  it('starts on the main menu', () => {
    expect(INITIAL_STACK).toEqual(['menu']);
  });

  it('pushes screens on top', () => {
    const inRun = flowReducer(INITIAL_STACK, { type: 'push', screen: 'run' });
    expect(flowReducer(inRun, { type: 'push', screen: 'settings' })).toEqual(['menu', 'run', 'settings']);
  });

  it('ignores pushing the screen that is already on top', () => {
    const stack = ['menu', 'settings'] as const;
    expect(flowReducer(stack, { type: 'push', screen: 'settings' })).toBe(stack);
  });

  it('goes back one screen at a time', () => {
    const stack = flowReducer(['menu', 'run', 'settings'], { type: 'back' });
    expect(stack).toEqual(['menu', 'run']);
    expect(flowReducer(stack, { type: 'back' })).toEqual(['menu']);
  });

  it('does nothing on back from the root screen', () => {
    expect(flowReducer(INITIAL_STACK, { type: 'back' })).toBe(INITIAL_STACK);
  });

  it('resets to a given stack, or the menu when it is empty', () => {
    expect(flowReducer(['menu', 'run', 'settings'], { type: 'reset', stack: ['menu'] })).toEqual(['menu']);
    expect(flowReducer(['menu', 'settings'], { type: 'reset', stack: ['menu', 'run'] })).toEqual(['menu', 'run']);
    expect(flowReducer(['menu', 'run'], { type: 'reset', stack: [] })).toEqual(['menu']);
  });
});
