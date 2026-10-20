import { describe, expect, it } from 'bun:test';
import { tabletNavigation, worklistLayout } from '../adaptive-layout';

describe('Adaptive workspaces', () => {
  it('uses one readable column in phone and iPad multitasking windows', () => {
    for (const width of [320, 390, 507, 694, 834, 899]) {
      expect(worklistLayout(width).split).toBe(false);
      expect(worklistLayout(width).listWidth).toBe(width);
    }
  });
  it('fits both panes into wide work areas without shrinking the detail to phone width', () => {
    for (let width = 900; width <= 1800; width += 17) {
      const layout = worklistLayout(width);
      expect(layout.split).toBe(true);
      expect(layout.listWidth).toBeGreaterThanOrEqual(360);
      expect(layout.listWidth).toBeLessThanOrEqual(420);
      expect(width - layout.listWidth).toBeGreaterThanOrEqual(540);
    }
  });
  it('prioritizes accessibility text sizes over adding a second column', () => {
    expect(worklistLayout(1194, 1.6).split).toBe(false);
    expect(tabletNavigation(1194, 1.6)).toBe(false);
    expect(worklistLayout(1194, 1.5).split).toBe(true);
  });
  it('adapts navigation to the actual window instead of the device model', () => {
    expect(tabletNavigation(767, 1)).toBe(false);
    expect(tabletNavigation(768, 1)).toBe(true);
    expect(tabletNavigation(507, 1)).toBe(false);
  });
  it('does not create an expanded pane from an unknown layout measurement', () => {
    for (const width of [0, NaN, Infinity]) expect(worklistLayout(width).split).toBe(false);
  });
});
