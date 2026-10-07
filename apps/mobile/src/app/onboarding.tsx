import { ScrollView, View } from 'react-native';

import { AnalyzingView } from '@/features/onboarding/components/AnalyzingView';
import { QuestionStep } from '@/features/onboarding/components/QuestionStep';
import { QuizHeader } from '@/features/onboarding/components/QuizHeader';
import { ONBOARDING_COPY } from '@/features/onboarding/constants';
import { useOnboardingQuiz } from '@/features/onboarding/hooks/useOnboardingQuiz';
import { Button, Notice, Screen } from '@/ui';

export default function OnboardingScreen() {
  const quiz = useOnboardingQuiz();

  if (quiz.isSubmitting) {
    return (
      <Screen>
        <AnalyzingView />
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-6 px-0 pb-2">
      <View className="px-6">
        <QuizHeader
          current={quiz.step.current}
          total={quiz.step.total}
          progress={quiz.step.progress}
          onBack={quiz.goBack}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* `key` restarts the entrance animation on each question. */}
        <QuestionStep
          key={quiz.question}
          question={quiz.question}
          selected={quiz.selected}
          onToggle={quiz.toggle}
        />
      </ScrollView>

      <View className="gap-3 px-6">
        {quiz.hasFailed && <Notice message={ONBOARDING_COPY.error} />}
        <Button
          label={quiz.isLastStep ? ONBOARDING_COPY.submit : ONBOARDING_COPY.continue}
          disabled={!quiz.canContinue}
          onPress={quiz.goForward}
        />
      </View>
    </Screen>
  );
}
