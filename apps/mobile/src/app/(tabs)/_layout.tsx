import { Tabs } from 'expo-router';

import { colors, fonts } from '@/theme/tokens';
import { HouseIcon, SuitcaseRollingIcon, UserIcon, type AppIcon } from '@/ui/icons';

const ACTIVE_COLOR = colors.brand;
const INACTIVE_COLOR = colors.ink.muted;

/** Regular at rest, Fill when active — as the charte prescribes. */
function tabIcon(Icon: AppIcon) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return (
      <Icon
        size={24}
        color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
        weight={focused ? 'fill' : 'regular'}
      />
    );
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.line.DEFAULT },
        tabBarLabelStyle: { fontFamily: fonts['sans-medium'] },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Découvrir', tabBarIcon: tabIcon(HouseIcon) }} />
      <Tabs.Screen
        name="trips"
        options={{ title: 'Voyages', tabBarIcon: tabIcon(SuitcaseRollingIcon) }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon(UserIcon) }} />
    </Tabs>
  );
}
