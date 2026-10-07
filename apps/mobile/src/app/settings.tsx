import { Redirect, router } from 'expo-router';

import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { EditNameForm } from '@/features/profile/components/EditNameForm';
import { SettingsHeader } from '@/features/profile/components/SettingsHeader';
import { PROFILE_COPY } from '@/features/profile/constants';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { Button, LoadingState, Screen } from '@/ui';
import { SignOutIcon } from '@/ui/icons';

export default function SettingsScreen() {
  const { isSessionPending, isSignedIn, profile } = useProfile();
  const { signOut, isSigningOut } = useSignOut({
    onSignedOut: () => router.dismissTo('/profile'),
  });

  if (isSessionPending) return <LoadingState />;
  if (!isSignedIn) return <Redirect href="/profile" />;

  return (
    <Screen scroll contentClassName="gap-8">
      <SettingsHeader />
      <EditNameForm currentName={profile?.user?.name} />
      <Button
        label={PROFILE_COPY.signOut}
        variant="outline"
        icon={SignOutIcon}
        loading={isSigningOut}
        onPress={signOut}
        className="mt-auto"
      />
    </Screen>
  );
}
