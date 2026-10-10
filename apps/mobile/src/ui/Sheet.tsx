import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from './cn';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({ visible, onClose, title, children, className }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        role="button"
        aria-label="Fermer"
        onPress={onClose}
        className="absolute inset-0 bg-scrim"
      />
      <View className="flex-1 justify-end" pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          className={cn('max-h-[92%] rounded-t-sheet bg-background px-6 pt-3', className)}
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-surface" />
          {title && (
            <Text variant="section" className="mb-3">
              {title}
            </Text>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
