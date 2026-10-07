import { router } from 'expo-router';

import { EmptyState, Screen } from '@/ui';
import { CompassIcon } from '@/ui/icons';

/**
 * Temporary placeholder for routes whose page has not been ported yet.
 * Delete it once every route has its real screen.
 */
export function ComingSoonScreen({
  title,
  canGoBack = false,
}: {
  title: string;
  canGoBack?: boolean;
}) {
  return (
    <Screen edges={canGoBack ? ['top', 'bottom'] : ['top']}>
      <EmptyState
        icon={CompassIcon}
        title={title}
        description="Cette page arrive bientôt sur mobile."
        action={canGoBack ? { label: 'Retour', onPress: () => router.back() } : undefined}
      />
    </Screen>
  );
}
