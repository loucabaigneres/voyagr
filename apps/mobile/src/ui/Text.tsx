import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from './cn';

const VARIANTS = {
  display: 'font-display text-display',
  title: 'font-display text-title',
  section: 'font-display text-section',
  label: 'font-sans-semibold text-label',
  body: 'font-sans text-body',
  caption: 'font-sans text-caption',
  overline: 'font-sans-semibold text-overline uppercase tracking-[1.9px]',
} as const;

type Variant = keyof typeof VARIANTS;

const TONES = {
  default: 'text-ink',
  secondary: 'text-ink-secondary',
  muted: 'text-ink-muted',
  brand: 'text-brand',
  primary: 'text-primary-text',
  accent: 'text-accent',
  success: 'text-success',
  inverse: 'text-ink-inverse',
} as const;

export type TextTone = keyof typeof TONES;

const DEFAULT_TONE: Record<Variant, TextTone> = {
  display: 'default',
  title: 'default',
  section: 'default',
  label: 'default',
  body: 'default',
  caption: 'muted',
  overline: 'muted',
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: TextTone;
  className?: string;
}

export function Text({ variant = 'body', tone, className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(VARIANTS[variant], TONES[tone ?? DEFAULT_TONE[variant]], className)}
      {...props}
    />
  );
}
