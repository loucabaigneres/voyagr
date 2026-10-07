import { View } from 'react-native';

import { cn } from './cn';

export interface ProgressBarProps {
  value: number;
  segments?: number;
  className?: string;
}

export function ProgressBar({ value, segments, className }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 1);

  if (segments) {
    const filled = Math.round(clamped * segments);
    return (
      <View className={cn('flex-row gap-1', className)}>
        {Array.from({ length: segments }, (_, index) => (
          <View
            key={index}
            className={cn('h-1 flex-1 rounded-full', index < filled ? 'bg-brand' : 'bg-surface')}
          />
        ))}
      </View>
    );
  }

  return (
    <View className={cn('h-1 overflow-hidden rounded-full bg-surface', className)}>
      <View className="h-full rounded-full bg-brand" style={{ width: `${clamped * 100}%` }} />
    </View>
  );
}
