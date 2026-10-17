import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/ui';

export function GuestInvite() {
  return (
    <View className="flex-1 justify-center gap-8">
      <View className="gap-3">
        <Text variant="overline">Ton profil</Text>
        <Text variant="title" role="heading">
          Garde tes voyages sous la main
        </Text>
        <Text tone="muted">
          Crée un compte pour enregistrer tes itinéraires et les retrouver sur tous tes appareils.
        </Text>
      </View>

      <View className="gap-3">
        <Button label="Se connecter" onPress={() => router.push('/auth/sign-in')} />
        <Button
          label="Créer un compte"
          variant="outline"
          onPress={() => router.push('/auth/sign-up')}
        />
      </View>
    </View>
  );
}
