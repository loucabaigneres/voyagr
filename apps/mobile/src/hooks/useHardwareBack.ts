import { useIsFocused } from 'expo-router';
import { useEffect, useEffectEvent } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Intercepts Android's back button while the screen is focused.
 * The handler returns `true` when it handled the press, `false` to let navigation go back.
 */
export function useHardwareBack(handler: () => boolean) {
  const isFocused = useIsFocused();
  const onBackPress = useEffectEvent(handler);

  useEffect(() => {
    if (!isFocused || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => onBackPress());
    return () => subscription.remove();
  }, [isFocused]);
}
