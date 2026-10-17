import type { Href } from 'expo-router';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { Button, Screen, Text } from '@/ui';
import { XIcon } from '@/ui/icons';

import { closeAuth } from '../lib/navigation';
import { GoogleSignIn } from './GoogleSignIn';

export interface AuthLayoutProps {
  overline: string;
  title: string;
  subtitle: string;
  switchPrompt: string;
  switchCta: string;
  switchHref: Href;
  children: ReactNode;
}

export function AuthLayout({
  overline,
  title,
  subtitle,
  switchPrompt,
  switchCta,
  switchHref,
  children,
}: AuthLayoutProps) {
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll contentClassName="gap-8">
        <Pressable
          role="button"
          aria-label="Fermer"
          onPress={closeAuth}
          hitSlop={8}
          className="-mr-2 size-11 items-center justify-center self-end active:opacity-60"
        >
          <XIcon size={24} color={colors.ink.DEFAULT} />
        </Pressable>

        <View className="gap-3">
          <Text variant="overline">{overline}</Text>
          <Text variant="title" role="heading">
            {title}
          </Text>
          <Text tone="muted">{subtitle}</Text>
        </View>

        {children}

        <GoogleSignIn />

        <View className="mt-auto flex-row flex-wrap items-center justify-center">
          <Text tone="muted">{switchPrompt}</Text>
          <Button
            label={switchCta}
            variant="ghost"
            size="sm"
            // Tight padding keeps prompt and link on one line on small phones.
            className="px-2"
            onPress={() => router.replace(switchHref)}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
