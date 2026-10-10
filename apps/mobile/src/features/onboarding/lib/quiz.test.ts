import {
  canContinue,
  currentQuestion,
  initialQuizState,
  isLastStep,
  quizProgress,
  quizReducer,
  type QuizAction,
  type QuizState,
} from './quiz';

describe('quizReducer', () => {
  it('toggles an option on and off for the given question', () => {
    const selected = quizReducer(initialQuizState, {
      type: 'toggle',
      question: 'landscapes',
      option: 'coast',
    });
    expect(selected.answers.landscapes).toEqual(['coast']);

    const unselected = quizReducer(selected, {
      type: 'toggle',
      question: 'landscapes',
      option: 'coast',
    });
    expect(unselected.answers.landscapes).toEqual([]);
  });

  it('keeps several answers to the same question', () => {
    const actions: QuizAction[] = [
      { type: 'toggle', question: 'vibes', option: 'food' },
      { type: 'toggle', question: 'vibes', option: 'culture' },
    ];
    const state = actions.reduce(quizReducer, initialQuizState);
    expect(state.answers.vibes).toEqual(['food', 'culture']);
  });

  it('refuses to move on while the current question has no answer', () => {
    expect(quizReducer(initialQuizState, { type: 'next' })).toBe(initialQuizState);
  });

  it('moves forward once answered, and back without losing answers', () => {
    const answered = quizReducer(initialQuizState, {
      type: 'toggle',
      question: 'landscapes',
      option: 'city',
    });
    const next = quizReducer(answered, { type: 'next' });
    expect(currentQuestion(next)).toBe('vibes');

    const back = quizReducer(next, { type: 'back' });
    expect(currentQuestion(back)).toBe('landscapes');
    expect(back.answers.landscapes).toEqual(['city']);
  });

  it('does not go before the first step or past the last one', () => {
    expect(quizReducer(initialQuizState, { type: 'back' })).toBe(initialQuizState);

    const last: QuizState = {
      stepIndex: 3,
      answers: { landscapes: ['city'], vibes: ['food'], travelWith: ['solo'], climates: ['warm'] },
    };
    expect(quizReducer(last, { type: 'next' })).toBe(last);
  });
});

describe('quiz selectors', () => {
  it('reports progress, including the current step', () => {
    expect(quizProgress(initialQuizState)).toBe(0.25);
    expect(quizProgress({ ...initialQuizState, stepIndex: 3 })).toBe(1);
  });

  it('knows when the quiz is on its last step', () => {
    expect(isLastStep(initialQuizState)).toBe(false);
    expect(isLastStep({ ...initialQuizState, stepIndex: 3 })).toBe(true);
  });

  it('allows continuing only with at least one answer', () => {
    expect(canContinue(initialQuizState)).toBe(false);
    expect(
      canContinue({
        ...initialQuizState,
        answers: { ...initialQuizState.answers, landscapes: ['coast'] },
      }),
    ).toBe(true);
  });
});
