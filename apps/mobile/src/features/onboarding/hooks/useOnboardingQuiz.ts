import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useReducer } from 'react';

import { useHardwareBack } from '@/hooks/useHardwareBack';
import { useGuestId } from '@/lib/guest-id';
import { trpc } from '@/lib/trpc';

import {
  canContinue,
  currentQuestion,
  initialQuizState,
  isLastStep,
  QUIZ_QUESTIONS,
  quizProgress,
  quizReducer,
} from '../lib/quiz';

/** "Guide-moi": the 4-question quiz, then the trip it creates opens in the swipe deck. */
export function useOnboardingQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  const guestId = useGuestId();

  const submission = useMutation(
    trpc.onboarding.submit.mutationOptions({
      onSuccess: ({ tripId }) => {
        // Replace: going back from the deck should not reopen a submitted quiz.
        router.replace({ pathname: '/discovery', params: { tripId } });
      },
    }),
  );

  const isFirstStep = state.stepIndex === 0;

  const goBack = () => {
    if (isFirstStep) router.back();
    else dispatch({ type: 'back' });
  };

  // Android's back button walks the questions backwards instead of leaving the quiz.
  useHardwareBack(() => {
    if (isFirstStep || submission.isPending) return false;
    dispatch({ type: 'back' });
    return true;
  });

  const goForward = () => {
    if (!isLastStep(state)) {
      dispatch({ type: 'next' });
      return;
    }
    submission.mutate({ ...state.answers, guestId });
  };

  const question = currentQuestion(state);

  return {
    question,
    selected: state.answers[question] as string[],
    toggle: (option: string) => dispatch({ type: 'toggle', question, option }),
    step: {
      current: state.stepIndex + 1,
      total: QUIZ_QUESTIONS.length,
      progress: quizProgress(state),
    },
    canContinue: canContinue(state),
    isLastStep: isLastStep(state),
    goBack,
    goForward,
    isSubmitting: submission.isPending,
    hasFailed: submission.isError,
  };
}
