import type { RouterInputs } from '@/lib/trpc';

/** The quiz answers, exactly as `onboarding.submit` expects them (minus the guest id). */
export type QuizAnswers = Omit<RouterInputs['onboarding']['submit'], 'guestId'>;
export type QuizQuestion = keyof QuizAnswers;
export type QuizOption<Q extends QuizQuestion> = QuizAnswers[Q][number];

/** Question order. Every question is multiple choice and needs at least one answer. */
export const QUIZ_QUESTIONS = [
  'landscapes',
  'vibes',
  'travelWith',
  'climates',
] as const satisfies readonly QuizQuestion[];

export interface QuizState {
  stepIndex: number;
  answers: QuizAnswers;
}

export type QuizAction =
  | { type: 'toggle'; question: QuizQuestion; option: string }
  | { type: 'next' }
  | { type: 'back' };

export const initialQuizState: QuizState = {
  stepIndex: 0,
  answers: { landscapes: [], vibes: [], travelWith: [], climates: [] },
};

const LAST_STEP_INDEX = QUIZ_QUESTIONS.length - 1;

export function currentQuestion(state: QuizState): QuizQuestion {
  return QUIZ_QUESTIONS[state.stepIndex];
}

export function canContinue(state: QuizState): boolean {
  return state.answers[currentQuestion(state)].length > 0;
}

export function isLastStep(state: QuizState): boolean {
  return state.stepIndex === LAST_STEP_INDEX;
}

/** Share of the quiz reached, counting the current step (1/4 on the first one). */
export function quizProgress(state: QuizState): number {
  return (state.stepIndex + 1) / QUIZ_QUESTIONS.length;
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'toggle':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.question]: toggle(state.answers[action.question] as string[], action.option),
        },
      };
    case 'next':
      if (!canContinue(state) || isLastStep(state)) return state;
      return { ...state, stepIndex: state.stepIndex + 1 };
    case 'back':
      if (state.stepIndex === 0) return state;
      return { ...state, stepIndex: state.stepIndex - 1 };
  }
}
