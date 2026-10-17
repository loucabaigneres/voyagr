import { Pressable, View } from 'react-native';

import { cn } from './cn';
import { Text } from './Text';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Switches between sibling views of one screen (tabs, not navigation). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View role="tablist" className={cn('flex-row rounded-full bg-surface p-1', className)}>
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            role="tab"
            aria-selected={selected}
            onPress={() => onChange(segment.value)}
            className={cn(
              'min-h-11 flex-1 items-center justify-center rounded-full px-4 active:opacity-80',
              selected && 'bg-brand',
            )}
          >
            <Text
              className={cn(
                'font-sans-semibold text-control',
                selected ? 'text-ink-inverse' : 'text-ink-secondary',
              )}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
