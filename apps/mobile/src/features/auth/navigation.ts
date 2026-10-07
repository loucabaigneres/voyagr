import { router } from 'expo-router';

export function closeAuth() {
  if (router.canGoBack()) router.back();
  else router.replace('/profile');
}
