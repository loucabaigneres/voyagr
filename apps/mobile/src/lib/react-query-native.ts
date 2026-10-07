import { focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

/**
 * Teaches React Query what "focus" means on mobile: the app coming back to the
 * foreground. Queries that set `refetchOnWindowFocus: true` then refresh on resume.
 * Call once at startup.
 */
export function setupReactQueryForNative() {
  if (Platform.OS === 'web') return;

  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => {
      setFocused(state === 'active');
    });
    return () => subscription.remove();
  });
}
