import { describe, expect, it } from 'bun:test';
import { defaultPreferences, parsePreferences, type Preferences } from '../preferences';
import { darkColors, lightColors } from '../../ui/palettes';

describe('Saved device preferences', () => {
  it('opens existing installations with system appearance and the existing start screen', () => {
    expect(parsePreferences(null)).toEqual({
      theme: 'system',
      startScreen: 'projects',
      haptics: true,
    });
  });
  it('recovers corrupt, primitive and outdated values without broadening saved choices', () => {
    for (const raw of [
      '{',
      'null',
      '42',
      '"dark"',
      '{"theme":"sepia","startScreen":"search","haptics":"false"}',
    ]) {
      expect(parsePreferences(raw)).toEqual(defaultPreferences);
    }
  });
  it('retains explicit false and valid settings across a serialization roundtrip', () => {
    const saved: Preferences = { theme: 'dark', startScreen: 'my-work', haptics: false };
    expect(parsePreferences(JSON.stringify(saved))).toEqual(saved);
  });
  it('restores valid fields independently when another field becomes unsupported', () => {
    expect(parsePreferences('{"theme":"dark","startScreen":"removed","haptics":false}')).toEqual({
      theme: 'dark',
      startScreen: 'projects',
      haptics: false,
    });
  });
});

function luminance(hex: string) {
  const values = hex.match(/[a-f\d]{2}/gi)!.map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
describe('Native theme readability', () => {
  for (const [name, palette] of Object.entries({ light: lightColors, dark: darkColors })) {
    it(`${name} keeps normal text and selected controls readable`, () => {
      for (const background of [palette.canvas, palette.surface, palette.accentSoft]) {
        expect(contrast(palette.ink, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.muted, background)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(palette.onAccent, palette.accent)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
