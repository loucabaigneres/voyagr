import type { Href } from 'expo-router';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { Button, Screen, Text } from '@/ui';
import { XIcon } from '@/ui/icons';

import { AUTH_COPY } from '../constants';
import { closeAuth } from '../navigation';
import { GoogleSignIn } from './GoogleSignIn';

type AuthCopy = (typeof AUTH_COPY)[keyof Pick<typeof AUTH_COPY, 'signIn' | 'signUp'>];

export interface AuthLayoutProps {
  copy: AuthCopy;
  switchHref: Href;
  children: ReactNode;
}

export function AuthLayout({ copy, switchHref, children }: AuthLayoutProps) {
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen scroll contentClassName="gap-8">
        <Pressable
          role="button"
          aria-label={AUTH_COPY.close}
          onPress={closeAuth}
          hitSlop={8}
          className="-mr-2 size-11 items-center justify-center self-end active:opacity-60"
        >
          <XIcon size={24} color={colors.ink.DEFAULT} />
        </Pressable>

        <View className="gap-3">
          <Text variant="overline">{copy.overline}</Text>
          <Text variant="title" role="heading">
            {copy.title}
          </Text>
          <Text tone="muted">{copy.subtitle}</Text>
        </View>

        {children}

        <GoogleSignIn />

        <View className="mt-auto flex-row flex-wrap items-center justify-center">
          <Text tone="muted">{copy.switchPrompt}</Text>
          <Button
            label={copy.switchCta}
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
