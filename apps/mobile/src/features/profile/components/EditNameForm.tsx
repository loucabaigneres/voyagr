import { View } from 'react-native';

import { Button, Notice, Text, TextField } from '@/ui';

import { PROFILE_COPY } from '../constants';
import { useEditName } from '../hooks/useEditName';

export function EditNameForm({ currentName }: { currentName: string | undefined }) {
  const form = useEditName(currentName);
  const copy = PROFILE_COPY.editName;

  return (
    <View className="gap-4">
      <Text variant="section">{copy.title}</Text>
      <TextField
        label={copy.label}
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
      {form.saved && <Notice tone="success" message={copy.saved} />}
      <Button
        label={copy.save}
        loading={form.isSaving}
        disabled={!form.canSave}
        onPress={form.save}
      />
    </View>
  );
}
