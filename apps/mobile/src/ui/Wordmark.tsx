import { Text } from 'react-native';

import { cn } from './cn';

export function Wordmark({
  inverse = false,
  className,
}: {
  inverse?: boolean;
  className?: string;
}) {
  return (
    <Text
      role="heading"
      aria-label="Seego"
      className={cn(
        'font-display text-section',
        inverse ? 'text-ink-inverse' : 'text-brand',
        className,
      )}
    >
      See<Text className="font-display-italic">go</Text>
      <Text className="text-primary">.</Text>
    </Text>
  );
}
