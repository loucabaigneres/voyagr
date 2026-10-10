import { Text } from 'react-native';

import { cn } from './cn';

/** "Seego" in the display serif, with the corallo point — the setting sun of the charte. */
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
      Seeg<Text className="font-display-italic">o</Text>
      <Text className="text-primary">.</Text>
    </Text>
  );
}
