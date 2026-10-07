import { Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { ProgressBar, Text } from '@/ui';
import { ArrowLeftIcon } from '@/ui/icons';

import { ONBOARDING_COPY } from '../constants';

export interface QuizHeaderProps {
  current: number;
  total: number;
  progress: number;
  onBack: () => void;
}

export function QuizHeader({ current, total, progress, onBack }: QuizHeaderProps) {
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Pressable
          role="button"
          aria-label={ONBOARDING_COPY.back}
          onPress={onBack}
          hitSlop={8}
          className="-ml-2 size-11 items-center justify-center rounded-full active:bg-surface"
        >
          <ArrowLeftIcon size={24} color={colors.ink.DEFAULT} />
        </Pressable>
        <Text variant="overline">{ONBOARDING_COPY.step(current, total)}</Text>
      </View>
      <ProgressBar value={progress} segments={total} />
    </View>
  );
}
