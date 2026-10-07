import { useState, type Ref } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/tokens';

import { cn } from './cn';
import { EyeIcon, EyeSlashIcon } from './icons';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string;
  className?: string;
  ref?: Ref<TextInput>;
}

export function TextField({
  label,
  error,
  className,
  editable = true,
  secureTextEntry = false,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const RevealIcon = isRevealed ? EyeSlashIcon : EyeIcon;

  return (
    <View className={cn('gap-2', className)}>
      {/* The input carries the label itself, so screen readers don't read it twice. */}
      <Text aria-hidden className="font-sans-medium text-caption text-ink-secondary">
        {label}
      </Text>
      <View
        className={cn(
          'min-h-14 flex-row items-center rounded-field border bg-surface-raised',
          error ? 'border-primary-text' : isFocused ? 'border-brand' : 'border-line-strong',
          !editable && 'opacity-50',
        )}
      >
        <TextInput
          aria-label={label}
          aria-invalid={!!error}
          aria-disabled={!editable}
          editable={editable}
          secureTextEntry={secureTextEntry && !isRevealed}
          placeholderTextColor={colors.ink.muted}
          cursorColor={colors.brand}
          selectionColor={colors.brand}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          className="min-h-14 flex-1 px-4 font-sans text-body text-ink"
          {...props}
        />
        {secureTextEntry && (
          <Pressable
            role="button"
            aria-label={isRevealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={isRevealed}
            disabled={!editable}
            onPress={() => setIsRevealed((current) => !current)}
            className="size-11 items-center justify-center mr-1 active:opacity-60"
          >
            <RevealIcon size={20} color={colors.ink.muted} />
          </Pressable>
        )}
      </View>
      {error && (
        <Text variant="caption" tone="primary">
          {error}
        </Text>
      )}
    </View>
  );
}
