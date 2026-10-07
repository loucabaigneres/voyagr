import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

import { radii, typeScale } from '@/theme/tokens';

const twMerge = extendTailwindMerge({
  extend: {
    theme: { borderRadius: Object.keys(radii) },
    classGroups: { 'font-size': [{ text: Object.keys(typeScale) }] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
