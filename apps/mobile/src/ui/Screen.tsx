import type { ReactElement, ReactNode } from 'react';
import { ScrollView, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from './cn';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentClassName?: string;
  /** Pull-to-refresh; only with `scroll`. */
  refreshControl?: ReactElement<RefreshControlProps>;
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  contentClassName,
  refreshControl,
}: ScreenProps) {
  const contentClasses = cn('px-6 py-6', contentClassName);

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      {scroll ? (
        <ScrollView
          contentContainerClassName={cn('grow', contentClasses)}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn('flex-1', contentClasses)}>{children}</View>
      )}
    </SafeAreaView>
  );
}
