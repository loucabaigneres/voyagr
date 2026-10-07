import { useRef } from 'react';
import { View, type TextInput } from 'react-native';

import { authClient } from '@/lib/auth-client';
import { Button, Notice, TextField } from '@/ui';

import { AUTH_COPY } from '../constants';
import { useAuthForm } from '../hooks/useAuthForm';
import { signInSchema } from '../lib/validation';
import { closeAuth } from '../navigation';

export function SignInForm() {
  const passwordRef = useRef<TextInput>(null);
  const form = useAuthForm({
    schema: signInSchema,
    initialValues: { email: '', password: '' },
    request: (credentials) => authClient.signIn.email(credentials),
    onSuccess: closeAuth,
  });
  const { fields } = AUTH_COPY;

  return (
    <View className="gap-5">
      <TextField
        label={fields.email.label}
        placeholder={fields.email.placeholder}
        value={form.values.email}
        onChangeText={(value) => form.setField('email', value)}
        error={form.fieldErrors.email}
        editable={!form.isSubmitting}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label={fields.password.label}
        value={form.values.password}
        onChangeText={(value) => form.setField('password', value)}
        error={form.fieldErrors.password}
        editable={!form.isSubmitting}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={form.submit}
      />

      {form.formError && <Notice message={form.formError} />}

      <Button
        label={AUTH_COPY.signIn.submit}
        loading={form.isSubmitting}
        onPress={form.submit}
        className="mt-1"
      />
    </View>
  );
}
