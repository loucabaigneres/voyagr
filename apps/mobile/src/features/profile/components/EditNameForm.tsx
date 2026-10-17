import { View } from 'react-native';

import { Button, Notice, Text, TextField } from '@/ui';

import { useEditName } from '../hooks/useEditName';

export function EditNameForm({ currentName }: { currentName: string | undefined }) {
  const form = useEditName(currentName);

  return (
    <View className="gap-4">
      <Text variant="section">Ton prénom</Text>
      <TextField
        label="Prénom affiché"
        value={form.value}
        onChangeText={form.setValue}
        error={form.error ?? undefined}
        editable={!form.isSaving}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="done"
        onSubmitEditing={form.save}
      />
      {form.saved && <Notice tone="success" message="C’est noté, ton prénom est à jour." />}
      <Button
        label="Enregistrer"
        loading={form.isSaving}
        disabled={!form.canSave}
        onPress={form.save}
      />
    </View>
  );
}
