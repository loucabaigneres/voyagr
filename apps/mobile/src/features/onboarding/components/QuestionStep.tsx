import { View } from 'react-native';

import { Em, Reveal, Text } from '@/ui';

import { ONBOARDING_COPY, QUESTIONS } from '../constants';
import type { QuizQuestion } from '../lib/quiz';
import { OptionTile } from './OptionTile';

export interface QuestionStepProps {
  question: QuizQuestion;
  selected: string[];
  onToggle: (option: string) => void;
}

export function QuestionStep({ question, selected, onToggle }: QuestionStepProps) {
  const { title, subtitle, options } = QUESTIONS[question];
  const [before, emphasis, after] = title;

  return (
    <View className="gap-6">
      <Reveal order={0} className="gap-2">
        <Text variant="title" role="heading">
          {before}
          <Em>{emphasis}</Em>
          {after}
        </Text>
        <Text tone="muted">{subtitle}</Text>
        <Text variant="overline" className="mt-2">
          {ONBOARDING_COPY.hint}
        </Text>
      </Reveal>

      <View className="gap-3">
        {options.map((option, index) => (
          <Reveal key={option.value} order={index + 1}>
            <OptionTile
              icon={option.icon}
              title={option.title}
              description={option.description}
              selected={selected.includes(option.value)}
              onPress={() => onToggle(option.value)}
            />
          </Reveal>
        ))}
      </View>
    </View>
  );
}
