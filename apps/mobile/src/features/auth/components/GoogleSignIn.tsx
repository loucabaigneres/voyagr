import { View } from 'react-native';

import { Button, Notice, Text } from '@/ui';
import { GoogleLogo } from '@/ui/GoogleLogo';

import { AUTH_COPY } from '../constants';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

export function GoogleSignIn() {
  const google = useGoogleSignIn();

  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-3" aria-hidden>
        <View className="h-px flex-1 bg-line" />
        <Text variant="caption">{AUTH_COPY.google.separator}</Text>
        <View className="h-px flex-1 bg-line" />
      </View>

      <Button
        label={AUTH_COPY.google.cta}
        variant="outline"
        leading={<GoogleLogo />}
        loading={google.isPending}
        onPress={google.signIn}
      />

      {google.error && <Notice message={google.error} />}
    </View>
  );
}
