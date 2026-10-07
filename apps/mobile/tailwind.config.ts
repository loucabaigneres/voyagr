import type { Config } from 'tailwindcss';
import nativewindPreset from 'nativewind/preset';

import { colors, fonts, radii, typeScale } from './src/theme/tokens';

const px = (value: number) => `${value}px`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [nativewindPreset],
  // The app is light-only (app.json `userInterfaceStyle`); `media` would crash when Expo forces the scheme.
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      borderRadius: Object.fromEntries(
        Object.entries(radii).map(([key, value]) => [key, px(value)]),
      ),
      fontFamily: Object.fromEntries(Object.entries(fonts).map(([key, value]) => [key, [value]])),
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([key, [size, lineHeight]]) => [
          key,
          [px(size), { lineHeight: px(lineHeight) }],
        ]),
      ),
    },
  },
  plugins: [],
} satisfies Config;
