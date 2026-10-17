import { useRef } from 'react';
import { View, type TextInput } from 'react-native';

import { authClient } from '@/lib/auth-client';
import { Button, Notice, TextField } from '@/ui';

import { useAuthForm } from '../hooks/useAuthForm';
import { signUpSchema } from '../lib/validation';
import { closeAuth } from '../lib/navigation';

export function SignUpForm() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const form = useAuthForm({
    schema: signUpSchema,
    initialValues: { name: '', email: '', password: '' },
    // Better Auth signs the new user in straight away.
    request: (account) => authClient.signUp.email(account),
    onSuccess: closeAuth,
  });

  return (
    <View className="gap-5">
      <TextField
        label="Prénom"
        placeholder="Léa"
        value={form.values.name}
        onChangeText={(value) => form.setField('name', value)}
        error={form.fieldErrors.name}
        editable={!form.isSubmitting}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        placeholder="lea@exemple.fr"
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
        label="Mot de passe"
        placeholder="8 caractères minimum"
        value={form.values.password}
        onChangeText={(value) => form.setField('password', value)}
        error={form.fieldErrors.password}
        editable={!form.isSubmitting}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={form.submit}
      />

      {form.formError && <Notice message={form.formError} />}

      <Button
        label="Créer mon compte"
        loading={form.isSubmitting}
        onPress={form.submit}
        className="mt-1"
      />
    </View>
  );
}
